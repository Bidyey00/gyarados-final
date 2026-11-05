
import { useCallback, useEffect, useState } from 'react';
import { getAdminUsers, updateAdminUserRole } from '../api/adminApi';
import { useAuth } from '../context/AuthContext.jsx';

const ROLES = ['member', 'librarian', 'admin'];

export default function AdminUserManagement() {
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message || 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleRoleChange(userId, newRole) {
    const targetUser = users.find((item) => item.id === userId);

    if (!targetUser || targetUser.id === user?.id) return;
    if (targetUser.role === newRole) return;

    const confirmed = window.confirm(
      `Change ${targetUser.email}'s role to ${newRole}?`
    );

    if (!confirmed) return;

    setSavingId(userId);
    setError('');
    setMessage('');

    try {
      await updateAdminUserRole(userId, newRole);

      setUsers((current) =>
        current.map((item) =>
          item.id === userId
            ? { ...item, role: newRole }
            : item
        )
      );

      setMessage(`Successfully changed ${targetUser.email}'s role.`);
    } catch (err) {
      setError(err.message || 'Unable to update user role.');
    } finally {
      setSavingId(null);
    }
  }

  const counts = {
    member: users.filter((item) => item.role === 'member').length,
    librarian: users.filter((item) => item.role === 'librarian').length,
    admin: users.filter((item) => item.role === 'admin').length,
  };

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-teal">
          Administration
        </p>
        <h2 className="mt-1 text-2xl font-extrabold">
          User Management
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          View registered accounts and manage their system roles.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ROLES.map((role) => (
          <div key={role} className="panel p-4">
            <p className="text-sm capitalize text-ink-soft">
              {role} accounts
            </p>
            <p className="mt-1 font-display text-3xl font-extrabold text-navy">
              {loading ? '—' : counts[role]}
            </p>
          </div>
        ))}
      </div>

      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line p-5">
          <div>
            <h3 className="font-bold">Registered users</h3>
            <p className="mt-1 text-xs text-ink-mute">
              {users.length} accounts found
            </p>
          </div>

          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="btn-secondary text-sm"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {error && (
          <p className="m-5 rounded-lg bg-brick-50 p-3 text-sm text-brick">
            {error}
          </p>
        )}

        {message && (
          <p className="m-5 rounded-lg bg-teal-50 p-3 text-sm text-teal-700">
            {message}
          </p>
        )}

        {loading ? (
          <div className="skeleton m-5 h-32" />
        ) : users.length === 0 ? (
          <p className="p-5 text-sm text-ink-soft">
            No registered users found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-shelf text-ink-soft">
                <tr>
                  <th className="p-4 font-semibold">User</th>
                  <th className="p-4 font-semibold">Role</th>
                  <th className="p-4 font-semibold">Date registered</th>
                  <th className="p-4 font-semibold">Manage role</th>
                </tr>
              </thead>

              <tbody>
                {users.map((item) => {
                  const isCurrentUser = item.id === user?.id;

                  return (
                    <tr key={item.id} className="border-t border-line">
                      <td className="p-4">
                        <p className="font-semibold text-navy">
                          {item.full_name || 'Unnamed user'}
                        </p>
                        <p className="mt-1 text-xs text-ink-mute">
                          {item.email}
                        </p>
                      </td>

                      <td className="p-4">
                        <span className="badge bg-shelf capitalize text-navy">
                          {item.role}
                        </span>
                        {isCurrentUser && (
                          <p className="mt-1 text-xs text-ink-mute">
                            Your account
                          </p>
                        )}
                      </td>

                      <td className="p-4 text-ink-soft">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString()
                          : '—'}
                      </td>

                      <td className="p-4">
                        <select
                          value={item.role}
                          disabled={isCurrentUser || savingId === item.id}
                          onChange={(event) =>
                            handleRoleChange(item.id, event.target.value)
                          }
                          className="rounded-lg border border-line bg-white px-3 py-2 capitalize disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Change role for ${item.email}`}
                        >
                          {ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>

                        {savingId === item.id && (
                          <p className="mt-1 text-xs text-ink-mute">
                            Saving...
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
