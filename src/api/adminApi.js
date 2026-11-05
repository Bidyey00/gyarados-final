import { supabase } from '../lib/supabaseClient.js';

// Retrieve all registered users.
// Only an admin can successfully call this function.
export async function getAdminUsers() {
  const { data, error } = await supabase.rpc('admin_list_users');

  if (error) {
    throw error;
  }

  return data || [];
}

// Change a user's role.
// Only an admin can successfully call this function.
export async function updateAdminUserRole(userId, newRole) {
  const { error } = await supabase.rpc('admin_update_user_role', {
    p_user_id: userId,
    p_new_role: newRole,
  });

  if (error) {
    throw error;
  }

  return true;
}