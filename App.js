import React, { useEffect, useState } from 'react';
import {
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

import TodoScreen from './src/screens/TodoScreen';
import LoginScreen from './src/screens/LoginScreen';
import { store } from './src/redux/store';
import { createNotificationChannel } from './src/utils/notificationService';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      try {
        await createNotificationChannel();

        if (Platform.OS === 'android' && Platform.Version >= 33) {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
        }

        await messaging().requestPermission();

        const data = await AsyncStorage.getItem('USER_DATA');
        if (data) setUser(JSON.parse(data));
      } catch (error) {
        console.log('Init error:', error);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('USER_DATA');
    setUser(null);
  };

  if (loading) {
    return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  }

  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          {user ? (
            <TodoScreen user={user} onLogout={handleLogout} />
          ) : (
            <LoginScreen
              onLoginSuccess={async () => {
                const data = await AsyncStorage.getItem('USER_DATA');
                setUser(JSON.parse(data));
              }}
            />
          )}
        </SafeAreaView>
      </GestureHandlerRootView>
    </Provider>
  );
}
