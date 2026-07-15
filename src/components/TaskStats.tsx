import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, TaskPriority } from '../types';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ListTodo, 
  TrendingUp,
  Settings2,
  Check,
  RotateCcw
} from 'lucide-react';

interface TaskStatsProps {
  tasks: Task[];
  dailyTargetGoal: number;
  onUpdateDailyTargetGoal: (goal: number) => void;
  manualPerformanceRating: number | null;
  onUpdateManualPerformanceRating: (rating: number | null) => void;
}

export const TaskStats: React.FC<TaskStatsProps> = ({ 
  tasks,
  dailyTargetGoal,
  onUpdateDailyTargetGoal,
  manualPerformanceRating,
  onUpdateManualPerformanceRating
}) => {
  const [showSettings, setShowSettings] = useState(false);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  
  // Calculate overdue tasks (completed: false and deadline is past current date-time)
  const now = new Date();
  const overdueTasks = tasks.filter(t => {
    if (t.completed) return false;
    const deadlineDate = new Date(t.deadline);
    return deadlineDate < now;
  }).length;

  const highPriorityPending = tasks.filter(t => !t.completed && t.priority === TaskPriority.HIGH).length;

  // New custom calculations for Daily Performance
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const isToday = (dateString: string) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return false;
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  // "công việc ngày là các công việc có hạn trong hôm nay hoặc bị trễ hạn"
  const dailyTasks = tasks.filter(t => {
    if (!t.deadline) return false;
    if (isToday(t.deadline)) return true;
    const d = new Date(t.deadline);
    if (d < startOfToday) {
      if (!t.completed) return true;
      if (t.completedAt && isToday(t.completedAt)) return true;
    }
    return false;
  });
  const dailyTasksCount = dailyTasks.length;

  // "công việc đã hoàn thành là các công việc có thời gian hoàn thành trong hôm nay"
  const completedTodayCount = tasks.filter(t => t.completed && t.completedAt && isToday(t.completedAt)).length;

  // Displayed performance (either custom manual rating count or auto computed completed tasks today count)
  const displayPerformance = manualPerformanceRating !== null ? manualPerformanceRating : completedTodayCount;

  // Compare performance against daily target goal
  const isGoalAchieved = displayPerformance >= dailyTargetGoal;

  // Define max reference for progress bar scale (at least dailyTargetGoal, dailyTasksCount, or 1 to avoid Division by Zero)
  const maxRef = Math.max(dailyTargetGoal, dailyTasksCount, 1);
  const progressPercent = Math.min((displayPerformance / maxRef) * 100, 100);
  const targetPercent = Math.min((dailyTargetGoal / maxRef) * 100, 100);

  return (
    <div id="stats-dashboard" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* Percentage Rate - Bento Accent Card with Interactive Goals & Overrides */}
      <motion.div 
        id="stat-completion-rate"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-indigo-600 border border-indigo-400 text-white rounded-[28px] p-5 shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[160px]"
      >
        <div className="relative z-10 flex flex-col grow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-indigo-200 text-xs font-bold uppercase tracking-widest">
              Hiệu suất ngày
            </span>
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-xs transition-all cursor-pointer flex items-center justify-center border border-white/5"
              title="Tùy chỉnh mục tiêu & hiệu suất"
            >
              <Settings2 size={14} className={showSettings ? 'rotate-90' : ''} />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {!showSettings ? (
              <motion.div
                key="stats-display"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col grow justify-between"
              >
                <div>
                  <div className="flex items-baseline gap-2">
                    <h4 className="text-4xl font-black font-mono tracking-tight">
                      {displayPerformance} <span className="text-lg font-normal text-indigo-200">/ {dailyTargetGoal}</span>
                    </h4>
                    <span className="text-[10px] text-indigo-100 font-semibold px-1.5 py-0.5 bg-white/15 rounded-md border border-white/10 uppercase tracking-wider">
                      {manualPerformanceRating !== null ? 'Tự đánh giá' : 'Tự động'}
                    </span>
                  </div>
                  <p className="mt-2 text-indigo-100 text-xs leading-relaxed font-sans">
                    {manualPerformanceRating !== null ? (
                      <span>Đã tự điều chỉnh hiệu suất (Tự động: {completedTodayCount} việc).</span>
                    ) : (
                      <span>Đã giải quyết {completedTodayCount}/{dailyTasksCount} công việc ngày.</span>
                    )}
                  </p>
                  <p className="text-[11px] text-indigo-200 mt-1 font-medium">
                    Mục tiêu ngày: <strong className="text-white font-mono">{dailyTargetGoal} việc</strong>
                    {isGoalAchieved ? (
                      <span className="ml-2 text-emerald-300 font-bold">✓ Đạt mục tiêu!</span>
                    ) : (
                      <span className="ml-2 text-amber-200 font-bold">({dailyTargetGoal - displayPerformance} việc còn lại)</span>
                    )}
                  </p>
                </div>

                {/* Glowing visual indicator bar */}
                <div className="w-full bg-indigo-950/40 rounded-full h-1.5 mt-3 overflow-hidden relative">
                  <motion.div 
                    className={`h-full rounded-full ${isGoalAchieved ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                  {/* Target Marker */}
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-white/60 z-20"
                    style={{ left: `${targetPercent}%` }}
                    title={`Mục tiêu: ${dailyTargetGoal} việc`}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="stats-settings"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
                className="space-y-3 pt-1 grow flex flex-col justify-between"
              >
                {/* Daily Goal Target Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold text-indigo-100 uppercase tracking-wider">
                    <span>Mục tiêu ngày:</span>
                    <span className="font-mono text-xs text-white">{dailyTargetGoal} việc</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={Math.min(dailyTargetGoal, 20)}
                    onChange={(e) => onUpdateDailyTargetGoal(Number(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-indigo-950/40 rounded-lg appearance-none"
                  />
                </div>

                {/* Manual Performance Override Slider */}
                <div className="space-y-1.5 border-t border-indigo-500/35 pt-2">
                  <div className="flex justify-between items-center text-[10px] font-bold text-indigo-100 uppercase tracking-wider">
                    <span>Tự đánh giá hiệu suất:</span>
                    <span className="font-mono text-xs text-white">
                      {manualPerformanceRating !== null ? `${manualPerformanceRating} việc` : 'Tắt'}
                    </span>
                  </div>
                  
                  {manualPerformanceRating === null ? (
                    <button
                      type="button"
                      onClick={() => onUpdateManualPerformanceRating(completedTodayCount)}
                      className="w-full py-1 px-2.5 bg-white/10 hover:bg-white/20 border border-white/15 text-xs rounded-xl font-bold transition-all cursor-pointer text-center"
                    >
                      Bật tự đánh giá
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max={Math.max(dailyTasksCount, 15)}
                        step="1"
                        value={manualPerformanceRating}
                        onChange={(e) => onUpdateManualPerformanceRating(Number(e.target.value))}
                        className="grow accent-emerald-400 cursor-pointer h-1.5 bg-indigo-950/40 rounded-lg appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => onUpdateManualPerformanceRating(null)}
                        className="p-1 bg-white/10 hover:bg-red-400/20 hover:text-red-300 rounded-lg transition-all cursor-pointer border border-white/5"
                        title="Hủy tự đánh giá (Dùng tự động)"
                      >
                        <RotateCcw size={12} />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="w-full py-1 bg-emerald-400 hover:bg-emerald-300 text-indigo-950 text-[11px] font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 mt-1 border border-emerald-300"
                >
                  <Check size={12} className="stroke-[3]" />
                  Xong
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl" />
      </motion.div>

      {/* Pending Tasks - Dark Bento Card */}
      <motion.div 
        id="stat-pending-tasks"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="bg-zinc-900 border border-zinc-800 rounded-[28px] p-5 shadow-md flex flex-col justify-between text-zinc-100 min-h-[160px]"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Chưa xong</span>
          <div className="p-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg">
            <ListTodo size={16} />
          </div>
        </div>
        <div>
          <h4 className="text-3xl font-bold font-mono tracking-tight text-white">
            {pendingTasks} <span className="text-xs font-sans text-zinc-500 font-normal">việc còn lại</span>
          </h4>
          <p className="text-xs text-zinc-400 mt-2">Duy trì nhịp độ làm việc để hoàn thành đúng kế hoạch.</p>
        </div>
      </motion.div>

      {/* Overdue Tasks - Urgent Bento Card */}
      <motion.div 
        id="stat-overdue-tasks"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-[28px] p-5 shadow-md flex flex-col justify-between text-zinc-100 min-h-[160px]"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Quá hạn chót</span>
          <div className={`p-1.5 rounded-lg ${overdueTasks > 0 ? 'bg-red-500/20 text-red-400 animate-pulse border border-red-500/30' : 'bg-zinc-800 border border-zinc-700 text-zinc-300'}`}>
            <AlertTriangle size={16} />
          </div>
        </div>
        <div>
          <h4 className={`text-3xl font-bold font-mono tracking-tight ${overdueTasks > 0 ? 'text-red-500 shadow-sm' : 'text-white'}`}>
            {overdueTasks}
          </h4>
          <p className="text-xs text-zinc-400 mt-2">
            {overdueTasks > 0 ? 'Nhiệm vụ quá hạn! Cần hoàn thành ngay.' : 'Tuyệt vời! Không có nhiệm vụ nào bị trễ hạn.'}
          </p>
        </div>
      </motion.div>

      {/* High Priority Tasks - Focus Bento Card */}
      <motion.div 
        id="stat-high-priority"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="bg-zinc-900/50 border border-zinc-800 rounded-[28px] p-5 shadow-md flex flex-col justify-between text-zinc-100 min-h-[160px]"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Ưu tiên cao</span>
          <div className="p-1.5 bg-zinc-800 border border-zinc-700 text-amber-500 rounded-lg">
            <CheckCircle2 size={16} />
          </div>
        </div>
        <div>
          <h4 className="text-3xl font-bold font-mono tracking-tight text-white">
            {highPriorityPending} <span className="text-xs font-sans text-zinc-500 font-normal">nhiệm vụ</span>
          </h4>
          <p className="text-xs text-zinc-400 mt-2">Được phân loại là khẩn cấp và cực kỳ quan trọng.</p>
        </div>
      </motion.div>
    </div>
  );
};
