import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from '../components/Icon.jsx';
import Logo from '../components/Logo.jsx';

// Book spines: [height, colour, width]. Full class names so Tailwind keeps them.
const SPINES = [
  ['h-40', 'bg-saffron', 'w-8'], ['h-56', 'bg-sky', 'w-10'], ['h-48', 'bg-brick', 'w-7'],
  ['h-64', 'bg-moss', 'w-9'], ['h-44', 'bg-white/90', 'w-6'], ['h-60', 'bg-sky', 'w-8'], ['h-52', 'bg-saffron', 'w-10'],
];

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isLogin && password.length < 8) {
      setError('Choose a password with at least 8 characters.');
      return;
    }
    setBusy(true);
try {
  if (isLogin) {
    await signIn(email, password);
    navigate(from, { replace: true });
  } else {
    const result = await signUp(name, email, password);
  
    if (result.needsEmailConfirmation) {
      setError(
        'Account created. Check your email to confirm your account, then sign in.'
      );
      setBusy(false);
      return;
    }

    navigate(from, { replace: true });
  }
} catch (err) {
  setError(err.message);
  setBusy(false);
}
  }
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="auth-visual relative hidden flex-col justify-between overflow-hidden bg-navy p-12 text-white lg:flex">
        <span className="font-display text-xl font-extrabold">Gyarados</span>

        <div>
          <div className="mb-8 flex h-36 w-36 items-center justify-center"><Logo className="h-full w-full object-contain drop-shadow-lg" /></div>
          <h2 className="max-w-md text-4xl font-extrabold leading-tight !text-white">
            Every book and every file, found in one place.
          </h2>
          <p className="mt-4 max-w-sm text-white/70">
            Borrow from the shelves, keep track of what's due, and open the library's digital collection.
          </p>
        </div>

        <div className="settle flex items-end gap-1.5" aria-hidden="true">
          {SPINES.map(([h, c, w], i) => <div key={i} className={`${h} ${c} ${w} rounded-t-sm`} />)}
          <div className="ml-2 h-1 flex-1 rounded bg-white/30" />
        </div>
      </aside>

      <main className="flex items-center justify-center px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5" noValidate={false}>
          <div className="flex items-center gap-2 font-display text-xl font-extrabold text-navy lg:hidden">
            <Logo className="h-9 w-9 object-contain" /> Gyarados
          </div>

          <div>
            <h1 className="text-3xl font-extrabold">{isLogin ? 'Sign in' : 'Create your account'}</h1>
            <p className="mt-1 text-ink-soft">
              {isLogin ? 'Use your library account to continue.' : 'It takes a minute. You can borrow books straight away.'}
            </p>
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-brick/30 bg-brick-50 p-3 text-sm text-brick">
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {!isLogin && (
            <label className="block text-sm font-medium">Full name
              <input className="input mt-1" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}

          <label className="block text-sm font-medium">Email
            <input className="input mt-1" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <div>
            <label className="block text-sm font-medium">Password
              <input
                className="input mt-1"
                type={show ? 'text' : 'password'}
                required
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show password
            </label>
          </div>

          <button className="btn-primary w-full py-2.5" disabled={busy}>
            {busy ? (isLogin ? 'Signing in…' : 'Creating account…') : isLogin ? 'Sign in' : 'Create account'}
          </button>

    
          <p className="text-center text-sm text-ink-soft">
            {isLogin ? 'New to Gyarados?' : 'Already have an account?'}{' '}
            <Link to={isLogin ? '/register' : '/login'} state={location.state} className="font-medium text-teal hover:underline">
              {isLogin ? 'Create an account' : 'Sign in'}
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
