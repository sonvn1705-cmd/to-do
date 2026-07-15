import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, TaskPriority, TaskCategory, ReminderOption, ReminderNotification, TaskRecurrence } from './types';
import { getSampleTasks } from './utils/sampleData';
import { getNextDeadline, getNextStartDate } from './utils/recurrence';
import { TaskStats } from './components/TaskStats';
import { TaskForm } from './components/TaskForm';
import { TaskItem } from './components/TaskItem';
import { NotificationModal } from './components/NotificationModal';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db, auth, googleProvider } from './lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { 
  CheckSquare, 
  Search, 
  Filter, 
  Clock, 
  ChevronDown, 
  BellRing, 
  Trash2, 
  Plus, 
  X,
  RefreshCw,
  Eye,
  EyeOff,
  Cloud,
  Copy,
  Check,
  Calendar,
  CalendarDays,
  Sun,
  Sparkles,
  Smartphone,
  LogOut,
  User as UserIcon,
  CheckCircle2
} from 'lucide-react';
import { CATEGORY_DETAILS } from './utils/constants';

export default function App() {
  // ----------------------------------------------------
  // States
  // ----------------------------------------------------
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // Interactive performance stats states
  const [dailyTargetGoal, setDailyTargetGoal] = useState<number>(() => {
    const saved = localStorage.getItem('daily_target_goal');
    if (saved) {
      const parsed = Number(saved);
      // Migrate legacy percentage goal (e.g. 50 or 100) to a reasonable task count (e.g. 3)
      if (parsed > 25) {
        return 3;
      }
      return parsed;
    }
    return 3; // Default to 3 tasks goal
  });

  const [manualPerformanceRating, setManualPerformanceRating] = useState<number | null>(() => {
    const saved = localStorage.getItem('manual_performance_rating');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed !== null && parsed > 25) {
          return null; // Reset legacy percentage ratings
        }
        return parsed;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Sync States
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'connected' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const isSyncingFromCloud = useRef(false);
  const hasLoadedCloudData = useRef(false);

  // User Auth State
  const [user, setUser] = useState<User | null>(null);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setSyncStatus('loading');
    setSyncMessage('Đang kết nối tài khoản Google...');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setSyncStatus('connected');
      setSyncMessage(`Đăng nhập thành công! Chào mừng ${result.user.displayName || result.user.email}`);
    } catch (e: any) {
      console.error("Google Sign-In Error:", e);
      setSyncStatus('error');
      setSyncMessage(`Không thể đăng nhập: ${e?.message || 'Vui lòng thử lại.'}`);
    }
  };

  const handleSignOut = async () => {
    setSyncStatus('loading');
    try {
      await signOut(auth);
      setSyncStatus('idle');
      setSyncMessage('Đã đăng xuất tài khoản Google.');
    } catch (e: any) {
      console.error("Google Sign-Out Error:", e);
      setSyncStatus('error');
      setSyncMessage('Có lỗi xảy ra khi đăng xuất.');
    }
  };

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'OVERDUE'>('ALL');
  const [sortBy, setSortBy] = useState<'DEADLINE_ASC' | 'DEADLINE_DESC' | 'PRIORITY_DESC' | 'CREATED_DESC'>('DEADLINE_ASC');
  const [showFutureTasks, setShowFutureTasks] = useState(false);

  // Reminders & Notifications
  const [notifications, setNotifications] = useState<ReminderNotification[]>([]);
  // Store snoozed tasks: taskId -> timestamp when it should re-trigger
  const [snoozedReminders, setSnoozedReminders] = useState<Record<string, number>>({});

  // Mobile drawer state for form
  const [showMobileForm, setShowMobileForm] = useState(false);

  // Audio mute status (in case they want silence, although Web Audio is client-driven)
  const [soundEnabled, setSoundEnabled] = useState(true);

  // ----------------------------------------------------
  // Effects & Initial Load
  // ----------------------------------------------------
  useEffect(() => {
    // Load tasks from localStorage or fall back to sample tasks
    const stored = localStorage.getItem('daily_todos');
    if (stored) {
      try {
        setTasks(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse stored tasks, loading defaults', e);
        const defaults = getSampleTasks();
        setTasks(defaults);
        localStorage.setItem('daily_todos', JSON.stringify(defaults));
      }
    } else {
      const defaults = getSampleTasks();
      setTasks(defaults);
      localStorage.setItem('daily_todos', JSON.stringify(defaults));
    }

    // Load active notifications if any
    const storedNotifs = localStorage.getItem('daily_notifications');
    if (storedNotifs) {
      try {
        setNotifications(JSON.parse(storedNotifs));
      } catch (e) {}
    }

    // Load snooze config
    const storedSnoozes = localStorage.getItem('daily_snoozes');
    if (storedSnoozes) {
      try {
        setSnoozedReminders(JSON.parse(storedSnoozes));
      } catch (e) {}
    }
  }, []);

  // Register Service Worker and request browser Notification permissions
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('Quyền thông báo hệ thống đã được cấp!');
        }
      });
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('Service Worker đã được đăng ký thành công:', reg.scope);
        })
        .catch((err) => {
          console.error('Đăng ký Service Worker thất bại:', err);
        });

      const handleServiceWorkerMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'TASKS_UPDATED_FROM_BACKGROUND') {
          setTasks(event.data.tasks);
          localStorage.setItem('daily_todos', JSON.stringify(event.data.tasks));
        }
      };

      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      };
    }
  }, []);

  // Sync tasks list to Service Worker cache whenever tasks state changes
  useEffect(() => {
    const sendTasksToSW = () => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SET_TASKS',
          tasks: tasks
        });
      }
    };

    if ('serviceWorker' in navigator) {
      sendTasksToSW();
      navigator.serviceWorker.addEventListener('controllerchange', sendTasksToSW);
      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', sendTasksToSW);
      };
    }
  }, [tasks]);

  const hasCleanedUp = useRef(false);

  // Auto-delete completed tasks older than 15 days
  useEffect(() => {
    if (tasks.length === 0 || hasCleanedUp.current) return;
    
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    
    let hasChanged = false;
    const remainingTasks = tasks.filter(task => {
      if (task.completed && task.completedAt) {
        const completedDate = new Date(task.completedAt);
        if (!isNaN(completedDate.getTime()) && completedDate < fifteenDaysAgo) {
          hasChanged = true;
          return false; // delete this task
        }
      }
      return true;
    });

    if (hasChanged) {
      console.log("Đã tự động dọn dẹp các công việc đã hoàn thành cũ hơn 15 ngày.");
      saveTasks(remainingTasks);
    }
    hasCleanedUp.current = true;
  }, [tasks]);

  // Save data to cloud (Firestore)
  const saveDataToCloud = async (
    currentTasks: Task[],
    currentTargetGoal: number,
    currentManualRating: number | null,
    codeToUse = user ? `USER-${user.uid}` : null
  ) => {
    if (!codeToUse || isSyncingFromCloud.current) return;
    
    // Safety check: Don't allow writing back to cloud until the initial cloud load completes successfully.
    if (!hasLoadedCloudData.current) {
      console.log("Ngăn chặn ghi đè: Dữ liệu đám mây chưa được tải xong.");
      return;
    }

    try {
      const docRef = doc(db, 'sync_sessions', codeToUse);
      await setDoc(docRef, {
        tasks: currentTasks,
        dailyTargetGoal: currentTargetGoal,
        manualPerformanceRating: currentManualRating,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error("Error saving data to cloud:", e);
    }
  };

  // Real-time Firestore Sync Effect (Google Account Only)
  useEffect(() => {
    hasLoadedCloudData.current = false;

    if (!user) {
      setSyncStatus('idle');
      setSyncMessage('');
      hasLoadedCloudData.current = true; // Allow local offline modifications to save locally
      return;
    }

    const activeKey = `USER-${user.uid}`;
    setSyncStatus('loading');
    setSyncMessage('Đang đồng bộ với tài khoản Google...');
    
    const docRef = doc(db, 'sync_sessions', activeKey);
    
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        isSyncingFromCloud.current = true;
        
        if (data.tasks) {
          setTasks(data.tasks);
          localStorage.setItem('daily_todos', JSON.stringify(data.tasks));
        }
        if (data.dailyTargetGoal !== undefined) {
          setDailyTargetGoal(data.dailyTargetGoal);
          localStorage.setItem('daily_target_goal', String(data.dailyTargetGoal));
        }
        if (data.manualPerformanceRating !== undefined) {
          setManualPerformanceRating(data.manualPerformanceRating);
          localStorage.setItem('manual_performance_rating', JSON.stringify(data.manualPerformanceRating));
        }
        
        isSyncingFromCloud.current = false;
        hasLoadedCloudData.current = true; // Mark as successfully loaded from cloud
        setSyncStatus('connected');
        setSyncMessage(`Đồng bộ thành công qua tài khoản Google: ${user.email}`);
      } else {
        // Create the session in firestore if it doesn't exist yet
        setSyncStatus('connected');
        hasLoadedCloudData.current = true; // Allow saving from now on
        saveDataToCloud(tasks, dailyTargetGoal, manualPerformanceRating, activeKey);
        setSyncMessage(`Đã tạo tài khoản đồng bộ: ${user.email}`);
      }
    }, (error) => {
      console.error("Firestore sync error:", error);
      setSyncStatus('error');
      setSyncMessage("Lỗi kết nối đồng bộ đám mây.");
    });

    return () => unsubscribe();
  }, [user]);

  // Save tasks on modification
  const saveTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    localStorage.setItem('daily_todos', JSON.stringify(newTasks));
    saveDataToCloud(newTasks, dailyTargetGoal, manualPerformanceRating);
  };

  // Handle updates from Stats Component
  const handleUpdateDailyTargetGoal = (goal: number) => {
    setDailyTargetGoal(goal);
    localStorage.setItem('daily_target_goal', String(goal));
    saveDataToCloud(tasks, goal, manualPerformanceRating);
  };

  const handleUpdateManualPerformanceRating = (rating: number | null) => {
    setManualPerformanceRating(rating);
    localStorage.setItem('manual_performance_rating', JSON.stringify(rating));
    saveDataToCloud(tasks, dailyTargetGoal, rating);
  };

  // Live Clock effect (ticks every second)
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Format real-time clock in Vietnamese
  const formatLiveClock = (date: Date) => {
    const daysOfWeek = [
      'Chủ Nhật',
      'Thứ Hai',
      'Thứ Ba',
      'Thứ Tư',
      'Thứ Năm',
      'Thứ Sáu',
      'Thứ Bảy',
    ];
    const dayName = daysOfWeek[date.getDay()];
    const timeStr = date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const dateStr = date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return `${dayName}, ${dateStr} - ${timeStr}`;
  };

  // ----------------------------------------------------
  // Real-Time Alarm / Reminder Engine (Ticks every 4 seconds)
  // ----------------------------------------------------
  useEffect(() => {
    const alarmInterval = setInterval(() => {
      const nowMs = Date.now();
      const now = new Date();
      let tasksUpdated = false;
      const updatedTasks = tasks.map((task) => {
        if (task.completed) return task;

        // 1. Check if snooze trigger time reached
        const snoozeTarget = snoozedReminders[task.id];
        if (snoozeTarget && nowMs >= snoozeTarget) {
          // Trigger snoozed alarm!
          const newNotif: ReminderNotification = {
            id: `notif-snooze-${Date.now()}-${task.id}`,
            taskId: task.id,
            taskTitle: `[Nhắc lại] ${task.title}`,
            triggeredAt: now.toISOString(),
            deadline: task.deadline,
            priority: task.priority,
            dismissed: false,
          };

          // Remove task from active snooze
          const nextSnoozes = { ...snoozedReminders };
          delete nextSnoozes[task.id];
          setSnoozedReminders(nextSnoozes);
          localStorage.setItem('daily_snoozes', JSON.stringify(nextSnoozes));

          // Save new notification
          setNotifications((prev) => {
            const list = [...prev, newNotif];
            localStorage.setItem('daily_notifications', JSON.stringify(list));
            return list;
          });

          return task;
        }

        // 2. Standard Alarm calculation
        if (task.reminderTriggered || task.reminderOption === 'none') {
          return task;
        }

        const deadlineDate = new Date(task.deadline);
        let subtractMs = 0;
        switch (task.reminderOption) {
          case 'at_deadline':
            subtractMs = 0;
            break;
          case '5_mins':
            subtractMs = 5 * 60 * 1000;
            break;
          case '15_mins':
            subtractMs = 15 * 60 * 1000;
            break;
          case '30_mins':
            subtractMs = 30 * 60 * 1000;
            break;
          case '1_hour':
            subtractMs = 60 * 60 * 1000;
            break;
          default:
            return task;
        }

        const triggerThreshold = deadlineDate.getTime() - subtractMs;

        if (nowMs >= triggerThreshold) {
          // Trigger alarm!
          const newNotif: ReminderNotification = {
            id: `notif-standard-${Date.now()}-${task.id}`,
            taskId: task.id,
            taskTitle: task.title,
            triggeredAt: now.toISOString(),
            deadline: task.deadline,
            priority: task.priority,
            dismissed: false,
          };

          setNotifications((prev) => {
            const list = [...prev, newNotif];
            localStorage.setItem('daily_notifications', JSON.stringify(list));
            return list;
          });

          tasksUpdated = true;
          return {
            ...task,
            reminderTriggered: true,
          };
        }

        return task;
      });

      if (tasksUpdated) {
        saveTasks(updatedTasks);
      }
    }, 4000);

    return () => clearInterval(alarmInterval);
  }, [tasks, snoozedReminders]);

  // ----------------------------------------------------
  // Task Actions
  // ----------------------------------------------------
  const handleAddOrEditTask = (taskData: Omit<Task, 'id' | 'completed' | 'reminderTriggered' | 'createdAt'>) => {
    if (editingTask) {
      // Edit mode
      const updated = tasks.map((t) => {
        if (t.id === editingTask.id) {
          return {
            ...t,
            ...taskData,
            // Reset alarm triggering states if deadline or option changed
            reminderTriggered: 
              t.deadline !== taskData.deadline || t.reminderOption !== taskData.reminderOption 
                ? false 
                : t.reminderTriggered,
          };
        }
        return t;
      });
      saveTasks(updated);
      setEditingTask(null);
    } else {
      // Create mode
      const newTask: Task = {
        id: `task-${Date.now()}`,
        ...taskData,
        completed: false,
        reminderTriggered: false,
        createdAt: new Date().toISOString(),
      };
      saveTasks([newTask, ...tasks]);
    }
    setShowMobileForm(false);
  };

  const handleToggleComplete = (id: string) => {
    let spawnedTask: Task | null = null;
    
    const updated = tasks.map((t) => {
      if (t.id === id) {
        const nextCompleted = !t.completed;
        
        // Spawn next recurrence task if completing a repeating task
        if (nextCompleted && t.recurrence && t.recurrence !== TaskRecurrence.NONE && !t.recurrenceSpawned) {
          const nextDeadlineStr = getNextDeadline(t.deadline, t.recurrence, {
            daysOfWeek: t.recurrenceDaysOfWeek,
            dayOfMonth: t.recurrenceDayOfMonth,
            monthOfYear: t.recurrenceMonthOfYear,
          });
          const nextStartDateStr = getNextStartDate(t.startDate, t.deadline, nextDeadlineStr);
          
          spawnedTask = {
            id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            title: t.title,
            description: t.description,
            priority: t.priority,
            category: t.category,
            deadline: nextDeadlineStr,
            startDate: nextStartDateStr,
            reminderOption: t.reminderOption,
            recurrence: t.recurrence,
            recurrenceDaysOfWeek: t.recurrenceDaysOfWeek,
            recurrenceDayOfMonth: t.recurrenceDayOfMonth,
            recurrenceMonthOfYear: t.recurrenceMonthOfYear,
            completed: false,
            reminderTriggered: false,
            createdAt: new Date().toISOString(),
          };
        }

        return {
          ...t,
          completed: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : undefined,
          // Reset reminder status if uncompleted
          reminderTriggered: nextCompleted ? t.reminderTriggered : false,
          // Track recurrence spawning state
          recurrenceSpawned: nextCompleted ? true : false,
        };
      }
      return t;
    });

    if (spawnedTask) {
      saveTasks([spawnedTask, ...updated]);
    } else {
      saveTasks(updated);
    }

    // If completed, dismiss active snoozes and notifications for this task
    const activeTaskNotifications = notifications.filter((n) => n.taskId === id && !n.dismissed);
    if (activeTaskNotifications.length > 0) {
      const nextNotifs = notifications.map((n) => {
        if (n.taskId === id) {
          return { ...n, dismissed: true };
        }
        return n;
      });
      setNotifications(nextNotifs);
      localStorage.setItem('daily_notifications', JSON.stringify(nextNotifs));
    }

    if (snoozedReminders[id]) {
      const nextSnoozes = { ...snoozedReminders };
      delete nextSnoozes[id];
      setSnoozedReminders(nextSnoozes);
      localStorage.setItem('daily_snoozes', JSON.stringify(nextSnoozes));
    }
  };

  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    saveTasks(updated);

    // Also clean up editing states or reminders
    if (editingTask?.id === id) {
      setEditingTask(null);
    }

    if (snoozedReminders[id]) {
      const nextSnoozes = { ...snoozedReminders };
      delete nextSnoozes[id];
      setSnoozedReminders(nextSnoozes);
      localStorage.setItem('daily_snoozes', JSON.stringify(nextSnoozes));
    }
  };

  const handleStartEdit = (task: Task) => {
    setEditingTask(task);
    setShowMobileForm(true); // Open drawer on mobile
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
    setShowMobileForm(false);
  };

  // ----------------------------------------------------
  // Notification Actions
  // ----------------------------------------------------
  const handleDismissNotification = (notifId: string) => {
    const nextNotifs = notifications.map((n) => {
      if (n.id === notifId) {
        return { ...n, dismissed: true };
      }
      return n;
    });
    setNotifications(nextNotifs);
    localStorage.setItem('daily_notifications', JSON.stringify(nextNotifs));
  };

  const handleSnoozeNotification = (notifId: string, taskId: string) => {
    // Dismiss active notification modal
    handleDismissNotification(notifId);

    // Schedule next trigger time: 5 minutes from now
    const nextTriggerTime = Date.now() + 5 * 60 * 1000;
    const nextSnoozes = {
      ...snoozedReminders,
      [taskId]: nextTriggerTime,
    };
    setSnoozedReminders(nextSnoozes);
    localStorage.setItem('daily_snoozes', JSON.stringify(nextSnoozes));
  };

  const clearAllNotificationsHistory = () => {
    setNotifications([]);
    localStorage.removeItem('daily_notifications');
  };

  const resetAllDataToDefault = () => {
    if (window.confirm('Bạn có chắc chắn muốn đặt lại tất cả dữ liệu về mặc định?')) {
      const defaults = getSampleTasks();
      saveTasks(defaults);
      setNotifications([]);
      localStorage.removeItem('daily_notifications');
      setSnoozedReminders({});
      localStorage.removeItem('daily_snoozes');
      setEditingTask(null);
    }
  };

  // ----------------------------------------------------
  // Filtering & Sorting Logic
  // ----------------------------------------------------
  const hiddenFutureCount = tasks.filter((task) => {
    const isFuture = !task.completed && task.startDate && new Date(task.startDate) > currentTime;
    return isFuture;
  }).length;

  const filteredTasks = tasks.filter((task) => {
    // 0. Hide future tasks unless toggle is enabled
    if (!showFutureTasks && !task.completed && task.startDate && new Date(task.startDate) > currentTime) {
      return false;
    }

    // 1. Search Query
    const matchesSearch = 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());

    // 2. Category
    const matchesCategory = selectedCategory === 'ALL' || task.category === selectedCategory;

    // 3. Tab (Status)
    let matchesTab = true;
    if (activeTab === 'ACTIVE') {
      matchesTab = !task.completed;
    } else if (activeTab === 'COMPLETED') {
      matchesTab = task.completed;
    } else if (activeTab === 'OVERDUE') {
      const deadlineDate = new Date(task.deadline);
      matchesTab = !task.completed && deadlineDate < currentTime;
    }

    return matchesSearch && matchesCategory && matchesTab;
  });

  // Sorting
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'DEADLINE_ASC') {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }
    if (sortBy === 'DEADLINE_DESC') {
      return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
    }
    if (sortBy === 'PRIORITY_DESC') {
      const priorityWeights = { [TaskPriority.HIGH]: 3, [TaskPriority.MEDIUM]: 2, [TaskPriority.LOW]: 1 };
      return priorityWeights[b.priority] - priorityWeights[a.priority];
    }
    if (sortBy === 'CREATED_DESC') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return 0;
  });

  // Grouping tasks by day: Hôm nay, Ngày mai, Sau đó, Đã hoàn thành trước đây
  const groupTasksByDay = (tasksList: Task[], refDate: Date) => {
    const startOfToday = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
    
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    
    const startOfAfterTomorrow = new Date(startOfTomorrow);
    startOfAfterTomorrow.setDate(startOfAfterTomorrow.getDate() + 1);

    const isToday = (dateString: string | undefined) => {
      if (!dateString) return false;
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return false;
      return (
        d.getFullYear() === refDate.getFullYear() &&
        d.getMonth() === refDate.getMonth() &&
        d.getDate() === refDate.getDate()
      );
    };

    const todayTasks: Task[] = [];
    const tomorrowTasks: Task[] = [];
    const laterTasks: Task[] = [];
    const completedBeforeTodayTasks: Task[] = [];

    tasksList.forEach(task => {
      if (task.completed) {
        if (task.completedAt) {
          if (isToday(task.completedAt)) {
            todayTasks.push(task);
          } else {
            const completedDate = new Date(task.completedAt);
            if (!isNaN(completedDate.getTime()) && completedDate < startOfToday) {
              completedBeforeTodayTasks.push(task);
            } else {
              todayTasks.push(task);
            }
          }
        } else {
          completedBeforeTodayTasks.push(task);
        }
        return;
      }

      const taskDate = new Date(task.deadline);
      if (isNaN(taskDate.getTime())) {
        laterTasks.push(task);
      } else if (isToday(task.deadline)) {
        todayTasks.push(task);
      } else if (taskDate < startOfToday) {
        todayTasks.push(task); // Overdue & uncompleted -> Hôm nay & Quá hạn
      } else if (taskDate < startOfAfterTomorrow) {
        tomorrowTasks.push(task);
      } else {
        laterTasks.push(task);
      }
    });

    return { todayTasks, tomorrowTasks, laterTasks, completedBeforeTodayTasks };
  };

  const { todayTasks, tomorrowTasks, laterTasks, completedBeforeTodayTasks } = groupTasksByDay(sortedTasks, currentTime);

  return (
    <div id="app-root" className="min-h-screen bg-[#09090b] text-zinc-100 antialiased font-sans flex flex-col selection:bg-indigo-500/20">
      
      {/* Dynamic Alarm Modal Overlay */}
      <NotificationModal
        notifications={notifications}
        onDismiss={handleDismissNotification}
        onSnooze={handleSnoozeNotification}
        onCompleteTask={handleToggleComplete}
      />

      {/* Main Container */}
      <main className="grow w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header bar */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-zinc-900 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]">
              <CheckSquare size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-wider text-white uppercase font-mono">
                Daily Flow
              </h1>
              <p className="text-xs text-zinc-500 font-semibold">
                Tổ chức cuộc sống, hoàn thành mục tiêu ngày hiệu quả
              </p>
            </div>
          </div>

          {/* Live digital clock */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 py-1.5 px-3 rounded-2xl shadow-sm self-start md:self-auto">
            <Clock size={14} className="text-indigo-400 animate-pulse" />
            <span className="text-xs font-bold font-mono text-zinc-300">
              {formatLiveClock(currentTime)}
            </span>
          </div>
        </header>

        {/* Stats Dashboard */}
        <TaskStats 
          tasks={tasks}
          dailyTargetGoal={dailyTargetGoal}
          onUpdateDailyTargetGoal={handleUpdateDailyTargetGoal}
          manualPerformanceRating={manualPerformanceRating}
          onUpdateManualPerformanceRating={handleUpdateManualPerformanceRating}
        />

        {/* Real-time Cloud Sync Panel */}
        <div id="cloud-sync-panel" className="bg-zinc-900/50 border border-zinc-800 rounded-[28px] p-6 shadow-lg text-zinc-100 space-y-4">
          
          {/* Google Sync */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950/40 border border-zinc-850/50 p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              {user ? (
                user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    className="h-10 w-10 rounded-full border border-indigo-500/30"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-10 w-10 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center border border-indigo-500/15">
                    <UserIcon size={20} />
                  </div>
                )
              ) : (
                <div className="h-10 w-10 bg-zinc-800/30 text-zinc-400 rounded-full flex items-center justify-center border border-zinc-700/20">
                  <UserIcon size={20} />
                </div>
              )}
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  Đồng bộ đám mây bằng tài khoản Google
                  {user && (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.2 rounded-md">
                      ACTIVE
                    </span>
                  )}
                </h4>
                <p className="text-xs text-zinc-400">
                  {user ? user.email : "Sao lưu dữ liệu tự động, khôi phục từ bất kỳ thiết bị nào khi đăng nhập Google"}
                </p>
              </div>
            </div>
            
            <div>
              {user ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  <LogOut size={13} />
                  Đăng xuất
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-950 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-white/5 active:scale-95"
                >
                  <svg className="w-3.5 h-3.5 mr-0.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.1.14-.14 1.14-.85 1.49-2.12 2.5-3.67 3l.01-.01v2.51h6.41c3.75-3.46 5.44-8.55 5.44-10.49z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-6.41-2.51c-.8.53-1.85.86-3.13.86-2.42 0-4.47-1.63-5.2-3.86H.79v2.59C2.77 20.08 7.07 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M6.8 15.58a7.14 7.14 0 0 1 0-4.57V8.42H.79a11.94 11.94 0 0 0 0 10.34l6.01-3.18z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.96 1.19 15.24 0 12 0 7.07 0 2.77 3.92.79 7.83l6.01 3.18c.73-2.23 2.78-3.86 5.2-3.86z"
                    />
                  </svg>
                  Đăng nhập Google
                </button>
              )}
            </div>
          </div>
          
          {syncMessage && (
            <div className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded-xl border ${
              syncStatus === 'error' 
                ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              <span className="font-medium">{syncMessage}</span>
            </div>
          )}
        </div>

        {/* Workspace Body Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Interactive Form & Utilities (span 4) */}
          <div className="hidden lg:block lg:col-span-4 space-y-5">
            <TaskForm 
              onSubmit={handleAddOrEditTask} 
              editingTask={editingTask}
              onCancelEdit={handleCancelEdit}
            />

            {/* Quick Actions Panel */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-[28px] p-5 shadow-lg text-zinc-100 space-y-3">
              <h4 className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
                Thao tác nhanh
              </h4>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={resetAllDataToDefault}
                  className="w-full text-left text-xs text-zinc-400 hover:text-red-400 font-semibold flex items-center gap-2 p-2.5 hover:bg-zinc-950 border border-transparent hover:border-zinc-850 rounded-xl transition-all cursor-pointer"
                >
                  <RefreshCw size={14} />
                  <span>Đặt lại toàn bộ dữ liệu mẫu</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Search, Filters, Task List (span 8) */}
          <div className="col-span-1 lg:col-span-8 space-y-4">
            
            {/* Filters Bar */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-[28px] p-5 shadow-lg text-zinc-100 space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                
                {/* Search */}
                <div className="relative grow">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm công việc theo từ khóa..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl pl-10 pr-3 py-2 text-sm text-white placeholder-zinc-500 transition-all outline-hidden"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-0.5 hover:bg-zinc-850 rounded-full transition-colors cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Sort Option dropdown */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-zinc-500 hidden sm:inline">Sắp xếp:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-zinc-950 border border-zinc-800 focus:border-indigo-500 text-xs text-zinc-300 font-semibold px-3 py-2 rounded-xl outline-hidden cursor-pointer"
                  >
                    <option value="DEADLINE_ASC">Hạn chót tăng dần</option>
                    <option value="DEADLINE_DESC">Hạn chót giảm dần</option>
                    <option value="PRIORITY_DESC">Độ ưu tiên: Cao trước</option>
                    <option value="CREATED_DESC">Mới tạo trước</option>
                  </select>
                </div>
              </div>

              {/* Category selector row */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-2 px-2 border-t border-zinc-800/60 pt-3 scrollbar-none">
                <span className="text-xs font-semibold text-zinc-500 shrink-0">Phân loại:</span>
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategory === 'ALL'
                      ? 'bg-zinc-100 text-zinc-950 border-white font-bold'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                  }`}
                >
                  Tất cả
                </button>
                {Object.entries(CATEGORY_DETAILS).map(([cat, details]) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm font-semibold'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                      }`}
                    >
                      {details.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status Tabs selector */}
            <div className="flex items-center border-b border-zinc-800/80 pb-px gap-1">
              {[
                { id: 'ALL', label: 'Tất cả việc' },
                { id: 'ACTIVE', label: 'Chưa xong' },
                { id: 'COMPLETED', label: 'Đã hoàn thành' },
                { id: 'OVERDUE', label: 'Quá hạn chót' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                let count = 0;
                if (tab.id === 'ALL') count = tasks.length;
                else if (tab.id === 'ACTIVE') count = tasks.filter((t) => !t.completed).length;
                else if (tab.id === 'COMPLETED') count = tasks.filter((t) => t.completed).length;
                else if (tab.id === 'OVERDUE') {
                  count = tasks.filter((t) => !t.completed && new Date(t.deadline) < currentTime).length;
                }

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`relative py-2.5 px-3 text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isActive 
                        ? 'text-indigo-400 border-b-2 border-indigo-400 font-bold' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`ml-1.5 px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold border ${
                      isActive 
                        ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20' 
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Future Tasks Notification & Toggle */}
            {hiddenFutureCount > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-indigo-950/20 border border-indigo-900/30 rounded-[20px] text-xs text-indigo-300">
                <div className="flex items-center gap-2">
                  <Eye size={16} className="animate-pulse text-indigo-400 shrink-0" />
                  <span>Đang ẩn <strong>{hiddenFutureCount}</strong> công việc chưa đến ngày thực hiện để tránh làm trước.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFutureTasks(!showFutureTasks)}
                  className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/30 rounded-xl transition-all cursor-pointer font-bold flex items-center gap-1.5 shrink-0 self-end sm:self-auto"
                >
                  {showFutureTasks ? <EyeOff size={14} /> : <Eye size={14} />}
                  {showFutureTasks ? 'Ẩn đi' : 'Hiển thị'}
                </button>
              </div>
            )}

            {showFutureTasks && hiddenFutureCount === 0 && (
              <div className="flex items-center justify-between p-4 bg-zinc-900/30 border border-zinc-800 rounded-[20px] text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <Eye size={16} className="text-zinc-500 shrink-0" />
                  <span>Chế độ hiển thị việc tương lai đang bật, nhưng không có công việc nào bị ẩn.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFutureTasks(false)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/50 rounded-xl transition-all cursor-pointer font-semibold shrink-0"
                >
                  Tắt
                </button>
              </div>
            )}

            {/* Tasks Feed Grouped by Day */}
            <div id="tasks-feed-list" className="space-y-6 min-h-[300px]">
              {sortedTasks.length > 0 ? (
                <div className="space-y-6">
                  {/* Today Group */}
                  {todayTasks.length > 0 && (
                    <div id="group-today" className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
                        <div className="p-1 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/15">
                          <Sun size={14} className="animate-[spin_8s_linear_infinite]" />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                          Hôm nay & Quá hạn
                        </h4>
                        <span className="text-[10px] bg-amber-500/15 border border-amber-500/20 text-amber-400 rounded-full px-2 font-bold font-mono">
                          {todayTasks.length}
                        </span>
                      </div>
                      <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                          {todayTasks.map((task) => (
                            <TaskItem
                              key={task.id}
                              task={task}
                              onToggleComplete={handleToggleComplete}
                              onDelete={handleDeleteTask}
                              onEdit={handleStartEdit}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {/* Tomorrow Group */}
                  {tomorrowTasks.length > 0 && (
                    <div id="group-tomorrow" className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
                        <div className="p-1 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/15">
                          <Calendar size={14} />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400">
                          Ngày mai
                        </h4>
                        <span className="text-[10px] bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 rounded-full px-2 font-bold font-mono">
                          {tomorrowTasks.length}
                        </span>
                      </div>
                      <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                          {tomorrowTasks.map((task) => (
                            <TaskItem
                              key={task.id}
                              task={task}
                              onToggleComplete={handleToggleComplete}
                              onDelete={handleDeleteTask}
                              onEdit={handleStartEdit}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {/* Later Group */}
                  {laterTasks.length > 0 && (
                    <div id="group-later" className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
                        <div className="p-1 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/15">
                          <CalendarDays size={14} />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                          Sau đó
                        </h4>
                        <span className="text-[10px] bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 rounded-full px-2 font-bold font-mono">
                          {laterTasks.length}
                        </span>
                      </div>
                      <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                          {laterTasks.map((task) => (
                            <TaskItem
                              key={task.id}
                              task={task}
                              onToggleComplete={handleToggleComplete}
                              onDelete={handleDeleteTask}
                              onEdit={handleStartEdit}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {/* Completed Before Today Group */}
                  {completedBeforeTodayTasks.length > 0 && (
                    <div id="group-completed-before" className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
                        <div className="p-1 bg-zinc-500/10 text-zinc-400 rounded-lg border border-zinc-800/15">
                          <CheckCircle2 size={14} />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400">
                          Đã hoàn thành trước đây
                        </h4>
                        <span className="text-[10px] bg-zinc-500/15 border border-zinc-800/20 text-zinc-400 rounded-full px-2 font-bold font-mono">
                          {completedBeforeTodayTasks.length}
                        </span>
                      </div>
                      <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                          {completedBeforeTodayTasks.map((task) => (
                            <TaskItem
                              key={task.id}
                              task={task}
                              onToggleComplete={handleToggleComplete}
                              onDelete={handleDeleteTask}
                              onEdit={handleStartEdit}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-16 bg-zinc-900/30 border border-zinc-850 rounded-3xl p-6 text-center"
                  >
                    <div className="h-14 w-14 bg-zinc-950 rounded-2xl flex items-center justify-center text-zinc-500 mb-4 border border-zinc-800/50">
                      <CheckSquare size={26} className="stroke-[1.5]" />
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-300 mb-1">
                      Không tìm thấy công việc nào
                    </h3>
                    <p className="text-xs text-zinc-500 max-w-sm">
                      {searchQuery 
                        ? 'Thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc để tìm kiếm rộng hơn.' 
                        : 'Bắt đầu thêm một công việc mới ở khung bên trái hoặc nhấn nạp dữ liệu mẫu.'}
                    </p>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Sticky Add Button & Floating Form Drawer */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => {
            if (editingTask) {
              handleCancelEdit();
            } else {
              setShowMobileForm(true);
            }
          }}
          className="p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-600/20 flex items-center justify-center cursor-pointer transition-transform duration-150 active:scale-95"
        >
          <Plus size={24} className="stroke-[2.5]" />
        </button>
      </div>

      {/* Mobile Form Drawer Backdrop */}
      <AnimatePresence>
        {showMobileForm && (
          <div className="lg:hidden fixed inset-0 bg-zinc-950/60 backdrop-blur-md z-50 flex items-end justify-center">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-zinc-900 border-t border-zinc-800 w-full rounded-t-[32px] max-h-[90vh] overflow-y-auto shadow-2xl pb-8"
            >
              <div className="sticky top-0 bg-zinc-900 z-10 py-3 flex justify-center border-b border-zinc-800/50">
                <div className="w-12 h-1.5 bg-zinc-800 rounded-full" onClick={() => setShowMobileForm(false)} />
              </div>
              <div className="px-5 pt-2">
                <TaskForm
                  onSubmit={handleAddOrEditTask}
                  editingTask={editingTask}
                  onCancelEdit={handleCancelEdit}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
