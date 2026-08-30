import HistoryList, { HistoryCard, historyStatusVariant } from '@/components/molecules/HistoryList';
import type { VehicleVisitorLogEntry } from '@/types';
import { formatDateTime, orDash, titleCase } from '@/utils/format';

export interface VehicleVisitorLogHistoryProps {
  entries: VehicleVisitorLogEntry[];
}

// Section "Log Pos Kendaraan" (catatan keluar-masuk pos jaga) di detail Kendaraan — pakai scaffold
// `HistoryList` yang sama dengan "Riwayat visitor" personel/persit, tapi barisnya menampilkan
// pengemudi/penumpang (`driver_passenger_*`) alih-alih data kendaraan.
export default function VehicleVisitorLogHistory(props: VehicleVisitorLogHistoryProps) {
  return (
    <HistoryList
      title="Log Pos Kendaraan"
      entries={props.entries}
      emptyLabel="Belum ada log pos kendaraan."
      renderCard={entry => (
        <HistoryCard
          key={entry.id}
          statusLabel={titleCase(entry.status) ?? undefined}
          statusVariant={historyStatusVariant(entry.status)}
          rows={[
            { icon: 'clock', label: 'Masuk', value: formatDateTime(entry.entered_at) ?? '-' },
            { icon: 'clock', label: 'Keluar', value: formatDateTime(entry.exited_at) ?? '-' },
            { icon: 'crosshair', label: 'Tujuan', value: orDash(entry.purpose) },
            { icon: 'profile', label: 'Pengemudi', value: orDash(entry.driver_passenger_name) },
            { icon: 'phone', label: 'Telepon', value: orDash(entry.driver_passenger_phone) },
          ]}
        />
      )}
    />
  );
}
