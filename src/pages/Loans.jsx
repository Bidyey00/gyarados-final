import { useState } from 'react';
import {
  getLoans,
  returnBook,
} from '../api/supabaseApi';
import { useFetch } from '../hooks/useFetch.js';
import { useToast } from '../components/Toast.jsx';
import { EmptyState, ErrorState } from '../components/States.jsx';
import { dueLabel, formatDate } from '../lib/format.js';

const TABS = [['', 'All'], ['active', 'On loan'], ['overdue', 'Overdue'], ['returned', 'Returned']];
const BADGE = {
  active: 'bg-teal-50 text-teal-700',
  overdue: 'bg-brick-50 text-brick',
  returned: 'bg-moss-50 text-moss',
};
const LABEL = { active: 'On loan', overdue: 'Overdue', returned: 'Returned' };

export default function Loans() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [busyId, setBusyId] = useState(null);
  const loans = useFetch(
  () => getLoans({ status }),
  [status]
);
  const items = loans.data?.items || [];

  const giveBack = async (loan) => {
    setBusyId(loan.id);
    try {
      await returnBook(loan.id);
      toast(`Returned “${loan.bookTitle}”`);
      loans.refetch();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Loans</h1>
        <p className="mt-1 text-ink-soft">Everything currently out, and what has come back.</p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Loan status">
        {TABS.map(([v, l]) => (
          <button key={v} className={`chip ${status === v ? 'chip-on' : ''}`} onClick={() => setStatus(v)}>{l}</button>
        ))}
      </div>

      {loans.error ? (
        <ErrorState error={loans.error} onRetry={loans.refetch} />
      ) : !loans.data && loans.loading ? (
        <div className="skeleton h-64" />
      ) : items.length === 0 ? (
        <EmptyState title="No loans in this view" hint="Borrow a book from the Library and it will show up here." />
      ) : (
        <div className={`panel overflow-x-auto ${loans.loading ? 'opacity-60' : ''}`}>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-ink-mute">
              <tr>
                <th className="px-4 py-3 font-medium">Book</th>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Borrowed</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">{l.bookTitle}</td>
                  <td className="px-4 py-3 text-ink-soft">{l.member}</td>
                  <td className="px-4 py-3 text-ink-soft">{formatDate(l.borrowedAt)}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {l.status === 'returned' ? `Returned ${formatDate(l.returnedAt)}` : `${formatDate(l.dueAt)} · ${dueLabel(l.dueAt)}`}
                  </td>
                  <td className="px-4 py-3"><span className={`badge ${BADGE[l.status]}`}>{LABEL[l.status]}</span></td>
                  <td className="px-4 py-3 text-right">
                    {l.status !== 'returned' && (
                      <button className="btn-ghost" disabled={busyId === l.id} onClick={() => giveBack(l)}>
                        {busyId === l.id ? 'Returning…' : 'Return'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
