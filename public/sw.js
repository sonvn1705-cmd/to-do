const CACHE_NAME = 'todo-tasks-v1';
const TASKS_KEY = '/tasks.json';

// Helper function to save tasks to cache
async function saveTasksToCache(tasks) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(TASKS_KEY, new Response(JSON.stringify(tasks)));
  } catch (err) {
    console.error('SW: Error saving tasks to cache', err);
  }
}

// Helper function to get tasks from cache
async function getTasksFromCache() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(TASKS_KEY);
    if (response) {
      return await response.json();
    }
  } catch (err) {
    console.error('SW: Error getting tasks from cache', err);
  }
  return [];
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  startCheckingInterval();
});

self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'SET_TASKS') {
    await saveTasksToCache(event.data.tasks);
    startCheckingInterval();
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

let checkInterval = null;

function startCheckingInterval() {
  if (checkInterval) return;

  checkInterval = setInterval(async () => {
    const tasks = await getTasksFromCache();
    if (!tasks || tasks.length === 0) return;

    const now = Date.now();
    let tasksUpdated = false;

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      if (task.completed || task.reminderTriggered || task.reminderOption === 'none') {
        continue;
      }

      const deadlineTime = new Date(task.deadline).getTime();
      if (isNaN(deadlineTime)) continue;

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
          continue;
      }

      const triggerThreshold = deadlineTime - subtractMs;

      // Trigger notification if we have reached or passed the trigger time, but are within a reasonable 10-minute window
      if (now >= triggerThreshold && now <= deadlineTime + 10 * 60 * 1000) {
        task.reminderTriggered = true;
        tasksUpdated = true;

        // Show standard Web Notification in background
        self.registration.showNotification(task.title || 'Công việc sắp đến hạn', {
          body: `Công việc sắp đến hạn chót vào lúc ${new Date(task.deadline).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}!`,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: task.id,
          data: { taskId: task.id },
          vibrate: [200, 100, 200]
        });
      }
    }

    if (tasksUpdated) {
      await saveTasksToCache(tasks);
      
      // Notify any open clients/windows to synchronize their state with our updated reminderTriggered tasks
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        client.postMessage({ type: 'TASKS_UPDATED_FROM_BACKGROUND', tasks });
      });
    }
  }, 15000); // Check every 15 seconds for quick responsive background notifications
}
