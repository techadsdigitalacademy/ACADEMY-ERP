import { supabase, supabaseAdmin } from './supabase';

/**
 * Standardizes a staff username or name into a valid, safe email address for Supabase Auth.
 * e.g. "SHANA GAFOOR" -> "shanagafoor@agency.com"
 * e.g. "rahul_sharma" -> "rahul_sharma@agency.com"
 */
export function formatStaffEmail(usernameOrName: string): string {
  if (!usernameOrName) return 'staff@agency.com';
  // Remove whitespace and keep only alphanumeric, dots, hyphens, and underscores
  const clean = usernameOrName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9_.-]/g, '');

  return `${clean || 'staff'}@agency.com`;
}

/**
 * Ensures password meets minimum 6 character length for Supabase Auth.
 */
export function normalizePassword(password?: string): string {
  const p = (password || '123456').trim();
  if (p.length < 6) {
    return p.padEnd(6, '0');
  }
  return p;
}

/**
 * Guarantees that a Supabase Auth user exists for the given staff member.
 * If user does not exist, creates it with email_confirm: true.
 * If user already exists in Supabase Auth, updates their password and returns their auth ID.
 */
export async function ensureStaffAuthUser(params: {
  username: string;
  fullName?: string;
  password?: string;
  email?: string;
}): Promise<string | null> {
  const email = params.email || formatStaffEmail(params.username || params.fullName || '');
  const finalPassword = normalizePassword(params.password);

  if (!supabaseAdmin) {
    console.warn('Supabase Admin client not available for auth user provisioning.');
    return null;
  }

  try {
    // 1. First attempt direct creation
    const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: finalPassword,
      email_confirm: true,
      user_metadata: {
        full_name: params.fullName || params.username,
        username: params.username
      }
    });

    if (createData?.user?.id) {
      return createData.user.id;
    }

    // 2. If already exists (or creation failed because user exists), find existing user by email
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existingUser = usersData?.users?.find(
      (u) => u.email?.trim().toLowerCase() === email.trim().toLowerCase()
    );

    if (existingUser?.id) {
      // Update password so credentials are in sync
      if (finalPassword) {
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          password: finalPassword,
          email_confirm: true
        });
      }
      return existingUser.id;
    }

    if (createErr) {
      console.error('ensureStaffAuthUser error:', createErr);
    }
  } catch (err) {
    console.error('Failed in ensureStaffAuthUser:', err);
  }

  return null;
}

/**
 * Ensures a staff profile row in staff_profiles is properly mapped to a valid auth_user_id.
 * If missing, provisions or maps the auth user and persists the auth_user_id in staff_profiles.
 */
export async function syncStaffProfileAuth(profile: {
  id: string;
  full_name: string;
  username: string;
  password?: string;
  auth_user_id?: string | null;
}): Promise<string | null> {
  let authUserId = profile.auth_user_id || null;

  // Check if current auth_user_id actually exists in Supabase Auth
  let authUserValid = false;
  if (authUserId && supabaseAdmin) {
    try {
      const { data } = await supabaseAdmin.auth.admin.getUserById(authUserId);
      if (data?.user?.id) {
        authUserValid = true;
      }
    } catch {
      authUserValid = false;
    }
  }

  // If missing or invalid, provision/locate one
  if (!authUserValid) {
    const resolvedId = await ensureStaffAuthUser({
      username: profile.username || profile.full_name,
      fullName: profile.full_name,
      password: profile.password
    });

    if (resolvedId) {
      authUserId = resolvedId;
      // Update staff_profiles table with the valid auth_user_id
      await supabase
        .from('staff_profiles')
        .update({ auth_user_id: resolvedId })
        .eq('id', profile.id);
    }
  }

  return authUserId;
}

/**
 * Resets the password for a staff member across both Supabase Auth and staff_profiles table.
 * Automatically provisions/links the Auth user if missing or unlinked.
 */
export async function resetStaffAuthPassword(
  profileId: string,
  newPassword: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const formattedPassword = normalizePassword(newPassword);

    // 1. Fetch current profile
    const { data: profile, error: pErr } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle();

    if (pErr) throw pErr;
    if (!profile) throw new Error('Staff profile not found.');

    let authUserId = profile.auth_user_id;

    // 2. Ensure auth user is linked / provisioned
    if (!authUserId) {
      authUserId = await syncStaffProfileAuth(profile);
    }

    // 3. Update Supabase Auth password
    if (supabaseAdmin) {
      if (authUserId) {
        const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          password: formattedPassword,
          email_confirm: true
        });
        if (authErr) {
          // If auth user ID had expired or became stale, re-provision
          const reAuthId = await ensureStaffAuthUser({
            username: profile.username || profile.full_name,
            fullName: profile.full_name,
            password: formattedPassword
          });
          if (reAuthId) {
            authUserId = reAuthId;
            await supabase
              .from('staff_profiles')
              .update({ auth_user_id: reAuthId })
              .eq('id', profileId);
          } else {
            throw authErr;
          }
        }
      } else {
        const newAuthId = await ensureStaffAuthUser({
          username: profile.username || profile.full_name,
          fullName: profile.full_name,
          password: formattedPassword
        });
        if (newAuthId) {
          authUserId = newAuthId;
          await supabase
            .from('staff_profiles')
            .update({ auth_user_id: newAuthId })
            .eq('id', profileId);
        }
      }
    }

    // 4. Update in staff_profiles for fallback reference
    const { error: dbErr } = await supabase
      .from('staff_profiles')
      .update({
        password: formattedPassword,
        ...(authUserId ? { auth_user_id: authUserId } : {})
      })
      .eq('id', profileId);

    if (dbErr) throw dbErr;

    return { success: true, message: `Password for ${profile.full_name} has been reset successfully!` };
  } catch (err: any) {
    console.error('Error resetting staff password:', err);
    return { success: false, message: err.message || 'Failed to reset password.' };
  }
}
