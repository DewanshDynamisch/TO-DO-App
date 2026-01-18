import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';

import App from './App';
import { name as appName } from './app.json';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log(' Background FCM message received:', remoteMessage);
});


notifee.onBackgroundEvent(async ({ type, detail }) => {
  // Handle notification actions here later if needed
});

AppRegistry.registerComponent(appName, () => App);
