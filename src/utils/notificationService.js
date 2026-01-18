import notifee, { AndroidImportance } from '@notifee/react-native';

/* CREATE CHANNEL */
export async function createNotificationChannel() {
  console.log('🔔 Creating notification channel');

  const channelId = await notifee.createChannel({
    id: 'task_channel',
    name: 'Task Notifications',
    importance: AndroidImportance.HIGH,
  });

  console.log('✅ Notification channel created:', channelId);
}

/* TASK ADDED */
export async function showTaskAddedNotification(title) {
  console.log('📣 Showing TASK ADDED notification');

  await notifee.displayNotification({
    title: 'Task Added',
    body: title || 'A new task was added',
    android: {
      channelId: 'task_channel',
      pressAction: { id: 'default' },
    },
  });
}

/* TASK UPDATED */
export async function showTaskUpdatedNotification(title) {
  console.log('📣 Showing TASK UPDATED notification');

  await notifee.displayNotification({
    title: 'Task Updated',
    body: title || 'Task updated successfully',
    android: {
      channelId: 'task_channel',
      pressAction: { id: 'default' },
    },
  });
}

/* TASK DELETED */
export async function showTaskDeletedNotification() {
  console.log('📣 Showing TASK DELETED notification');

  await notifee.displayNotification({
    title: 'Task Deleted',
    body: 'A task was removed',
    android: {
      channelId: 'task_channel',
      pressAction: { id: 'default' },
    },
  });
}
