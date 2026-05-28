// sign-in.jsx — Real Supabase auth. Email + password, sign up or sign in.

function SignIn({ onSignIn }) {
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode]       = useState('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSignIn({ name, email, password, isNew: mode === 'signup' });
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card fade-in">
        <div className="brand" style={{ marginBottom: 24 }}>
          <span className="mark"></span>
          <span>Brackt</span>
          <span className="tag muted" style={{ marginLeft: 'auto' }}>2026</span>
        </div>
        <div className="ttl">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</div>
        <div className="sub">
          {mode === 'signin'
            ? 'Sign in to build brackets, run pools, and pick the winners.'
            : 'Start with a free account — make as many brackets as you want.'}
        </div>

        {error && (
          <div style={{
            background: 'color-mix(in oklch, var(--danger) 12%, var(--bg))',
            border: '1px solid var(--danger)', borderRadius: 'var(--r-md)',
            padding: '10px 14px', fontSize: 13, color: 'var(--danger)',
            marginBottom: 14,
          }}>
            {error}
          </div>
        )}

        <form className="form" onSubmit={submit}>
          {mode === 'signup' && (
            <label className="field">
              <span className="lbl">Display name</span>
              <input className="input" placeholder="e.g. Alex Morgan"
                value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
          )}
          <label className="field">
            <span className="lbl">Email</span>
            <input className="input" type="email" placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="field">
            <span className="lbl">Password</span>
            <input className="input" type="password" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={6} />
          </label>

          <div className="row-actions">
            <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
              style={{ fontSize: 12, color: 'var(--fg-2)' }}>
              {mode === 'signin' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
            </a>
            <button className="btn primary" type="submit" disabled={loading}
              style={{ opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Please wait…' : (mode === 'signin' ? 'Sign in →' : 'Create account →')}
            </button>
          </div>

          {mode === 'signup' && (
            <div className="muted" style={{ fontSize: 11, marginTop: 10, textAlign: 'center' }}>
              You'll receive a confirmation email — check your inbox.
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

Object.assign(window, { SignIn });
