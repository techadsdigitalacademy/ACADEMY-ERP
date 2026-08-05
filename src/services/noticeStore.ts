export interface AgencyNoticeItem {
  id: string;
  title: string;
  content: string;
  author_name?: string;
  created_by?: string;
  created_at: string;
}

const STORAGE_KEY = 'agency_notices_local_store';

const DEFAULT_NOTICES: AgencyNoticeItem[] = [
  {
    id: 'default-welcome',
    title: 'Welcome to TechAds Agency Portal',
    content: 'Welcome team! Important agency announcements, project guidelines, and company notices will be broadcasted here by management.',
    author_name: 'Management',
    created_at: new Date().toISOString()
  }
];

export const getLocalNotices = (): AgencyNoticeItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_NOTICES));
      return DEFAULT_NOTICES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_NOTICES;
  } catch (e) {
    return DEFAULT_NOTICES;
  }
};

export const saveLocalNotice = (notice: { title: string; content: string; created_by?: string; author_name?: string }): AgencyNoticeItem => {
  const newNotice: AgencyNoticeItem = {
    id: 'notice-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    title: notice.title.trim(),
    content: notice.content.trim(),
    created_by: notice.created_by || 'admin',
    author_name: notice.author_name || 'Management',
    created_at: new Date().toISOString()
  };

  const existing = getLocalNotices();
  // Filter out default welcome notice if a custom notice is being saved
  const filtered = existing.filter(n => n.id !== 'default-welcome');
  const updated = [newNotice, ...filtered];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  // Dispatch custom window events for instant UI synchronization
  window.dispatchEvent(new Event('agency_notices_updated'));
  window.dispatchEvent(new CustomEvent('agency_notices_changed', { detail: updated }));
  return newNotice;
};

export const deleteLocalNotice = (id: string) => {
  const existing = getLocalNotices();
  const updated = existing.filter(n => n.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('agency_notices_updated'));
  window.dispatchEvent(new CustomEvent('agency_notices_changed', { detail: updated }));
};
