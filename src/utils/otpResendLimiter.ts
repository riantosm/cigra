import AsyncStorage from '@react-native-async-storage/async-storage';

export const OTP_RESEND_DAILY_LIMIT = 3;

const OTP_RESEND_STORAGE_PREFIX = 'otp_resend_count_';

interface OtpResendState {
  date: string;
  count: number;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function storageKey(identifier: string): string {
  return `${OTP_RESEND_STORAGE_PREFIX}${identifier.trim().toLowerCase()}`;
}

export async function getOtpResendCount(identifier: string): Promise<number> {
  const raw = await AsyncStorage.getItem(storageKey(identifier));
  if (!raw) return 0;
  try {
    const state: OtpResendState = JSON.parse(raw);
    return state.date === todayKey() ? state.count : 0;
  } catch {
    return 0;
  }
}

export async function recordOtpResend(identifier: string): Promise<number> {
  const next = (await getOtpResendCount(identifier)) + 1;
  const state: OtpResendState = { date: todayKey(), count: next };
  await AsyncStorage.setItem(storageKey(identifier), JSON.stringify(state));
  return next;
}
