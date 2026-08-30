import { forwardRef, useEffect, useState } from 'react';
import type { ComponentRef } from 'react';
import { Image } from 'react-native';
import type { ImageProps, ImageStyle, StyleProp } from 'react-native';

import { getAuthToken } from '@/services/api/axiosInstance';
import { useAppSelector } from '@/store/hooks';
import { isDisplayablePhoto, isProtectedApiUrl, resolveSecureFileUrl } from '@/utils/avatar';

export interface SecureImageProps extends Omit<ImageProps, 'source' | 'style'> {
  // Nilai mentah field `photo` dari API (path relatif, URL absolut, atau null).
  path: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  // Dipanggil kalau gambar gagal dimuat — pemanggil biasa memakainya untuk switch ke avatar inisial.
  onLoadError?: () => void;
}

// Foto di balik `<API_BASE_URL>/secure-files/...` butuh header `Authorization: Bearer <token>`.
// `<Image>` bawaan RN sudah mendukung `source.headers` di iOS maupun Android (Fresco
// menghormatinya), jadi tidak perlu library gambar tambahan / rebuild native.
//
// Token diambil live dari AsyncStorage (`getAuthToken`), bukan `state.auth.token` — token di redux
// hanya di-set saat login dan bisa basi setelah interceptor axios me-rotate token di background.
// `state.auth.token` tetap dipakai sebagai nilai awal supaya render pertama tidak kosong.
//
// Header Authorization hanya ditempelkan untuk URL di bawah API kita (`isProtectedApiUrl`) — bukan
// untuk URL absolut pihak ketiga.
const SecureImage = forwardRef<ComponentRef<typeof Image>, SecureImageProps>(function SecureImageImpl(
  props,
  ref,
) {
  const { path, style, onLoadError, onError, ...rest } = props;
  const persistedToken = useAppSelector(state => state.auth.token);
  const [token, setToken] = useState<string | null>(persistedToken);

  useEffect(() => {
    let cancelled = false;
    getAuthToken().then(value => {
      if (!cancelled && value) setToken(value);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  // Pemanggil sudah menyaring dengan `isDisplayablePhoto`, tapi jaga-jaga di sini juga supaya URL
  // placeholder yang tidak bisa dirender tidak pernah dicoba.
  if (!isDisplayablePhoto(path)) return null;

  const uri = resolveSecureFileUrl(path);
  if (!uri) return null;

  const withAuth = Boolean(token) && isProtectedApiUrl(uri);

  return (
    <Image
      ref={ref}
      style={style}
      source={withAuth ? { uri, headers: { Authorization: `Bearer ${token}` } } : { uri }}
      onError={event => {
        onLoadError?.();
        onError?.(event);
      }}
      {...rest}
    />
  );
});

export default SecureImage;
