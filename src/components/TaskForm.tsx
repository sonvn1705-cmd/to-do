import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Task, TaskPriority, TaskCategory, ReminderOption, TaskRecurrence } from '../types';
import { 
  Plus, 
  X, 
  Calendar, 
  Bell, 
  Tag, 
  AlertCircle, 
  Check,
  RefreshCw
} from 'lucide-react';
import { CATEGORY_DETAILS, PRIORITY_DETAILS, REMINDER_DETAILS, RECURRENCE_DETAILS } from '../utils/constants';

interface TaskFormProps {
  onSubmit: (taskData: Omit<Task, 'id' | 'completed' | 'reminderTriggered' | 'createdAt'>) => void;
  editingTask?: Task | null;
  onCancelEdit?: () => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({ onSubmit, editingTask, onCancelEdit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [category, setCategory] = useState<TaskCategory>(TaskCategory.WORK);
  const [deadline, setDeadline] = useState('');
  const [reminderOption, setReminderOption] = useState<ReminderOption>('15_mins');
  const [recurrence, setRecurrence] = useState<TaskRecurrence>(TaskRecurrence.NONE);
  const [startDate, setStartDate] = useState('');
  const [recurrenceDaysOfWeek, setRecurrenceDaysOfWeek] = useState<number[]>([]);
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState<number | undefined>(undefined);
  const [recurrenceMonthOfYear, setRecurrenceMonthOfYear] = useState<number | undefined>(undefined);
  const [error, setError] = useState('');

  // Set default deadline to today + 4 hours
  const getDefaultDeadline = () => {
    const d = new Date();
    d.setHours(d.getHours() + 4);
    d.setMinutes(Math.round(d.getMinutes() / 5) * 5); // Round to nearest 5 mins
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setPriority(editingTask.priority);
      setCategory(editingTask.category);
      setDeadline(editingTask.deadline);
      setReminderOption(editingTask.reminderOption);
      setRecurrence(editingTask.recurrence || TaskRecurrence.NONE);
      setStartDate(editingTask.startDate || '');
      setRecurrenceDaysOfWeek(editingTask.recurrenceDaysOfWeek || []);
      setRecurrenceDayOfMonth(editingTask.recurrenceDayOfMonth);
      setRecurrenceMonthOfYear(editingTask.recurrenceMonthOfYear);
      setError('');
    } else {
      setTitle('');
      setDescription('');
      setPriority(TaskPriority.MEDIUM);
      setCategory(TaskCategory.WORK);
      setDeadline(getDefaultDeadline());
      setReminderOption('15_mins');
      setRecurrence(TaskRecurrence.NONE);
      setStartDate('');
      setRecurrenceDaysOfWeek([]);
      setRecurrenceDayOfMonth(undefined);
      setRecurrenceMonthOfYear(undefined);
      setError('');
    }
  }, [editingTask]);

  // Automatically pre-populate custom recurrence options based on the selected deadline
  useEffect(() => {
    if (recurrence === TaskRecurrence.WEEKLY && recurrenceDaysOfWeek.length === 0 && deadline) {
      const d = new Date(deadline);
      if (!isNaN(d.getTime())) {
        setRecurrenceDaysOfWeek([d.getDay()]);
      }
    } else if (recurrence === TaskRecurrence.MONTHLY && recurrenceDayOfMonth === undefined && deadline) {
      const d = new Date(deadline);
      if (!isNaN(d.getTime())) {
        setRecurrenceDayOfMonth(d.getDate());
      }
    } else if (recurrence === TaskRecurrence.YEARLY && (recurrenceMonthOfYear === undefined || recurrenceDayOfMonth === undefined) && deadline) {
      const d = new Date(deadline);
      if (!isNaN(d.getTime())) {
        setRecurrenceMonthOfYear(d.getMonth());
        setRecurrenceDayOfMonth(d.getDate());
      }
    }
  }, [recurrence, deadline]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề công việc.');
      return;
    }
    if (!deadline) {
      setError('Vui lòng chọn thời hạn chót (Deadline).');
      return;
    }

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      category,
      deadline,
      reminderOption,
      recurrence,
      recurrenceDaysOfWeek: recurrence !== TaskRecurrence.NONE ? recurrenceDaysOfWeek : undefined,
      recurrenceDayOfMonth: recurrence !== TaskRecurrence.NONE ? recurrenceDayOfMonth : undefined,
      recurrenceMonthOfYear: recurrence !== TaskRecurrence.NONE ? recurrenceMonthOfYear : undefined,
      startDate: startDate || undefined,
    });

    if (!editingTask) {
      // Clear for new tasks
      setTitle('');
      setDescription('');
      setPriority(TaskPriority.MEDIUM);
      setCategory(TaskCategory.WORK);
      setDeadline(getDefaultDeadline());
      setReminderOption('15_mins');
      setRecurrence(TaskRecurrence.NONE);
      setStartDate('');
      setRecurrenceDaysOfWeek([]);
      setRecurrenceDayOfMonth(undefined);
      setRecurrenceMonthOfYear(undefined);
    }
    setError('');
  };

  return (
    <div id="task-form-container" className="bg-zinc-900/50 border border-zinc-800 rounded-[28px] p-5 shadow-xl text-zinc-100">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
          {editingTask ? (
            <>
              <span className="flex h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
              Sửa công việc
            </>
          ) : (
            <>
              <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
              Thêm công việc mới
            </>
          )}
        </h3>
        {editingTask && onCancelEdit && (
          <button 
            type="button" 
            onClick={onCancelEdit}
            className="text-zinc-400 hover:text-white transition-colors p-1 hover:bg-zinc-800 rounded-lg cursor-pointer"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/30 border border-red-900/40 p-2.5 rounded-xl">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-1">
            Tiêu đề <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Ví dụ: Hoàn thành thiết kế Dashboard..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 transition-all outline-hidden"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-1">Mô tả chi tiết</label>
          <textarea
            placeholder="Nội dung chi tiết, các lưu ý quan trọng..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 transition-all outline-hidden resize-none"
          />
        </div>

        {/* Priority Choice */}
        <div>
          <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-1.5">Độ ưu tiên</label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(PRIORITY_DETAILS).map(([level, details]) => {
              const isSelected = priority === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setPriority(level as TaskPriority)}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                    isSelected 
                      ? 'bg-zinc-100 text-zinc-950 border-white font-bold shadow-xs' 
                      : 'border-zinc-800 hover:bg-zinc-800 hover:text-white text-zinc-400 bg-zinc-950'
                  }`}
                >
                  {isSelected && <Check size={12} className="stroke-[3]" />}
                  {details.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Choice */}
        <div>
          <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-1.5">Phân loại</label>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(CATEGORY_DETAILS).map(([cat, details]) => {
              const isSelected = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat as TaskCategory)}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all duration-150 flex items-center gap-1 cursor-pointer ${
                    isSelected 
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.3)]' 
                      : 'border-zinc-800 hover:bg-zinc-800 text-zinc-400 bg-zinc-950'
                  }`}
                >
                  <span>{details.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Start Date & Deadline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Start Date */}
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-1 flex items-center gap-1">
              <Calendar size={12} className="text-emerald-400" />
              Ngày bắt đầu (Ẩn trước ngày này)
            </label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-sm text-white transition-all outline-hidden"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-1 flex items-center gap-1">
              <Calendar size={12} className="text-rose-400" />
              Hạn chót <span className="text-rose-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-sm text-white transition-all outline-hidden"
              style={{ colorScheme: 'dark' }}
            />
          </div>
        </div>

        {/* Reminder Options */}
        <div>
          <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-1 flex items-center gap-1">
            <Bell size={12} />
            Nhắc nhở trước
          </label>
          <select
            value={reminderOption}
            onChange={(e) => setReminderOption(e.target.value as ReminderOption)}
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-zinc-300 transition-all outline-hidden cursor-pointer"
          >
            {Object.entries(REMINDER_DETAILS).map(([opt, label]) => (
              <option key={opt} value={opt} className="bg-zinc-950 text-white">
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Recurrence Choice */}
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-1.5 flex items-center gap-1">
              <RefreshCw size={12} className="text-zinc-500 animate-[spin_4s_linear_infinite]" />
              Lặp lại định kỳ
            </label>
            <div className="grid grid-cols-5 gap-1">
              {Object.entries(RECURRENCE_DETAILS).map(([type, label]) => {
                const isSelected = recurrence === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setRecurrence(type as TaskRecurrence)}
                    className={`py-2 px-1 text-[10px] sm:text-xs font-semibold rounded-xl border transition-all duration-150 flex items-center justify-center cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.3)]' 
                        : 'border-zinc-800 hover:bg-zinc-800 text-zinc-400 bg-zinc-950'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Weekly Options */}
          {recurrence === TaskRecurrence.WEEKLY && (
            <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-850 space-y-2">
              <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-400">
                Lặp vào các thứ trong tuần
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 1, label: 'Thứ 2' },
                  { value: 2, label: 'Thứ 3' },
                  { value: 3, label: 'Thứ 4' },
                  { value: 4, label: 'Thứ 5' },
                  { value: 5, label: 'Thứ 6' },
                  { value: 6, label: 'Thứ 7' },
                  { value: 0, label: 'Chủ Nhật' },
                ].map((day) => {
                  const isChecked = recurrenceDaysOfWeek.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          setRecurrenceDaysOfWeek(recurrenceDaysOfWeek.filter((d) => d !== day.value));
                        } else {
                          setRecurrenceDaysOfWeek([...recurrenceDaysOfWeek, day.value]);
                        }
                      }}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all duration-150 cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                          : 'border-zinc-800 hover:bg-zinc-800 text-zinc-400 bg-zinc-900'
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Monthly Options */}
          {recurrence === TaskRecurrence.MONTHLY && (
            <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-850 space-y-2">
              <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-400">
                Lặp vào ngày cụ thể của tháng
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Ngày:</span>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={recurrenceDayOfMonth !== undefined ? recurrenceDayOfMonth : ''}
                  onChange={(e) => setRecurrenceDayOfMonth(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  className="w-20 bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-lg px-2 py-1 text-xs text-white transition-all outline-hidden text-center"
                />
                <span className="text-xs text-zinc-500">(ví dụ: ngày 15 hàng tháng)</span>
              </div>
            </div>
          )}

          {/* Custom Yearly Options */}
          {recurrence === TaskRecurrence.YEARLY && (
            <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-850 space-y-3">
              <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-400">
                Lặp vào ngày cụ thể của năm
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] uppercase font-bold tracking-wider text-zinc-500 mb-1">Tháng</label>
                  <select
                    value={recurrenceMonthOfYear !== undefined ? recurrenceMonthOfYear : ''}
                    onChange={(e) => setRecurrenceMonthOfYear(e.target.value !== '' ? parseInt(e.target.value, 10) : undefined)}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-lg px-2 py-1 text-xs text-zinc-300 transition-all outline-hidden cursor-pointer"
                  >
                    {[
                      { value: 0, label: 'Tháng 1' },
                      { value: 1, label: 'Tháng 2' },
                      { value: 2, label: 'Tháng 3' },
                      { value: 3, label: 'Tháng 4' },
                      { value: 4, label: 'Tháng 5' },
                      { value: 5, label: 'Tháng 6' },
                      { value: 6, label: 'Tháng 7' },
                      { value: 7, label: 'Tháng 8' },
                      { value: 8, label: 'Tháng 9' },
                      { value: 9, label: 'Tháng 10' },
                      { value: 10, label: 'Tháng 11' },
                      { value: 11, label: 'Tháng 12' },
                    ].map((m) => (
                      <option key={m.value} value={m.value} className="bg-zinc-950 text-white">
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-bold tracking-wider text-zinc-500 mb-1">Ngày trong tháng</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={recurrenceDayOfMonth !== undefined ? recurrenceDayOfMonth : ''}
                    onChange={(e) => setRecurrenceDayOfMonth(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-lg px-2 py-1 text-xs text-white transition-all outline-hidden text-center"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 ${
              editingTask 
                ? 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] shadow-blue-900/20' 
                : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] shadow-indigo-950/20'
            }`}
          >
            {editingTask ? (
              <>Cập nhật công việc</>
            ) : (
              <>
                <Plus size={16} /> Thêm vào danh sách
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
