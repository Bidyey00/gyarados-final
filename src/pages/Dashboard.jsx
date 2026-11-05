
import { Link } from 'react-router-dom';
import {
  getStats,
  getLoans,
  getAssets,
  getCategories,
} from '../api/supabaseApi';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { ErrorState } from '../components/States.jsx';
import { Thumb } from '../components/AssetCard.jsx';
import Icon from '../components/Icon.jsx';
import { dueLabel, formatBytes, formatDate } from '../lib/format.js';
import AdminUserManagement from '../components/AdminUserManagement.jsx';

const CATEGORY_META = {
  Technology: ['cpu', 'Software, systems & computing'],
  Science: ['flask', 'Nature, experiments & discovery'],
  Design: ['palette', 'Visual thinking & usability'],
  History: ['landmark', 'People, places & the past'],
  Fiction: ['book', 'Stories and imagined worlds'],
  Mathematics: ['calculator', 'Numbers, logic & problem solving'],
  'Business & Economics': ['chart', 'Markets, money & management'],
  Education: ['graduation', 'Teaching and learning resources'],
  'Philosophy & Ethics': ['brain', 'Ideas, values & reasoning'],
  'Literature & Poetry': ['feather', 'Poems, plays & literary classics'],
};

function Stat({ label, value, icon, detail, tone = 'text-navy' }) {
  return (
    <div className="panel flex items-start gap-4 p-4 sm:p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-shelf text-navy">
        <Icon name={icon} className="h-5 w-5" />
      </div>

      <div className="min-w-0">
        <p className="text-sm text-ink-soft">{label}</p>
        <p className={`mt-0.5 font-display text-3xl font-extrabold ${tone}`}>
          {value}
        </p>
        <p className="mt-1 text-xs text-ink-mute">{detail}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'there';

  const stats = useFetch(() => getStats(), []);

  const loans = useFetch(
    () => getLoans({ status: 'active', limit: 5 }),
    []
  );

  const assets = useFetch(
    () => getAssets(),
    []
  );

  const categories = useFetch(
    () => getCategories(),
    []
  );

  if (stats.error) {
    return (
      <ErrorState
        error={stats.error}
        onRetry={stats.refetch}
      />
    );
  }

  const st = stats.data;

  const pct = st
    ? Math.min(
        100,
        Math.round((st.storageUsedMb / st.storageQuotaMb) * 100)
      )
    : 0;

  return (
    <div className="space-y-7">
      {/* Welcome section */}
      <section className="dashboard-hero relative overflow-hidden rounded-3xl px-6 py-7 text-white shadow-lift sm:px-9 sm:py-9">
        <div className="relative z-10 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white/90">
            <span className="h-2 w-2 rounded-full bg-saffron" />
            YOUR KNOWLEDGE HUB
          </p>

          <h1 className="!text-white text-3xl font-extrabold sm:text-4xl">
            Welcome back, {firstName}.
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
            One place for the books you borrow and the digital resources you keep.
            Find your next read or pick up where you left off.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/library" className="btn-accent">
              <Icon name="book" className="h-4 w-4" />
              Explore the collection
            </Link>

            <Link
              to="/assets"
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <Icon name="folder" className="h-4 w-4" />
              Browse digital archive
            </Link>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 -right-8 hidden h-64 w-64 rounded-full border border-white/15 sm:block"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-8 right-16 hidden h-40 w-40 rounded-full border border-white/10 sm:block"
        />
      </section>

      {/* Statistics */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {st ? (
          <>
            <Stat
              label="Library titles"
              value={st.totalBooks}
              icon="book"
              detail={`${st.availableCopies} copies available`}
            />

            {/* Admin-only User Management */}
{user?.role === 'admin' && (
  <AdminUserManagement />
)}

            <Stat
              label="Active loans"
              value={st.activeLoans}
              icon="loans"
              detail="Books currently borrowed"
              tone="text-teal"
            />

            <Stat
              label="Overdue loans"
              value={st.overdueLoans}
              icon="clock"
              detail={st.overdueLoans ? 'Needs attention' : 'All caught up'}
              tone={st.overdueLoans ? 'text-brick' : 'text-moss'}
            />

            <Stat
              label="Digital assets"
              value={st.totalAssets}
              icon="folder"
              detail={`${formatBytes(st.storageUsedMb * 1048576)} stored`}
            />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-28" />
          ))
        )}
      </section>

      {/* Categories */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-teal">
              Browse by interest
            </p>
            <h2 className="mt-1 text-2xl font-extrabold">
              Explore categories
            </h2>
          </div>

          <Link
            to="/library"
            className="shrink-0 text-sm font-semibold text-teal hover:underline"
          >
            All books ↗
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {(categories.data || Object.keys(CATEGORY_META)).map((name) => {
            const meta = CATEGORY_META[name] || ['book', 'Browse this subject'];

            return (
              <Link
                key={name}
                to={`/library?category=${encodeURIComponent(name)}`}
                className="group flex min-h-28 items-start gap-3 rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-teal/40 hover:shadow-lift"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-shelf text-navy transition group-hover:bg-teal group-hover:text-white">
                  <Icon name={meta[0]} className="h-5 w-5" />
                </span>

                <span>
                  <span className="block font-bold text-navy">{name}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-ink-mute">
                    {meta[1]}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Loans and assets */}
      <section className="grid gap-5 xl:grid-cols-2">
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-line p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-teal">
                Keep things moving
              </p>
              <h2 className="mt-1 text-lg font-bold">Borrowing desk</h2>
            </div>

            <Link
              to="/loans"
              className="text-sm font-semibold text-teal hover:underline"
            >
              View all
            </Link>
          </div>

          {loans.error ? (
            <p className="p-5 text-sm text-brick">{loans.error.message}</p>
          ) : !loans.data ? (
            <div className="skeleton m-5 h-32" />
          ) : loans.data.items.length === 0 ? (
            <p className="p-5 text-sm text-ink-soft">
              No books are currently on loan.
            </p>
          ) : (
            <ul>
              {loans.data.items.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{l.bookTitle}</p>
                    <p className="text-sm text-ink-mute">{l.member}</p>
                  </div>

                  <span
                    className={`badge shrink-0 ${
                      l.status === 'overdue'
                        ? 'bg-brick-50 text-brick'
                        : 'bg-teal-50 text-teal-700'
                    }`}
                  >
                    {dueLabel(l.dueAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-line p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-teal">
                Your shared collection
              </p>
              <h2 className="mt-1 text-lg font-bold">Recently added assets</h2>
            </div>

            <Link
              to="/assets"
              className="text-sm font-semibold text-teal hover:underline"
            >
              Open archive
            </Link>
          </div>

          {!assets.data ? (
            <div className="skeleton m-5 h-32" />
          ) : assets.data.items.length === 0 ? (
            <p className="p-5 text-sm text-ink-soft">
              No digital assets have been added yet.
            </p>
          ) : (
            <ul>
              {assets.data.items.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-0"
                >
                  <Thumb asset={a} className="h-10 w-10 shrink-0 rounded-lg" />

                  <div className="min-w-0">
                    <p className="truncate font-semibold">{a.title}</p>
                    <p className="text-sm text-ink-mute">
                      {formatDate(a.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {st && (
            <div className="border-t border-line p-5">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-ink-soft">Digital storage used</span>
                <span className="font-semibold">{pct}%</span>
              </div>

              <div
                className="h-2 overflow-hidden rounded-full bg-shelf"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={`h-full rounded-full ${
                    pct > 85 ? 'bg-brick' : 'bg-teal'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
