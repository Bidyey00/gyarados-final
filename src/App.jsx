


import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Library from './pages/Library.jsx';
import Assets from './pages/Assets.jsx';
import Loans from './pages/Loans.jsx';
import BookReader from './pages/BookReader.jsx';
import Categories from './pages/Categories.jsx';
import AIChatbot from './components/AIChatbot.jsx';

// The signed-in layout: sidebar, top bar and the current page.
function Shell() {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <Topbar />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-7 sm:px-8 lg:py-9">
        <Outlet />
      </main>

      <AIChatbot />
    </div>
  );
}

// Anyone who is not signed in is sent to /login.
function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-soft">
        Checking your session…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Shell />;
}

// Signed-in people have no reason to see the sign-in form.
function GuestOnly({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <GuestOnly>
                <AuthPage mode="login" />
              </GuestOnly>
            }
          />

          <Route
            path="/register"
            element={
              <GuestOnly>
                <AuthPage mode="register" />
              </GuestOnly>
            }
          />

          <Route element={<RequireAuth />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/library" element={<Library />} />
            <Route path="/reader/:id" element={<BookReader />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/loans" element={<Loans />} />
            <Route path="/categories" element={<Categories />} />

            <Route
              path="*"
              element={<p className="text-ink-soft">Page not found.</p>}
            />
          </Route>
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
