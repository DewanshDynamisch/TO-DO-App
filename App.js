import React, { useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import messaging from '@react-native-firebase/messaging';

import TodoScreen from './src/screens/TodoScreen';
import { store } from './src/redux/store';
import { createNotificationChannel } from './src/utils/notificationService';

export default function App() {
  useEffect(() => {
    const initNotifications = async () => {
      console.log(' Initializing notifications');

      await createNotificationChannel();

      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );

        console.log(' Notification permission:', result);
      }

      await messaging().requestPermission();
    };

    initNotifications();
  }, []);

  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <TodoScreen />
      </GestureHandlerRootView>
    </Provider>
  );
}
