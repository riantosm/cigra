import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { getAppVersionApi } from '@/services/api/appVersion.service';
import type { AppUpdateStatus, AppVersionPlatformInfo } from '@/types';
import {
  evaluateUpdateStatus,
  isVersionSkipped,
  platformInfo,
  skipVersion,
} from '@/utils/appVersion';
import { appBuildNumber, appVersion } from '@/utils/version';

interface AppVersionGateState {
  status: AppUpdateStatus;
  info: AppVersionPlatformInfo | null;
}

const NONE: AppVersionGateState = { status: 'none', info: null };

// Cek `GET /app-version` saat app start (dan tiap AppState kembali `active`), bandingkan versi
// terpasang dengan blok platform, lalu tentukan apakah update wajib / disarankan / tidak ada.
// Kegagalan request diabaikan diam-diam — jangan blokir user hanya karena cek versi gagal.
export function useAppVersionGate() {
  const [state, setState] = useState<AppVersionGateState>(NONE);
  const mountedRef = useRef(true);

  const check = useCallback(async () => {
    try {
      const info = platformInfo(await getAppVersionApi());
      const status = evaluateUpdateStatus(appVersion, appBuildNumber, info);
      if (status === 'suggested' && (await isVersionSkipped(info.latest_version))) {
        if (mountedRef.current) setState({ status: 'none', info });
        return;
      }
      if (mountedRef.current) setState({ status, info });
    } catch {
      // network / non-2xx → biarkan state apa adanya, app jalan normal.
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    check();
    const subscription = AppState.addEventListener('change', appState => {
      if (appState === 'active') check();
    });
    return () => {
      mountedRef.current = false;
      subscription.remove();
    };
  }, [check]);

  // "Nanti" pada update disarankan — simpan versi yang di-skip lalu tutup modal.
  const dismissSuggested = useCallback(async () => {
    if (state.info) await skipVersion(state.info.latest_version);
    if (mountedRef.current) setState(current => ({ status: 'none', info: current.info }));
  }, [state.info]);

  return {
    status: state.status,
    info: state.info,
    dismissSuggested,
    recheck: check,
  };
}
