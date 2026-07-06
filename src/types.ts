export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Label {
  id: string;
  name: string;
  color: string; // Tailwind color name (e.g., 'red', 'blue', 'green', 'amber', 'purple', 'indigo', 'pink', 'emerald')
}

export interface Rule {
  id: string;
  field: 'priority' | 'status' | 'dueDate' | 'label';
  operator: 'equals' | 'contains' | 'isBefore' | 'isAfter' | 'isEmpty' | 'isNotEmpty';
  value: string;
}

export interface SmartLabel {
  id: string;
  name: string;
  color: string;
  rules: Rule[];
  isSystem?: boolean; // System smart labels like "Today", "Overdue", "High Priority"
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  labels: string[]; // Custom label IDs
  dueDate?: string; // YYYY-MM-DD
  createdAt: number;
  order: number;
  linkedTaskIds: string[]; // Linked task IDs
  images?: string[]; // Optional array of base64 strings or image-hosting URLs
}

export interface LinkedTaskDetail {
  id: string;
  title: string;
  status: TaskStatus;
}
