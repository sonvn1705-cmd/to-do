import { TaskRecurrence } from '../types';

export function formatToLocalDatetimeString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function getNextDeadline(
  deadlineStr: string,
  recurrence: TaskRecurrence,
  options?: {
    daysOfWeek?: number[];
    dayOfMonth?: number;
    monthOfYear?: number;
  }
): string {
  const date = new Date(deadlineStr);
  if (isNaN(date.getTime())) {
    return deadlineStr;
  }
  
  switch (recurrence) {
    case TaskRecurrence.DAILY: {
      date.setDate(date.getDate() + 1);
      break;
    }
    case TaskRecurrence.WEEKLY: {
      if (options?.daysOfWeek && options.daysOfWeek.length > 0) {
        // Find the next day of the week that is strictly after the current date
        const sortedDays = [...options.daysOfWeek].sort((a, b) => a - b);
        let found = false;
        
        // Check next 7 days
        for (let i = 1; i <= 7; i++) {
          const testDate = new Date(date);
          testDate.setDate(testDate.getDate() + i);
          const dayOfWeek = testDate.getDay(); // 0 is Sunday, 1 is Monday, etc.
          if (sortedDays.includes(dayOfWeek)) {
            date.setDate(date.getDate() + i);
            found = true;
            break;
          }
        }
        if (!found) {
          date.setDate(date.getDate() + 7);
        }
      } else {
        date.setDate(date.getDate() + 7);
      }
      break;
    }
    case TaskRecurrence.MONTHLY: {
      if (options?.dayOfMonth !== undefined) {
        const targetDay = options.dayOfMonth;
        date.setDate(1); // avoid month overflow
        date.setMonth(date.getMonth() + 1);
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        date.setDate(Math.min(targetDay, lastDay));
      } else {
        date.setMonth(date.getMonth() + 1);
      }
      break;
    }
    case TaskRecurrence.YEARLY: {
      if (options?.monthOfYear !== undefined && options?.dayOfMonth !== undefined) {
        const targetMonth = options.monthOfYear;
        const targetDay = options.dayOfMonth;
        date.setDate(1); // avoid month overflow
        date.setFullYear(date.getFullYear() + 1);
        date.setMonth(targetMonth);
        const lastDay = new Date(date.getFullYear(), targetMonth + 1, 0).getDate();
        date.setDate(Math.min(targetDay, lastDay));
      } else {
        date.setFullYear(date.getFullYear() + 1);
      }
      break;
    }
    default:
      break;
  }
  
  return formatToLocalDatetimeString(date);
}

/**
 * Calculates the next start date based on the duration difference between the old start date and the old deadline,
 * keeping the exact same duration for the newly spawned task.
 */
export function getNextStartDate(
  oldStartDateStr: string | undefined,
  oldDeadlineStr: string,
  newDeadlineStr: string
): string | undefined {
  if (!oldStartDateStr) return undefined;
  
  const oldStart = new Date(oldStartDateStr);
  const oldDeadline = new Date(oldDeadlineStr);
  const newDeadline = new Date(newDeadlineStr);
  
  if (isNaN(oldStart.getTime()) || isNaN(oldDeadline.getTime()) || isNaN(newDeadline.getTime())) {
    return oldStartDateStr;
  }
  
  const durationMs = oldDeadline.getTime() - oldStart.getTime();
  if (durationMs <= 0) {
    const newStart = new Date(newDeadline.getTime() - 4 * 60 * 60 * 1000);
    return formatToLocalDatetimeString(newStart);
  }
  
  const newStart = new Date(newDeadline.getTime() - durationMs);
  return formatToLocalDatetimeString(newStart);
}
