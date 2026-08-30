import HistoryList, { HistoryCard, historyStatusVariant } from '@/components/molecules/HistoryList';
import type { PersonnelVisitorLogEntry } from '@/types';
import { formatDateTime, joinFields, orDash, titleCase } from '@/utils/format';

export interface VisitorLogHistoryProps {
  entries: PersonnelVisitorLogEntry[];
}

// Tab "Riwayat visitor" (catatan keluar-masuk markas) di detail Personel & Persit.
export default function VisitorLogHistory(props: VisitorLogHistoryProps) {
  return (
    <HistoryList
      title="Catatan Keluar Masuk"
      entries={props.entries}
      emptyLabel="Belum ada catatan keluar masuk."
      renderCard={entry => (
        <HistoryCard
          key={entry.id}
          statusLabel={titleCase(entry.status) ?? undefined}
          statusVariant={historyStatusVariant(entry.status)}
          rows={[
            { icon: 'clock', label: 'Masuk', value: formatDateTime(entry.entered_at) ?? '-' },
            { icon: 'clock', label: 'Keluar', value: formatDateTime(entry.exited_at) ?? '-' },
            { icon: 'crosshair', label: 'Tujuan', value: orDash(entry.purpose) },
            {
              icon: 'car',
              label: 'Kendaraan',
              value: orDash(joinFields(entry.vehicle_type, entry.vehicle_plate)),
            },
          ]}
        />
      )}
    />
  );
}
