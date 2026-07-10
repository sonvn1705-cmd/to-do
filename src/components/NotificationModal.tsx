import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ReminderNotification, TaskPriority } from '../types';
import { 
  Bell, 
  X, 
  Check, 
  Clock, 
  Volume2, 
  AlertTriangle 
} from 'lucide-react';
import { playChime } from '../utils/audio';

interface NotificationModalProps {
  notifications: ReminderNotification[];
  onDismiss: (notificationId: string) => void;
  onSnooze: (notificationId: string, taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  notifications,
  onDismiss,
  onSnooze,
  onCompleteTask,
}) => {
  // Filter for active (undismissed) notifications
  const activeNotifications = notifications.filter((n) => !n.dismissed);

  useEffect(() => {
    if (activeNotifications.length > 0) {
      // Play a pleasant chime when a new notification arrives
      playChime();
    }
  }, [activeNotifications.length]);

  if (activeNotifications.length === 0) return null;

  // Render the latest notification on top
  const latestNotification = activeNotifications[activeNotifications.length - 1];

  const getPriorityBorder = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH: return 'border-red-500 ring-2 ring-red-500/10';
      case TaskPriority.MEDIUM: return 'border-amber-500 ring-2 ring-amber-500/10';
      default: return 'border-blue-500 ring-2 ring-blue-500/10';
    }
  };

  const getPriorityText = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH: return 'Độ ưu tiên: Cao';
      case TaskPriority.MEDIUM: return 'Độ ưu tiên: Trung bình';
      default: return 'Độ ưu tiên: Thấp';
    }
  };

  return (
    <div id="notification-backdrop" className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <AnimatePresence>
        <motion.div
          id="notification-modal-box"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className={`bg-zinc-900 rounded-[28px] p-6 max-w-md w-full shadow-2xl border border-zinc-800 border-t-8 ${getPriorityBorder(
            latestNotification.priority
          )}`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ 
                  rotate: [0, -12, 12, -12, 12, 0],
                  scale: [1, 1.1, 1.1, 1.1, 1.1, 1]
                }}
                transition={{ 
                  repeat: Infinity, 
                  repeatDelay: 2, 
                  duration: 0.5 
                }}
                className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20"
              >
                <Bell size={24} className="stroke-[2.5]" />
              </motion.div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  NHẮC NHỞ CÔNG VIỆC
                </span>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  Kích hoạt lúc {new Date(latestNotification.triggeredAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(latestNotification.id)}
              className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-3 mb-6">
            <h3 className="text-base font-bold text-white leading-snug">
              {latestNotification.taskTitle}
            </h3>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 text-zinc-300 bg-zinc-950 px-2 py-1 rounded-lg font-mono border border-zinc-800">
                <Clock size={12} />
                <span>Hạn chót: {new Date(latestNotification.deadline).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
              </span>
              <span className={`inline-flex items-center px-2 py-1 rounded-lg font-medium text-[11px] ${
                latestNotification.priority === TaskPriority.HIGH 
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                  : latestNotification.priority === TaskPriority.MEDIUM 
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700/60'
              }`}>
                {getPriorityText(latestNotification.priority)}
              </span>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl flex items-center justify-between">
              <span className="text-xs text-zinc-400 flex items-center gap-1.5 font-medium">
                <Volume2 size={14} className="text-indigo-400" />
                Chuông báo đang kêu...
              </span>
              <button 
                type="button" 
                onClick={playChime}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
              >
                Nghe lại
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Mark Complete */}
            <button
              type="button"
              onClick={() => {
                onCompleteTask(latestNotification.taskId);
                onDismiss(latestNotification.id);
              }}
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
            >
              <Check size={14} className="stroke-[3]" />
              Hoàn thành
            </button>

            {/* Snooze 5 min */}
            <button
              type="button"
              onClick={() => onSnooze(latestNotification.id, latestNotification.taskId)}
              className="py-2.5 px-3 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
            >
              <Clock size={14} />
              Nhắc lại 5p
            </button>

            {/* Dismiss */}
            <button
              type="button"
              onClick={() => onDismiss(latestNotification.id)}
              className="py-2.5 px-3 bg-indigo-950 text-indigo-200 border border-indigo-900/60 hover:bg-indigo-900/80 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
            >
              <X size={14} />
              Bỏ qua
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
