/**
 * @format
 */

import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { ThemeProvider } from '@/contexts/ThemeContext';
import RootNavigator from '@/navigation/RootNavigator';
import { flushPendingNavigation, navigationRef } from '@/navigation/navigationRef';
import { persistor, store } from '@/store';
import {
  consumePatrolInitialNotification,
  registerPatrolNotificationForegroundHandler,
} from '@/utils/patrolNotification';
import {
  consumeAlertInitialNotification,
  registerAlertNotificationForegroundHandler,
} from '@/utils/pushNotifications';

function App() {
  useEffect(() => {
    const unsubscribePatrol = registerPatrolNotificationForegroundHandler();
    const unsubscribeAlert = registerAlertNotificationForegroundHandler();
    consumePatrolInitialNotification();
    consumeAlertInitialNotification();
    return () => {
      unsubscribePatrol();
      unsubscribeAlert();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <ThemeProvider>
            <StatusBar barStyle="dark-content" />
            <NavigationContainer ref={navigationRef} onReady={flushPendingNavigation}>
              <RootNavigator />
            </NavigationContainer>
          </ThemeProvider>
        </PersistGate>
      </Provider>
    </SafeAreaProvider>
  );
}

export default App;
