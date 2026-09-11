// Utilitas kecil untuk memastikan sebuah promise TIDAK PERNAH menggantung selamanya —
// dipakai di alur yang tidak boleh membuat pengguna terjebak menunggu tanpa kepastian
// (mis. AppBootstrap: permintaan izin native / panggilan API saat menyiapkan aplikasi).
// Catatan: ini tidak membatalkan promise aslinya (JS tidak punya cancel bawaan) — promise
// asli tetap jalan di belakang layar, cuma diabaikan hasilnya kalau sudah melewati batas waktu.

export class TimeoutError extends Error {
  constructor(message = 'Waktu tunggu habis.') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError()), ms);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
