/**
 * Utility to resolve and consolidate staff profiles and alias IDs across the ERP.
 * Handles cases where a staff member has multiple profile rows in staff_profiles
 * (e.g., registered as 'HASNATH' and 'Hasnath p' sharing the same auth_user_id or name).
 */

export interface StaffProfileSimple {
  id: string;
  full_name: string;
  username?: string;
  designation?: string;
  auth_user_id?: string | null;
  status?: string;
  gender?: string;
  avatar_url?: string | null;
  shift_start_time?: string;
  shift_end_time?: string;
  weekly_off_day?: string;
  [key: string]: any;
}

/**
 * Normalize names for fuzzy alias grouping (e.g. "Hasnath p" -> "hasnath")
 */
export function normalizeStaffName(name?: string | null): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Check if two staff profile entries belong to the exact same human employee
 */
export function areProfilesSamePerson(a: StaffProfileSimple, b: StaffProfileSimple): boolean {
  if (!a || !b) return false;
  if (a.id === b.id) return true;

  // Match 1: Same non-null auth_user_id
  if (a.auth_user_id && b.auth_user_id && a.auth_user_id === b.auth_user_id) {
    return true;
  }

  // Match 2: Normalized username match
  const aUser = (a.username || '').trim().toLowerCase();
  const bUser = (b.username || '').trim().toLowerCase();
  if (aUser && bUser && aUser === bUser) {
    return true;
  }

  // Match 3: Normalized name match (e.g. 'hasnath' and 'hasnathp')
  const aNorm = normalizeStaffName(a.full_name);
  const bNorm = normalizeStaffName(b.full_name);
  if (aNorm && bNorm) {
    if (aNorm === bNorm) return true;
    if (aNorm.length >= 4 && bNorm.length >= 4) {
      if (aNorm.startsWith(bNorm) || bNorm.startsWith(aNorm)) return true;
    }
  }

  return false;
}

/**
 * Return all associated IDs for a given staff ID or name across available profiles
 */
export function getLinkedStaffIds(
  identifier: string,
  profiles: StaffProfileSimple[] = []
): string[] {
  if (!identifier) return [];
  const cleanId = identifier.trim();

  // Find target profile by ID, username, or full_name
  const target = profiles.find(
    (p) =>
      p.id === cleanId ||
      (p.username && p.username.toLowerCase() === cleanId.toLowerCase()) ||
      (p.full_name && p.full_name.toLowerCase() === cleanId.toLowerCase())
  );

  const matchedIds = new Set<string>();
  matchedIds.add(cleanId);

  if (target) {
    matchedIds.add(target.id);
    profiles.forEach((p) => {
      if (areProfilesSamePerson(target, p)) {
        matchedIds.add(p.id);
      }
    });
  } else {
    // If target not directly found by ID, search by normalized name
    const norm = normalizeStaffName(cleanId);
    profiles.forEach((p) => {
      if (normalizeStaffName(p.full_name) === norm || normalizeStaffName(p.username) === norm) {
        matchedIds.add(p.id);
      }
    });
  }

  return Array.from(matchedIds);
}

/**
 * Deduplicate a list of staff profiles so each unique employee appears only once,
 * attaching all their known linked IDs into `linked_ids`.
 */
export function deduplicateStaffProfiles(
  profiles: StaffProfileSimple[]
): (StaffProfileSimple & { linked_ids: string[] })[] {
  const result: (StaffProfileSimple & { linked_ids: string[] })[] = [];

  for (const prof of profiles) {
    if (!prof || !prof.full_name) continue;

    // Check if we already have an entry for this person in result
    const existing = result.find((item) => areProfilesSamePerson(item, prof));

    if (existing) {
      if (!existing.linked_ids.includes(prof.id)) {
        existing.linked_ids.push(prof.id);
      }
      // Prefer richer profile fields (e.g. avatar, proper case name)
      if (!existing.avatar_url && prof.avatar_url) {
        existing.avatar_url = prof.avatar_url;
      }
      if (prof.shift_start_time && !existing.shift_start_time) {
        existing.shift_start_time = prof.shift_start_time;
      }
      if (prof.shift_end_time && !existing.shift_end_time) {
        existing.shift_end_time = prof.shift_end_time;
      }
      if (prof.weekly_off_day && !existing.weekly_off_day) {
        existing.weekly_off_day = prof.weekly_off_day;
      }
    } else {
      result.push({
        ...prof,
        linked_ids: [prof.id]
      });
    }
  }

  return result;
}

