import { useState } from 'react'
import { useAuth } from './AuthContext'
import { HeaderRight } from './HeaderRight'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const err = await signIn(email, password)
    if (err) { setError(err); setLoading(false) }
  }

  return (
    <div className="page">
      <header className="page-header">
        <span className="page-header-title">Apps</span>
        <HeaderRight />
      </header>
      <div className="page-body" style={{ display: 'flex', justifyContent: 'center', paddingTop: '3rem' }}>
        <div className="card" style={{ width: '100%', maxWidth: 360 }}>
          <h2 style={{ margin: '0 0 1.5rem', fontSize: '1rem', letterSpacing: '0.1em' }}>SIGN IN</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              className="notes-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <input
              className="notes-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            {error && <div style={{ color: '#e07070', fontSize: '0.85rem' }}>{error}</div>}
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
