import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import {
  getNotificationsApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from '@/services/api/notification.service';
import type { NotificationsParams } from '@/services/api/notification.service';
import type { AppNotification, NotificationListMeta } from '@/types';
import { extractErrorMessage } from '@/utils/format';

// GET /notifications + POST /notifications/{id}/read + /read-all. Dipakai lonceng header untuk
// SEMUA role (komandan & anggota) — tidak dipersist. Lihat API_CONTRACT.md §3.

interface NotificationState {
  items: AppNotification[];
  meta: NotificationListMeta | null;
  unreadTotal: number;
  status: 'idle' | 'loading' | 'error';
  error: string | null;
}

const initialState: NotificationState = {
  items: [],
  meta: null,
  unreadTotal: 0,
  status: 'idle',
  error: null,
};

interface FetchResult {
  items: AppNotification[];
  meta: NotificationListMeta | null;
  page: number;
}

export const fetchNotifications = createAsyncThunk<
  FetchResult,
  NotificationsParams | undefined,
  { rejectValue: string }
>('notifications/fetch', async (params, { rejectWithValue }) => {
  try {
    const page = params?.page ?? 1;
    const result = await getNotificationsApi({ ...params, page });
    return { items: result.items, meta: result.meta, page };
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, 'Gagal memuat notifikasi'));
  }
});

export const markNotificationRead = createAsyncThunk<
  { id: number | string; unreadTotal: number },
  number | string,
  { rejectValue: string }
>('notifications/markRead', async (id, { rejectWithValue }) => {
  try {
    const unreadTotal = await markNotificationReadApi(id);
    return { id, unreadTotal };
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, 'Gagal menandai notifikasi'));
  }
});

export const markAllNotificationsRead = createAsyncThunk<number, void, { rejectValue: string }>(
  'notifications/markAllRead',
  async (_, { rejectWithValue }) => {
    try {
      return await markAllNotificationsReadApi();
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Gagal menandai semua notifikasi'));
    }
  },
);

function countUnread(items: AppNotification[]): number {
  return items.filter(item => !item.read).length;
}

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchNotifications.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.status = 'idle';
        state.meta = action.payload.meta;
        if (action.payload.page <= 1) {
          state.items = action.payload.items;
        } else {
          const existing = new Set(state.items.map(item => item.id));
          state.items.push(...action.payload.items.filter(item => !existing.has(item.id)));
        }
        state.unreadTotal = action.payload.meta?.unread_total ?? countUnread(state.items);
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload ?? 'Gagal memuat notifikasi';
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const item = state.items.find(entry => entry.id === action.payload.id);
        if (item) item.read = true;
        state.unreadTotal = action.payload.unreadTotal;
      })
      .addCase(markAllNotificationsRead.fulfilled, (state, action) => {
        state.items.forEach(item => {
          item.read = true;
        });
        state.unreadTotal = action.payload;
      });
  },
});

export default notificationSlice.reducer;
