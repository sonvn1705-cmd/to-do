import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, TaskRecurrence } from '../types';
import { 
  Briefcase, 
  User, 
  GraduationCap, 
  Heart, 
  ShoppingCart, 
  Tag,
  Clock,
  AlertTriangle,
  Bell,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { CATEGORY_DETAILS, PRIORITY_DETAILS, REMINDER_DETAILS, RECURRENCE_DETAILS } from '../utils/constants';

interface TaskItemProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ 
  task, 
  onToggleComplete, 
  onDelete, 
  onEdit 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'WORK': return <Briefcase size={12} />;
      case 'PERSONAL': return <User size={12} />;
      case 'LEARNING': return <GraduationCap size={12} />;
      case 'HEALTH': return <Heart size={12} />;
      case 'SHOPPING': return <ShoppingCart size={12} />;
      default: return <Tag size={12} />;
    }
  };

  // Format date-time for display: "14:30 09/07/2026"
  const formatDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  };

  const getRecurrenceLabel = () => {
    if (!task.recurrence || task.recurrence === TaskRecurrence.NONE) return '';
    
    if (task.recurrence === TaskRecurrence.WEEKLY && task.recurrenceDaysOfWeek && task.recurrenceDaysOfWeek.length > 0) {
      const dayNames = task.recurrenceDaysOfWeek.map((day) => {
        if (day === 0) return 'CN';
        return `T${day + 1}`;
      }).join(', ');
      return `Hàng tuần (${dayNames})`;
    }
    
    if (task.recurrence === TaskRecurrence.MONTHLY && task.recurrenceDayOfMonth !== undefined) {
      return `Hàng tháng (ngày ${task.recurrenceDayOfMonth})`;
    }
    
    if (task.recurrence === TaskRecurrence.YEARLY) {
      if (task.recurrenceMonthOfYear !== undefined && task.recurrenceDayOfMonth !== undefined) {
        return `Hàng năm (${task.recurrenceDayOfMonth}/${task.recurrenceMonthOfYear + 1})`;
      }
      return 'Hàng năm';
    }
    
    return RECURRENCE_DETAILS[task.recurrence];
  };

  // Calculate remaining or overdue time
  const getTimeRemainingText = (deadlineStr: string, completed: boolean, completedAt?: string) => {
    if (completed) {
      if (!completedAt) return 'Đã hoàn thành';
      const compDate = new Date(completedAt);
      const h = String(compDate.getHours()).padStart(2, '0');
      const m = String(compDate.getMinutes()).padStart(2, '0');
      return `Đã xong lúc ${h}:${m}`;
    }

    const deadline = new Date(deadlineStr);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const isOverdue = diffMs < 0;
    const absDiffMs = Math.abs(diffMs);

    const diffMins = Math.floor(absDiffMs / (1000 * 60));
    const diffHours = Math.floor(absDiffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(absDiffMs / (1000 * 60 * 60 * 24));

    let durationText = '';
    if (diffDays > 0) {
      durationText = `${diffDays} ngày`;
    } else if (diffHours > 0) {
      const remainingMins = diffMins % 60;
      durationText = `${diffHours} giờ ${remainingMins > 0 ? `${remainingMins} phút` : ''}`;
    } else if (diffMins > 0) {
      durationText = `${diffMins} phút`;
    } else {
      durationText = 'vài giây';
    }

    if (isOverdue) {
      return { text: `Trễ hạn ${durationText}`, isOverdue: true };
    }
    return { text: `Còn ${durationText}`, isOverdue: false };
  };

  const timeInfo = getTimeRemainingText(task.deadline, task.completed, task.completedAt);
  const isOverdueState = typeof timeInfo === 'object' && timeInfo.isOverdue;
  const timeText = typeof timeInfo === 'string' ? timeInfo : timeInfo.text;

  const catDetails = CATEGORY_DETAILS[task.category];
  const priDetails = PRIORITY_DETAILS[task.priority];

  return (
    <motion.div
      id={`task-item-${task.id}`}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`bg-zinc-900 border rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden ${
        priDetails.bgBorderClass
      } ${task.completed ? 'border-zinc-800/40 bg-zinc-900/40 opacity-60' : isOverdueState ? 'border-red-950/40 bg-red-950/10' : 'border-zinc-800 hover:border-zinc-700/80'}`}
    >
      <div className="p-4 flex items-start gap-3">
        {/* Toggle Complete Checkbox */}
        <button
          type="button"
          onClick={() => onToggleComplete(task.id)}
          className={`shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
            task.completed
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
              : isOverdueState
              ? 'border-red-500/50 hover:border-red-500 hover:bg-red-500/10'
              : 'border-zinc-700 hover:border-indigo-500 hover:bg-indigo-500/10'
          }`}
        >
          <AnimatePresence>
            {task.completed && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                <Check size={14} className="stroke-[3.5]" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* Core Content */}
        <div className="grow min-w-0" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex flex-wrap items-center gap-1.5 mb-1 cursor-pointer">
            {/* Category Badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md border ${catDetails.bgClass} ${catDetails.textClass} ${catDetails.borderClass}`}>
              {getCategoryIcon(task.category)}
              <span>{catDetails.label}</span>
            </span>

            {/* Priority Badge */}
            <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-md border ${priDetails.badgeClass}`}>
              {priDetails.label}
            </span>

            {/* Reminder Badge if active */}
            {task.reminderOption !== 'none' && !task.completed && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md">
                <Bell size={10} />
                <span>Nhắc nhở</span>
              </span>
            )}

            {/* Recurrence Badge */}
            {task.recurrence && task.recurrence !== TaskRecurrence.NONE && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                <RefreshCw size={10} className="animate-[spin_6s_linear_infinite]" />
                <span>{getRecurrenceLabel()}</span>
              </span>
            )}
          </div>

          <h4 className={`text-sm font-semibold break-words cursor-pointer ${task.completed ? 'line-through text-zinc-500' : 'text-zinc-100 hover:text-white'}`}>
            {task.title}
          </h4>

          {/* Time & Deadline Line */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs">
            {task.startDate && (
              <span className="text-emerald-400 flex items-center gap-1 font-semibold bg-emerald-500/5 px-1.5 py-0.5 rounded-md border border-emerald-500/10">
                <Calendar size={12} className="shrink-0 text-emerald-500" />
                Bắt đầu: <span className="font-medium">{formatDateTime(task.startDate)}</span>
              </span>
            )}

            <span className="text-zinc-400 flex items-center gap-1">
              <Clock size={12} className="shrink-0 text-zinc-500" />
              Hạn: <span className="font-medium text-zinc-300">{formatDateTime(task.deadline)}</span>
            </span>

            {/* Remaining status */}
            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md font-mono text-[10px] font-semibold ${
              task.completed 
                ? 'bg-zinc-800 text-zinc-400' 
                : isOverdueState 
                ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                : 'bg-indigo-500/10 text-indigo-400'
            }`}>
              {isOverdueState && <AlertTriangle size={10} className="stroke-[2.5]" />}
              {timeText}
            </span>
          </div>
        </div>

        {/* Actions Button */}
        <div className="flex items-center gap-1 self-start">
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            title="Sửa công việc"
          >
            <Edit2 size={13} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            title="Xóa công việc"
          >
            <Trash2 size={13} />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expandable Details Container */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-zinc-950/80 border-t border-zinc-850 px-4 py-3"
          >
            <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
              {task.description || <span className="italic text-zinc-500">Không có mô tả chi tiết cho công việc này.</span>}
            </p>

            <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-500 border-t border-zinc-800/50 pt-2">
              <span>Tạo lúc: {formatDateTime(task.createdAt)}</span>
              {task.reminderOption !== 'none' && (
                <span>
                  Chế độ báo thức: {REMINDER_DETAILS[task.reminderOption]}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
