/**
 * @format
 */

import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { ThemeProvider } from '@/contexts/ThemeContext';
import RootNavigator from '@/navigation/RootNavigator';
import { persistor, store } from '@/store';

function App() {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <ThemeProvider>
            <StatusBar barStyle="dark-content" />
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </ThemeProvider>
        </PersistGate>
      </Provider>
    </SafeAreaProvider>
  );
}

export default App;
