import { createSlice, nanoid } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type AnnouncementType = 'announcement' | 'alert' | 'info';
export type AnnouncementSeverity = 'low' | 'normal' | 'high';
export type AnnouncementScope = 'all' | 'unit' | 'role';

export interface LocalAnnouncement {
  id: string;
  type: AnnouncementType;
  title: string;
  body: string;
  severity: AnnouncementSeverity;
  scope: AnnouncementScope;
  scope_label: string;
  created_at: string;
  created_by_name: string;
}

// Payload dari form — id & created_at diisi reducer.
export interface CreateAnnouncementInput {
  type: AnnouncementType;
  title: string;
  body: string;
  severity: AnnouncementSeverity;
  scope: AnnouncementScope;
  scope_label: string;
  created_by_name: string;
}

interface AnnouncementState {
  // Pengumuman yang dikirim dari perangkat ini — DUMMY/lokal, dipersist lewat redux-persist sampai
  // ada endpoint `POST /announcements` + `GET /announcements` (lihat API_CONTRACT.md §2.3/2.4).
  sent: LocalAnnouncement[];
}

const initialState: AnnouncementState = {
  sent: [],
};

const announcementSlice = createSlice({
  name: 'announcements',
  initialState,
  reducers: {
    announcementCreated: {
      reducer(state, action: PayloadAction<LocalAnnouncement>) {
        state.sent.unshift(action.payload);
      },
      prepare(input: CreateAnnouncementInput) {
        return {
          payload: {
            ...input,
            id: nanoid(),
            created_at: new Date().toISOString(),
          } satisfies LocalAnnouncement,
        };
      },
    },
    announcementDeleted(state, action: PayloadAction<string>) {
      state.sent = state.sent.filter(item => item.id !== action.payload);
    },
    clearAnnouncements(state) {
      state.sent = [];
    },
  },
});

export const { announcementCreated, announcementDeleted, clearAnnouncements } = announcementSlice.actions;
export default announcementSlice.reducer;
