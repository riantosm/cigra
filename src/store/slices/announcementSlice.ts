import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import {
  createAnnouncementApi,
  getAnnouncementsApi,
} from '@/services/api/announcement.service';
import type { AnnouncementsParams } from '@/services/api/announcement.service';
import type { Announcement, CreateAnnouncementPayload, PaginationMeta } from '@/types';
import { extractErrorMessage } from '@/utils/format';

// Sumber data: GET /announcements (list) + POST /announcements (kirim). Tidak lagi dipersist —
// selalu ambil dari server. Lihat documentation/API_CONTRACT.md §2.3/§2.4.

interface AnnouncementState {
  items: Announcement[];
  meta: PaginationMeta | null;
  status: 'idle' | 'loading' | 'error';
  error: string | null;
  sending: boolean;
  sendError: string | null;
}

const initialState: AnnouncementState = {
  items: [],
  meta: null,
  status: 'idle',
  error: null,
  sending: false,
  sendError: null,
};

interface FetchResult {
  items: Announcement[];
  meta: PaginationMeta | null;
  page: number;
}

export const fetchAnnouncements = createAsyncThunk<
  FetchResult,
  AnnouncementsParams | undefined,
  { rejectValue: string }
>('announcements/fetch', async (params, { rejectWithValue }) => {
  try {
    const page = params?.page ?? 1;
    const result = await getAnnouncementsApi({ ...params, page });
    return { items: result.items, meta: result.meta, page };
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, 'Gagal memuat pengumuman'));
  }
});

export const createAnnouncement = createAsyncThunk<
  Announcement,
  CreateAnnouncementPayload,
  { rejectValue: string }
>('announcements/create', async (payload, { rejectWithValue }) => {
  try {
    return await createAnnouncementApi(payload);
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, 'Gagal mengirim pengumuman'));
  }
});

const announcementSlice = createSlice({
  name: 'announcements',
  initialState,
  reducers: {
    clearSendError(state) {
      state.sendError = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchAnnouncements.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAnnouncements.fulfilled, (state, action) => {
        state.status = 'idle';
        state.meta = action.payload.meta;
        if (action.payload.page <= 1) {
          state.items = action.payload.items;
        } else {
          const existing = new Set(state.items.map(item => item.id));
          state.items.push(...action.payload.items.filter(item => !existing.has(item.id)));
        }
      })
      .addCase(fetchAnnouncements.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload ?? 'Gagal memuat pengumuman';
      })
      .addCase(createAnnouncement.pending, state => {
        state.sending = true;
        state.sendError = null;
      })
      .addCase(createAnnouncement.fulfilled, (state, action) => {
        state.sending = false;
        state.items.unshift(action.payload);
      })
      .addCase(createAnnouncement.rejected, (state, action) => {
        state.sending = false;
        state.sendError = action.payload ?? 'Gagal mengirim pengumuman';
      });
  },
});

export const { clearSendError } = announcementSlice.actions;
export default announcementSlice.reducer;
