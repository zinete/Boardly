import { create } from 'zustand';
import { useState, useEffect } from 'react';
import { Task, Label, SmartLabel, TaskStatus, TaskPriority, Rule } from '../types';
import {
  initializeDatabaseWithSeedData,
  restoreDemoData as restoreDemoDataDB,
  getTasks,
  saveTask,
  deleteTask,
  getLabels,
  saveLabel,
  deleteLabel,
  getSmartLabels,
  saveSmartLabel,
  deleteSmartLabel,
} from '../lib/db';

interface KanbanStore {
  tasks: Task[];
  labels: Label[];
  smartLabels: SmartLabel[];
  selectedSmartLabelId: string | null;
  selectedLabelId: string | null;
  searchQuery: string;
  isLoading: boolean;

  // Actions
  initStore: () => Promise<void>;
  addTask: (task: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    labels: string[];
    dueDate?: string;
    linkedTaskIds?: string[];
    images?: string[];
  }) => Promise<void>;
  updateTask: (id: string, updatedFields: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (taskId: string, targetStatus: TaskStatus, targetOrder: number) => Promise<void>;
  
  // Custom Labels
  addLabel: (name: string, color: string) => Promise<void>;
  deleteLabel: (id: string) => Promise<void>;

  // Smart Labels
  addSmartLabel: (name: string, color: string, rules: Rule[]) => Promise<void>;
  deleteSmartLabel: (id: string) => Promise<void>;

  // Filter Actions
  setSelectedSmartLabelId: (id: string | null) => void;
  setSelectedLabelId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;

  // Restore demo data
  restoreDemoData: () => Promise<void>;
}

// Evaluate whether a task matches a specific smart label
export function taskMatchesSmartLabel(task: Task, smartLabel: SmartLabel): boolean {
  const todayStr = new Date().toISOString().split('T')[0];

  return smartLabel.rules.every((rule) => {
    switch (rule.field) {
      case 'priority':
        if (rule.operator === 'equals') return task.priority === rule.value;
        if (rule.operator === 'contains') return rule.value.split(',').includes(task.priority);
        return true;

      case 'status':
        if (rule.operator === 'equals') return task.status === rule.value;
        if (rule.operator === 'contains') return rule.value.split(',').includes(task.status);
        return true;

      case 'dueDate': {
        const tDate = task.dueDate;
        if (rule.operator === 'isEmpty') return !tDate;
        if (rule.operator === 'isNotEmpty') return !!tDate;
        if (!tDate) return false;

        if (rule.value === 'today') {
          if (rule.operator === 'equals') return tDate === todayStr;
          if (rule.operator === 'isBefore') return tDate < todayStr;
          if (rule.operator === 'isAfter') return tDate > todayStr;
        } else {
          // Absolute date comparison
          if (rule.operator === 'equals') return tDate === rule.value;
          if (rule.operator === 'isBefore') return tDate < rule.value;
          if (rule.operator === 'isAfter') return tDate > rule.value;
        }
        return true;
      }

      case 'label':
        if (rule.operator === 'isEmpty') return task.labels.length === 0;
        if (rule.operator === 'isNotEmpty') return task.labels.length > 0;
        if (rule.operator === 'contains') {
          return task.labels.includes(rule.value);
        }
        return true;

      default:
        return true;
    }
  });
}

/**
 * Get the current AI enabled state from localStorage.
 * Default: false (disabled) when the key does not exist.
 */
export function getAiEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('boardly-ai-enabled') === 'true';
}

/** Set the AI enabled/disabled flag in localStorage. */
export function setAiEnabled(enabled: boolean): void {
  localStorage.setItem('boardly-ai-enabled', String(enabled));
}

/**
 * Check if AI features should be active.
 * Returns true only when BOTH conditions are met:
 *  1. AI is explicitly enabled via the `boardly-ai-enabled` toggle (default: false)
 *  2. At least one provider has a non-empty API key configured
 */
export function checkHasAiKey(): boolean {
  if (typeof window === 'undefined') return false;
  if (!getAiEnabled()) return false;
  const provider = localStorage.getItem('taskflow_ai_provider') || 'gemini';
  const useCustomKey = localStorage.getItem('taskflow_ai_use_custom_key') === 'true';
  const customKey = localStorage.getItem('taskflow_ai_custom_key') || '';
  if (provider === 'gemini') return useCustomKey && customKey.trim().length > 0;
  return customKey.trim().length > 0;
}

/** React hook that reactively tracks whether an AI key is configured.
 *  Polls every 500 ms so it picks up same-tab localStorage writes immediately. */
export function useHasAiKey(): boolean {
  const [hasKey, setHasKey] = useState(checkHasAiKey);
  useEffect(() => {
    const update = () => setHasKey(checkHasAiKey());
    update();
    const id = setInterval(update, 500);
    window.addEventListener('storage', update);
    window.addEventListener('focus', update);
    return () => {
      clearInterval(id);
      window.removeEventListener('storage', update);
      window.removeEventListener('focus', update);
    };
  }, []);
  return hasKey;
}

export const useKanbanStore = create<KanbanStore>((set, get) => ({
  tasks: [],
  labels: [],
  smartLabels: [],
  selectedSmartLabelId: null,
  selectedLabelId: null,
  searchQuery: '',
  isLoading: false,

  initStore: async () => {
    set({ isLoading: true });
    try {
      await initializeDatabaseWithSeedData();
      const tasks = await getTasks();
      const labels = await getLabels();
      const smartLabels = await getSmartLabels();
      
      set({
        tasks: tasks.sort((a, b) => a.order - b.order),
        labels,
        smartLabels,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to initialize store:', error);
      set({ isLoading: false });
    }
  },

  addTask: async (taskData) => {
    const { tasks } = get();
    // find order: find max order in same status
    const statusTasks = tasks.filter((t) => t.status === taskData.status);
    const maxOrder = statusTasks.reduce((max, t) => (t.order > max ? t.order : max), -1);
    
    const newTask: Task = {
      id: `task-${crypto.randomUUID()}`,
      title: taskData.title || '无标题任务',
      description: taskData.description || '',
      status: taskData.status,
      priority: taskData.priority,
      labels: taskData.labels,
      dueDate: taskData.dueDate,
      createdAt: Date.now(),
      order: maxOrder + 1,
      linkedTaskIds: taskData.linkedTaskIds || [],
      images: taskData.images || [],
    };

    await saveTask(newTask);
    set({ tasks: [...tasks, newTask] });
  },

  updateTask: async (id, updatedFields) => {
    const { tasks } = get();
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const updatedTask = { ...task, ...updatedFields };
    await saveTask(updatedTask);

    set({
      tasks: tasks.map((t) => (t.id === id ? updatedTask : t)),
    });
  },

  deleteTask: async (id) => {
    const { tasks } = get();
    await deleteTask(id);

    // Also remove any references in other task's linkedTaskIds
    const updatedTasks = tasks
      .filter((t) => t.id !== id)
      .map((t) => {
        if (t.linkedTaskIds.includes(id)) {
          const updated = { ...t, linkedTaskIds: t.linkedTaskIds.filter((lid) => lid !== id) };
          saveTask(updated); // Sync to IndexedDB
          return updated;
        }
        return t;
      });

    set({ tasks: updatedTasks });
  },

  moveTask: async (taskId, targetStatus, targetOrder) => {
    const { tasks } = get();
    const taskToMove = tasks.find((t) => t.id === taskId);
    if (!taskToMove) return;

    const sourceStatus = taskToMove.status;
    
    // Create copies
    let tempTasks = [...tasks];

    if (sourceStatus === targetStatus) {
      // Reordering within the same status column
      const columnTasks = tempTasks
        .filter((t) => t.status === sourceStatus)
        .sort((a, b) => a.order - b.order);

      const movingIndex = columnTasks.findIndex((t) => t.id === taskId);
      if (movingIndex !== -1) {
        columnTasks.splice(movingIndex, 1);
        columnTasks.splice(targetOrder, 0, taskToMove);

        // Reassign clean contiguous orders
        columnTasks.forEach((t, i) => {
          t.order = i;
        });

        // Save modifications to DB
        for (const t of columnTasks) {
          await saveTask(t);
        }
      }
    } else {
      // Moving to a different column
      const sourceColumn = tempTasks
        .filter((t) => t.status === sourceStatus && t.id !== taskId)
        .sort((a, b) => a.order - b.order);
      
      const targetColumn = tempTasks
        .filter((t) => t.status === targetStatus)
        .sort((a, b) => a.order - b.order);

      // Reorder source
      sourceColumn.forEach((t, i) => {
        t.order = i;
      });

      // Insert moving task into target column at targetOrder
      taskToMove.status = targetStatus;
      targetColumn.splice(targetOrder, 0, taskToMove);
      
      // Reorder target
      targetColumn.forEach((t, i) => {
        t.order = i;
      });

      // Sync both columns to DB
      for (const t of [...sourceColumn, ...targetColumn]) {
        await saveTask(t);
      }
    }

    // Refresh memory state
    const freshTasks = await getTasks();
    set({ tasks: freshTasks.sort((a, b) => a.order - b.order) });
  },

  addLabel: async (name, color) => {
    const { labels } = get();
    const newLabel: Label = {
      id: `lbl-${crypto.randomUUID()}`,
      name,
      color,
    };
    await saveLabel(newLabel);
    set({ labels: [...labels, newLabel] });
  },

  deleteLabel: async (id) => {
    const { labels, tasks } = get();
    await deleteLabel(id);

    // Also remove label from tasks
    const updatedTasks = tasks.map((t) => {
      if (t.labels.includes(id)) {
        const updated = { ...t, labels: t.labels.filter((lid) => lid !== id) };
        saveTask(updated); // Sync to DB
        return updated;
      }
      return t;
    });

    set({
      labels: labels.filter((l) => l.id !== id),
      tasks: updatedTasks,
    });
  },

  addSmartLabel: async (name, color, rules) => {
    const { smartLabels } = get();
    const newSmart: SmartLabel = {
      id: `smart-${crypto.randomUUID()}`,
      name,
      color,
      rules,
    };
    await saveSmartLabel(newSmart);
    set({ smartLabels: [...smartLabels, newSmart] });
  },

  deleteSmartLabel: async (id) => {
    const { smartLabels, selectedSmartLabelId } = get();
    await deleteSmartLabel(id);
    
    set({
      smartLabels: smartLabels.filter((s) => s.id !== id),
      selectedSmartLabelId: selectedSmartLabelId === id ? null : selectedSmartLabelId,
    });
  },

  setSelectedSmartLabelId: (id) => {
    set({ selectedSmartLabelId: id, selectedLabelId: null }); // mutually exclusive
  },

  setSelectedLabelId: (id) => {
    set({ selectedLabelId: id, selectedSmartLabelId: null }); // mutually exclusive
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  restoreDemoData: async () => {
    set({ isLoading: true });
    try {
      await restoreDemoDataDB();
      const tasks = await getTasks();
      const labels = await getLabels();
      const smartLabels = await getSmartLabels();
      set({
        tasks: tasks.sort((a, b) => a.order - b.order),
        labels,
        smartLabels,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to restore demo data:', error);
      set({ isLoading: false });
    }
  },
}));
