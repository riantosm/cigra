import AsyncStorage from '@react-native-async-storage/async-storage';

export const OTP_RESEND_DAILY_LIMIT = 3;

// Device-wide (not per-account) daily cap on "kirim ulang OTP". AsyncStorage is local to the install,
// so this key alone enforces "max 3x per device per day" regardless of which identifier is used.
const OTP_RESEND_STORAGE_KEY = 'otp_resend_count';

interface OtpResendState {
  date: string;
  count: number;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getOtpResendCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(OTP_RESEND_STORAGE_KEY);
  if (!raw) return 0;
  try {
    const state: OtpResendState = JSON.parse(raw);
    return state.date === todayKey() ? state.count : 0;
  } catch {
    return 0;
  }
}

export async function recordOtpResend(): Promise<number> {
  const next = (await getOtpResendCount()) + 1;
  const state: OtpResendState = { date: todayKey(), count: next };
  await AsyncStorage.setItem(OTP_RESEND_STORAGE_KEY, JSON.stringify(state));
  return next;
}
