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

function App() {
  useEffect(() => {
    const unsubscribe = registerPatrolNotificationForegroundHandler();
    consumePatrolInitialNotification();
    return unsubscribe;
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
