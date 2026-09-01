import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore,
} from 'redux-persist';

import { apiSyncMiddleware } from '@/store/middleware/apiSyncMiddleware';
import announcementReducer from '@/store/slices/announcementSlice';
import authReducer from '@/store/slices/authSlice';
import notificationReducer from '@/store/slices/notificationSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  announcements: announcementReducer,
  notifications: notificationReducer,
});

const persistedReducer = persistReducer(
  {
    key: 'root',
    storage: AsyncStorage,
    // `announcements` & `notifications` selalu di-fetch dari server, tidak perlu dipersist.
    whitelist: ['auth'],
  },
  rootReducer,
);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE],
      },
    }).concat(apiSyncMiddleware),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
