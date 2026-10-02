import { ROUTES } from '@/navigation/paths';
import type { AppNotification, AppNotificationAction } from '@/types';
import { notificationCategory, resolveNotificationLink } from '@/utils/notificationAction';

function notif(type: string, action: AppNotificationAction | null): AppNotification {
  return { id: 1, type, title: 't', body: 'b', read: false, created_at: '2026-10-02T14:39:15+07:00', action };
}

function openWith(item: AppNotification, roles: string[] = []) {
  const navigate = jest.fn();
  const link = resolveNotificationLink(item, roles);
  link?.open({ navigate } as never);
  return { link, navigate };
}

// Payload di bawah disalin dari GET /notifications live (2026-10-02).
const panic = notif('panic_button', {
  type: 'emergency',
  unit: 'Tonban Kipan A',
  source: 'panic_button',
  latitude: '-6.94298416',
  maps_url: 'https://www.google.com/maps?q=-6.94298416,107.58668276',
  longitude: '107.58668276',
  sender_name: 'Mayor DEMO KOMANDAN',
  panic_button_id: '41',
});
const followUp = notif('disposition_follow_up', {
  type: 'disposition_follow_up',
  action: 'open_disposition',
  follow_up_id: '1',
  disposition_id: '1',
});
const recipientDone = notif('disposition_recipient_completed', {
  type: 'disposition_recipient_completed',
  action: 'open_disposition',
  recipient_id: '2',
  disposition_id: '1',
});
const rollCallOpened = notif('roll_call_dibuka', { type: 'roll_call', event: 'dibuka', status: 'open', agenda_id: '6' });

describe('resolveNotificationLink', () => {
  it('opens the panic-button detail via action.panic_button_id', () => {
    const { link, navigate } = openWith(panic);
    expect(link?.label).toBe('Buka Detail Darurat');
    expect(navigate).toHaveBeenCalledWith(ROUTES.emergencyDetail, { id: '41' });
  });

  it('falls back to the emergency list when no id is present', () => {
    const { navigate } = openWith(notif('panic_button', { type: 'emergency' }));
    expect(navigate).toHaveBeenCalledWith(ROUTES.emergencyList);
  });

  it('keeps supporting the legacy { type, id } shape', () => {
    const { navigate } = openWith(notif('emergency', { type: 'emergency', id: 88 }));
    expect(navigate).toHaveBeenCalledWith(ROUTES.emergencyDetail, { id: '88' });
    const { navigate: navDisposition } = openWith(notif('disposition', { type: 'disposition', id: 12 }));
    expect(navDisposition).toHaveBeenCalledWith(ROUTES.dispositionDetail, { id: 12 });
  });

  it('does not route directives to the panic-button screen', () => {
    expect(resolveNotificationLink(notif('directive', { type: 'emergency', source: 'directive', id: 5 }), [])).toBeNull();
  });

  it('opens the disposition detail via action.disposition_id for every disposition variant', () => {
    for (const item of [followUp, recipientDone]) {
      const { link, navigate } = openWith(item);
      expect(link?.label).toBe('Buka Detail Disposisi');
      expect(navigate).toHaveBeenCalledWith(ROUTES.dispositionDetail, { id: 1 });
    }
  });

  it('routes a roll-call notification by role', () => {
    expect(openWith(rollCallOpened, ['komandan']).navigate).toHaveBeenCalledWith(ROUTES.rollCallAgendaDetail, { id: 6 });
    expect(openWith(rollCallOpened, ['piket']).navigate).toHaveBeenCalledWith(ROUTES.rollCallAgendaDetail, { id: 6 });
    expect(openWith(rollCallOpened, ['perwakilan_kompi']).navigate).toHaveBeenCalledWith(ROUTES.rollCallCompanyAgendas);
    expect(openWith(rollCallOpened, ['piket', 'perwakilan_kompi']).navigate).toHaveBeenCalledWith(
      ROUTES.rollCallCompanyAgendas,
    );
    expect(resolveNotificationLink(rollCallOpened, ['prajurit'])).toBeNull();
  });

  it('links announcements to the announcement list and leaves plain info without a button', () => {
    expect(openWith(notif('announcement', null)).navigate).toHaveBeenCalledWith(ROUTES.announcements);
    expect(resolveNotificationLink(notif('info', null), [])).toBeNull();
  });
});

describe('notificationCategory', () => {
  it('groups the raw backend types', () => {
    expect(notificationCategory(panic)).toBe('emergency');
    expect(notificationCategory(followUp)).toBe('disposition');
    expect(notificationCategory(recipientDone)).toBe('disposition');
    expect(notificationCategory(rollCallOpened)).toBe('roll_call');
    expect(notificationCategory(notif('announcement', null))).toBe('announcement');
    expect(notificationCategory(notif('something_new', null))).toBe('info');
  });
});
