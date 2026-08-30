import HistoryList, { HistoryCard, historyStatusVariant } from '@/components/molecules/HistoryList';
import type { PersonnelWeaponLoanEntry } from '@/types';
import { formatDateTime, joinFields, orDash, titleCase } from '@/utils/format';

export interface WeaponLoanHistoryProps {
  entries: PersonnelWeaponLoanEntry[];
}

// Tab "Peminjaman Senjata" di detail Personel.
export default function WeaponLoanHistory(props: WeaponLoanHistoryProps) {
  return (
    <HistoryList
      title="Riwayat Peminjaman Senjata"
      entries={props.entries}
      emptyLabel="Belum ada peminjaman senjata."
      renderCard={entry => (
        <HistoryCard
          key={entry.id}
          statusLabel={titleCase(entry.status) ?? undefined}
          statusVariant={historyStatusVariant(entry.status)}
          rows={[
            {
              icon: 'weapon',
              label: 'Senjata',
              value: orDash(joinFields(entry.weapon_number, entry.serial_number)),
            },
            { icon: 'crosshair', label: 'Tujuan', value: orDash(entry.purpose) },
            { icon: 'calendar', label: 'Dipinjam', value: formatDateTime(entry.loaned_at) ?? '-' },
            { icon: 'calendar', label: 'Kembali', value: formatDateTime(entry.returned_at) ?? '-' },
          ]}
        />
      )}
    />
  );
}
