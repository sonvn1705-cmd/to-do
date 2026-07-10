import { Task, TaskCategory, TaskPriority, TaskRecurrence } from '../types';

export const getSampleTasks = (): Task[] => [
  {
    id: 'task-1',
    title: 'Họp khởi động dự án mới',
    description: 'Họp với phòng ban đối tác để thống nhất kế hoạch triển khai, phân chia công việc và xác định mốc quan trọng.',
    priority: TaskPriority.HIGH,
    category: TaskCategory.WORK,
    deadline: '2026-07-09T09:30', // Due today at 9:30 AM (current time is 7:10 AM)
    reminderOption: '15_mins',
    completed: false,
    reminderTriggered: false,
    createdAt: '2026-07-09T06:00',
  },
  {
    id: 'task-2',
    title: 'Nộp báo cáo tài chính tháng 6',
    description: 'Kiểm tra kỹ số liệu doanh thu và chi phí, ký duyệt và gửi cho Giám đốc Tài chính trước cuộc họp chiều.',
    priority: TaskPriority.HIGH,
    category: TaskCategory.WORK,
    deadline: '2026-07-09T06:00', // Overdue (due today at 6:00 AM)
    reminderOption: 'at_deadline',
    completed: false,
    reminderTriggered: false,
    createdAt: '2026-07-08T09:00',
  },
  {
    id: 'task-3',
    title: 'Mua quà sinh nhật cho mẹ',
    description: 'Ghé qua cửa hàng hoa hoặc trung tâm thương mại để chọn món quà ý nghĩa gửi tặng mẹ.',
    priority: TaskPriority.MEDIUM,
    category: TaskCategory.PERSONAL,
    deadline: '2026-07-09T18:00', // Today at 6:00 PM
    reminderOption: '1_hour',
    completed: false,
    reminderTriggered: false,
    createdAt: '2026-07-09T07:00',
  },
  {
    id: 'task-4',
    title: 'Học lập trình React & Tailwind',
    description: 'Hoàn thành chương 4 về Hook nâng cao (useMemo, useCallback) và dựng giao diện mẫu.',
    priority: TaskPriority.MEDIUM,
    category: TaskCategory.LEARNING,
    deadline: '2026-07-10T21:00', // Tomorrow
    reminderOption: '30_mins',
    recurrence: TaskRecurrence.WEEKLY,
    completed: false,
    reminderTriggered: false,
    createdAt: '2026-07-09T05:00',
  },
  {
    id: 'task-5',
    title: 'Chạy bộ 5km công viên',
    description: 'Tập luyện nâng cao sức bền vào cuối ngày. Đừng quên mang theo bình nước lọc.',
    priority: TaskPriority.LOW,
    category: TaskCategory.HEALTH,
    deadline: '2026-07-09T17:30', // Today at 5:30 PM
    reminderOption: 'none',
    recurrence: TaskRecurrence.DAILY,
    completed: true,
    completedAt: '2026-07-09T07:05',
    reminderTriggered: false,
    createdAt: '2026-07-09T06:30',
  }
];
