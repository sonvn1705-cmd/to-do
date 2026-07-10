export enum TaskPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum TaskRecurrence {
  NONE = 'NONE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum TaskCategory {
  WORK = 'WORK',
  PERSONAL = 'PERSONAL',
  LEARNING = 'LEARNING',
  HEALTH = 'HEALTH',
  SHOPPING = 'SHOPPING',
  OTHER = 'OTHER',
}

export type ReminderOption = 'none' | 'at_deadline' | '5_mins' | '15_mins' | '30_mins' | '1_hour';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  category: TaskCategory;
  deadline: string; // ISO format or "YYYY-MM-DDTHH:mm"
  reminderOption: ReminderOption;
  recurrence?: TaskRecurrence;
  recurrenceDaysOfWeek?: number[]; // [0-6] for weekly
  recurrenceDayOfMonth?: number; // 1-31 for monthly/yearly
  recurrenceMonthOfYear?: number; // 0-11 for yearly
  recurrenceSpawned?: boolean;
  startDate?: string; // ISO format or "YYYY-MM-DDTHH:mm"
  completed: boolean;
  completedAt?: string;
  reminderTriggered: boolean;
  createdAt: string;
}

export interface ReminderNotification {
  id: string;
  taskId: string;
  taskTitle: string;
  triggeredAt: string;
  deadline: string;
  priority: TaskPriority;
  dismissed: boolean;
}
