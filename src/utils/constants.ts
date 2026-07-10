import { TaskCategory, TaskPriority, ReminderOption, TaskRecurrence } from '../types';

export const CATEGORY_DETAILS: Record<
  TaskCategory,
  { label: string; bgClass: string; textClass: string; borderClass: string; iconName: string }
> = {
  [TaskCategory.WORK]: {
    label: 'Công việc',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500/20',
    iconName: 'Briefcase',
  },
  [TaskCategory.PERSONAL]: {
    label: 'Cá nhân',
    bgClass: 'bg-purple-500/10',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/20',
    iconName: 'User',
  },
  [TaskCategory.LEARNING]: {
    label: 'Học tập',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/20',
    iconName: 'GraduationCap',
  },
  [TaskCategory.HEALTH]: {
    label: 'Sức khỏe',
    bgClass: 'bg-rose-500/10',
    textClass: 'text-rose-400',
    borderClass: 'border-rose-500/20',
    iconName: 'Heart',
  },
  [TaskCategory.SHOPPING]: {
    label: 'Mua sắm',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/20',
    iconName: 'ShoppingCart',
  },
  [TaskCategory.OTHER]: {
    label: 'Khác',
    bgClass: 'bg-zinc-500/10',
    textClass: 'text-zinc-400',
    borderClass: 'border-zinc-500/20',
    iconName: 'Tag',
  },
};

export const PRIORITY_DETAILS: Record<
  TaskPriority,
  { label: string; colorClass: string; badgeClass: string; bgBorderClass: string }
> = {
  [TaskPriority.HIGH]: {
    label: 'Cao',
    colorClass: 'text-red-400',
    badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20',
    bgBorderClass: 'border-l-[5px] border-l-red-500',
  },
  [TaskPriority.MEDIUM]: {
    label: 'Trung bình',
    colorClass: 'text-amber-400',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    bgBorderClass: 'border-l-[5px] border-l-amber-500',
  },
  [TaskPriority.LOW]: {
    label: 'Thấp',
    colorClass: 'text-zinc-400',
    badgeClass: 'bg-zinc-800 text-zinc-400 border-zinc-700/60',
    bgBorderClass: 'border-l-[5px] border-l-zinc-600',
  },
};

export const REMINDER_DETAILS: Record<ReminderOption, string> = {
  none: 'Không nhắc nhở',
  at_deadline: 'Tại thời điểm deadline',
  '5_mins': 'Trước 5 phút',
  '15_mins': 'Trước 15 phút',
  '30_mins': 'Trước 30 phút',
  '1_hour': 'Trước 1 giờ',
};

export const RECURRENCE_DETAILS: Record<TaskRecurrence, string> = {
  [TaskRecurrence.NONE]: 'Không lặp',
  [TaskRecurrence.DAILY]: 'Hàng ngày',
  [TaskRecurrence.WEEKLY]: 'Hàng tuần',
  [TaskRecurrence.MONTHLY]: 'Hàng tháng',
  [TaskRecurrence.YEARLY]: 'Hàng năm',
};
