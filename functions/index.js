import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';

import App from './App';
import { name as appName } from './app.json';


messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('📩 Background FCM message:', remoteMessage);
});



notifee.onBackgroundEvent(async ({ type, detail }) => {
  // You can handle notification actions here later
});


AppRegistry.registerComponent(appName, () => App);
