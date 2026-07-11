import { Task, Label, SmartLabel } from '../types';

const DB_NAME = 'TodoKanbanDB';
const DB_VERSION = 1;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      // Tasks store
      if (!db.objectStoreNames.contains('tasks')) {
        db.createObjectStore('tasks', { keyPath: 'id' });
      }

      // Custom Labels store
      if (!db.objectStoreNames.contains('labels')) {
        db.createObjectStore('labels', { keyPath: 'id' });
      }

      // Smart Labels store
      if (!db.objectStoreNames.contains('smartLabels')) {
        db.createObjectStore('smartLabels', { keyPath: 'id' });
      }
    };
  });
}

// Default Seed Data
export const DEFAULT_LABELS: Label[] = [
  { id: 'lbl-work', name: '工作 (Work)', color: 'blue' },
  { id: 'lbl-personal', name: '个人 (Personal)', color: 'emerald' },
  { id: 'lbl-shopping', name: '购物 (Shopping)', color: 'amber' },
  { id: 'lbl-urgent', name: '紧急 (Urgent)', color: 'red' },
];

export const DEFAULT_SMART_LABELS: SmartLabel[] = [
  {
    id: 'smart-today',
    name: '今日待办',
    color: 'sky',
    rules: [
      { id: 'rule-today-1', field: 'dueDate', operator: 'equals', value: 'today' },
      { id: 'rule-today-2', field: 'status', operator: 'isNotEmpty', value: '' } // any status
    ],
    isSystem: true
  },
  {
    id: 'smart-overdue',
    name: '已逾期',
    color: 'rose',
    rules: [
      { id: 'rule-overdue-1', field: 'dueDate', operator: 'isBefore', value: 'today' },
      { id: 'rule-overdue-2', field: 'status', operator: 'contains', value: 'todo,in-progress' }
    ],
    isSystem: true
  },
  {
    id: 'smart-high-priority',
    name: '高优先级',
    color: 'orange',
    rules: [
      { id: 'rule-high-1', field: 'priority', operator: 'equals', value: 'high' },
      { id: 'rule-high-2', field: 'status', operator: 'contains', value: 'todo,in-progress' }
    ],
    isSystem: true
  },
  {
    id: 'smart-unassigned',
    name: '无标签任务',
    color: 'gray',
    rules: [
      { id: 'rule-unassigned-1', field: 'label', operator: 'isEmpty', value: '' }
    ],
    isSystem: true
  }
];

export const DEFAULT_TASKS: Task[] = [
  {
    id: 'task-1',
    title: '设计任务看板系统',
    description: '使用 React + Zustand + IndexedDB 构建高性能且支持拖拽排序的看板，支持标签和智能标签。',
    status: 'in-progress',
    priority: 'high',
    labels: ['lbl-work'],
    dueDate: new Date().toISOString().split('T')[0],
    createdAt: Date.now() - 3600000 * 4,
    order: 0,
    linkedTaskIds: ['task-2']
  },
  {
    id: 'task-2',
    title: '初始化项目依赖并测试 IndexedDB',
    description: '配置 Tailwind V4 和 Shadcn，创建本地数据库连接，确保数据能够本地离线存储。',
    status: 'done',
    priority: 'medium',
    labels: ['lbl-work'],
    dueDate: new Date().toISOString().split('T')[0],
    createdAt: Date.now() - 3600000 * 8,
    order: 0,
    linkedTaskIds: []
  },
  {
    id: 'task-3',
    title: '准备周度工作汇报',
    description: '总结本周在看板系统和智能标签组件上的研究，撰写详细的开发日记和下阶段规划。',
    status: 'todo',
    priority: 'low',
    labels: ['lbl-personal'],
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
    createdAt: Date.now(),
    order: 0,
    linkedTaskIds: []
  }
];

export async function restoreDemoData(): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(['tasks', 'labels', 'smartLabels'], 'readwrite');

  // Clear all stores
  transaction.objectStore('tasks').clear();
  transaction.objectStore('labels').clear();
  transaction.objectStore('smartLabels').clear();

  // Write default labels
  const labelStore = transaction.objectStore('labels');
  for (const label of DEFAULT_LABELS) {
    labelStore.put(label);
  }

  // Write default smart labels
  const smartLabelStore = transaction.objectStore('smartLabels');
  for (const smart of DEFAULT_SMART_LABELS) {
    smartLabelStore.put(smart);
  }

  // Write default tasks
  const taskStore = transaction.objectStore('tasks');
  for (const task of DEFAULT_TASKS) {
    taskStore.put(task);
  }

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function initializeDatabaseWithSeedData(): Promise<void> {
  const db = await openDB();

  // Helper to check if store has data
  const hasData = (storeName: 'tasks' | 'labels' | 'smartLabels'): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();
      request.onsuccess = () => resolve(request.result > 0);
      request.onerror = () => reject(request.error);
    });
  };

  const tasksEmpty = await hasData('tasks');
  const labelsEmpty = await hasData('labels');
  const smartLabelsEmpty = await hasData('smartLabels');

  const writeTransaction = db.transaction(['tasks', 'labels', 'smartLabels'], 'readwrite');

  if (!labelsEmpty) {
    const labelStore = writeTransaction.objectStore('labels');
    for (const label of DEFAULT_LABELS) {
      labelStore.put(label);
    }
  }

  if (!smartLabelsEmpty) {
    const smartLabelStore = writeTransaction.objectStore('smartLabels');
    for (const smart of DEFAULT_SMART_LABELS) {
      smartLabelStore.put(smart);
    }
  }


  // 用于初始化任务数据
  // if (!tasksEmpty) {
  //   const taskStore = writeTransaction.objectStore('tasks');
  //   for (const task of DEFAULT_TASKS) {
  //     taskStore.put(task);
  //   }
  // }

  return new Promise((resolve, reject) => {
    writeTransaction.oncomplete = () => resolve();
    writeTransaction.onerror = () => reject(writeTransaction.error);
  });
}

// CRUD Operations: Tasks
export async function getTasks(): Promise<Task[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('tasks', 'readonly');
    const store = transaction.objectStore('tasks');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveTask(task: Task): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('tasks', 'readwrite');
    const store = transaction.objectStore('tasks');
    const request = store.put(task);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteTask(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('tasks', 'readwrite');
    const store = transaction.objectStore('tasks');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// CRUD Operations: Labels
export async function getLabels(): Promise<Label[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('labels', 'readonly');
    const store = transaction.objectStore('labels');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLabel(label: Label): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('labels', 'readwrite');
    const store = transaction.objectStore('labels');
    const request = store.put(label);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteLabel(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('labels', 'readwrite');
    const store = transaction.objectStore('labels');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// CRUD Operations: Smart Labels
export async function getSmartLabels(): Promise<SmartLabel[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('smartLabels', 'readonly');
    const store = transaction.objectStore('smartLabels');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSmartLabel(smartLabel: SmartLabel): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('smartLabels', 'readwrite');
    const store = transaction.objectStore('smartLabels');
    const request = store.put(smartLabel);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteSmartLabel(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('smartLabels', 'readwrite');
    const store = transaction.objectStore('smartLabels');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
