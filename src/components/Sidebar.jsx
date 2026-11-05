
import { NavLink } from 'react-router-dom';
import Icon from './Icon.jsx';
import Logo from './Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { to: '/', label: 'Overview', icon: 'dashboard', end: true },
  { to: '/library', label: 'Book collection', icon: 'book' },
  { to: '/assets', label: 'Digital archive', icon: 'folder' },
  { to: '/loans', label: 'Borrowing desk', icon: 'loans' },
];

export default function Sidebar() {
  const { user, signOut } = useAuth();

  // Only librarians and admins can manage categories.
  const canManageCategories =
    user?.role === 'librarian' || user?.role === 'admin';

  const navigation = canManageCategories
    ? [
        ...NAV,
        { to: '/categories', label: 'Categories', icon: 'folder' },
      ]
    : NAV;

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-8">
        <NavLink
          to="/"
          className="flex items-center gap-2.5"
          aria-label="Gyarados home"
        >
          <Logo className="h-11 w-11 object-contain" />

          <span>
            <span className="block font-display text-xl font-extrabold leading-none text-navy">
              Gyarados
            </span>
            <span className="mt-1 block text-[11px] text-ink-mute">
              Library & digital archive
            </span>
          </span>
        </NavLink>

        <nav
          className="order-3 flex w-full items-center gap-1 overflow-x-auto pb-1 sm:order-none sm:w-auto sm:flex-1 sm:justify-center sm:pb-0"
          aria-label="Main navigation"
        >
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-ink-soft hover:bg-shelf hover:text-navy'
                }`
              }
            >
              <Icon name={item.icon} className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-[11px] text-ink-mute">Signed in as</p>
            <p className="max-w-32 truncate text-sm font-semibold text-navy">
              {user?.name}
            </p>
          </div>

          <button
            onClick={signOut}
            className="btn-ghost px-3 py-2"
            title="Sign out"
          >
            <Icon name="logout" className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
