import { useState, useEffect, useCallback } from 'react'

// ── Spotify PKCE helpers ───────────────────────────────────────
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined
const SCOPES = 'user-read-private user-read-email playlist-modify-private playlist-modify-public'

function redirectUri() {
  return `${window.location.origin}/music`
}

function genVerifier(): string {
  const arr = new Uint8Array(56)
  crypto.getRandomValues(arr)
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function genChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function startAuth() {
  if (!CLIENT_ID) return
  const verifier = genVerifier()
  const challenge = await genChallenge(verifier)
  sessionStorage.setItem('spotify_verifier', verifier)
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri(),
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  })
  window.location.href = `https://accounts.spotify.com/authorize?${params}`
}

async function exchangeCode(code: string): Promise<string | null> {
  if (!CLIENT_ID) return null
  const verifier = sessionStorage.getItem('spotify_verifier')
  if (!verifier) return null
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(),
      code_verifier: verifier,
    }),
  })
  const data = await res.json()
  sessionStorage.removeItem('spotify_verifier')
  if (data.access_token) {
    sessionStorage.setItem('spotify_token', data.access_token)
    sessionStorage.setItem('spotify_token_exp', String(Date.now() + data.expires_in * 1000))
    return data.access_token
  }
  return null
}

function getToken(): string | null {
  const exp = Number(sessionStorage.getItem('spotify_token_exp') ?? 0)
  if (Date.now() > exp) {
    sessionStorage.removeItem('spotify_token')
    return null
  }
  return sessionStorage.getItem('spotify_token')
}

// ── Types ──────────────────────────────────────────────────────
type Arc = 'flat' | 'build' | 'journey'

interface Vibe {
  id: string
  name: string
  emoji: string
  genres: string[]
  energy: number
  valence: number
  danceability: number
  description: string
}

interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  duration_ms: number
  album: { name: string; images: { url: string }[] }
  uri: string
  external_urls: { spotify: string }
}

// ── Vibe presets ───────────────────────────────────────────────
const VIBES: Vibe[] = [
  { id: 'dark',      name: 'Dark Drive',       emoji: '🌑', genres: ['electronic', 'techno'],        energy: 0.82, valence: 0.22, danceability: 0.75, description: 'Hypnotic, relentless, intense' },
  { id: 'deep',      name: 'Deep Space',       emoji: '🌊', genres: ['ambient', 'electronic'],       energy: 0.45, valence: 0.35, danceability: 0.40, description: 'Vast, introspective, floating' },
  { id: 'euphoric',  name: 'Euphoric',         emoji: '⚡', genres: ['dance', 'house'],              energy: 0.90, valence: 0.80, danceability: 0.88, description: 'Uplifting, bright, peak-time' },
  { id: 'warm',      name: 'Warm & Acoustic',  emoji: '🌅', genres: ['acoustic', 'folk'],            energy: 0.38, valence: 0.72, danceability: 0.45, description: 'Organic, intimate, comforting' },
  { id: 'hiphop',   name: 'Hip-Hop Flow',     emoji: '🎤', genres: ['hip-hop', 'r-n-b'],            energy: 0.65, valence: 0.55, danceability: 0.80, description: 'Rhythmic, confident, smooth' },
  { id: 'jazz',      name: 'Late Night Jazz',  emoji: '🎷', genres: ['jazz', 'soul'],                energy: 0.42, valence: 0.58, danceability: 0.50, description: 'Moody, sophisticated, smoky' },
]

// ── API calls ─────────────────────────────────────────────────
async function spotifyGet(token: string, url: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Spotify API error: ${res.status}`)
  return res.json()
}

async function fetchRecommendations(
  token: string,
  genres: string[],
  energy: number,
  valence: number,
  danceability: number,
  limit: number,
  arc: Arc,
  chapter: 'intro' | 'peak' | 'outro'
): Promise<SpotifyTrack[]> {
  let e = energy, v = valence, d = danceability
  if (arc === 'build') {
    if (chapter === 'intro') { e *= 0.55; d *= 0.65 }
    else if (chapter === 'outro') { e *= 0.85 }
  } else if (arc === 'journey') {
    if (chapter === 'intro') { e *= 0.55; v = Math.min(1, v + 0.15) }
    else if (chapter === 'outro') { e *= 0.60; v = Math.min(1, v + 0.15) }
  }

  const params = new URLSearchParams({
    seed_genres: genres.slice(0, 2).join(','),
    target_energy: e.toFixed(2),
    target_valence: v.toFixed(2),
    target_danceability: d.toFixed(2),
    limit: String(limit),
  })

  const data = await spotifyGet(token, `https://api.spotify.com/v1/recommendations?${params}`)
  return data.tracks ?? []
}

async function getProfile(token: string) {
  return spotifyGet(token, 'https://api.spotify.com/v1/me')
}

async function savePlaylist(token: string, userId: string, name: string, trackUris: string[]) {
  const createRes = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description: 'Generated by Music Planner', public: false }),
  })
  const playlist = await createRes.json()
  await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ uris: trackUris }),
  })
  return playlist
}

// ── Utils ─────────────────────────────────────────────────────
function fmtDuration(ms: number) {
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function totalDuration(tracks: SpotifyTrack[]) {
  const ms = tracks.reduce((a, t) => a + t.duration_ms, 0)
  const m = Math.floor(ms / 60000)
  return `${m}m`
}

// ── Component ─────────────────────────────────────────────────
export default function MusicPlanner() {
  const [token, setToken] = useState<string | null>(null)
  const [profile, setProfile] = useState<{ id: string; display_name: string } | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // intention
  const [selectedVibe, setSelectedVibe] = useState<Vibe | null>(null)
  const [energy, setEnergy] = useState(0.70)
  const [valence, setValence] = useState(0.50)
  const [danceability, setDanceability] = useState(0.65)
  const [duration, setDuration] = useState(60)
  const [arc, setArc] = useState<Arc>('flat')

  // results
  const [tracks, setTracks] = useState<SpotifyTrack[]>([])
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedUrl, setSavedUrl] = useState<string | null>(null)

  // handle OAuth callback + existing token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      window.history.replaceState({}, '', '/music')
      exchangeCode(code).then(tok => {
        setToken(tok)
        setAuthLoading(false)
      })
    } else {
      const tok = getToken()
      setToken(tok)
      setAuthLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token) {
      getProfile(token).then(setProfile).catch(() => {
        setToken(null)
        sessionStorage.removeItem('spotify_token')
      })
    }
  }, [token])

  const selectVibe = useCallback((v: Vibe) => {
    setSelectedVibe(v)
    setEnergy(v.energy)
    setValence(v.valence)
    setDanceability(v.danceability)
    setTracks([])
    setSavedUrl(null)
  }, [])

  const generate = useCallback(async () => {
    if (!token || !selectedVibe) return
    setGenerating(true)
    setGenError(null)
    setSavedUrl(null)
    try {
      const tracksPerMin = 1 / 3.5
      const total = Math.round(duration * tracksPerMin)

      let result: SpotifyTrack[]
      if (arc === 'flat') {
        result = await fetchRecommendations(token, selectedVibe.genres, energy, valence, danceability, Math.min(total, 50), arc, 'peak')
      } else {
        const introCount = Math.round(total * 0.30)
        const peakCount  = Math.round(total * 0.50)
        const outroCount = total - introCount - peakCount
        const [intro, peak, outro] = await Promise.all([
          fetchRecommendations(token, selectedVibe.genres, energy, valence, danceability, Math.min(introCount, 20), arc, 'intro'),
          fetchRecommendations(token, selectedVibe.genres, energy, valence, danceability, Math.min(peakCount, 25), arc, 'peak'),
          fetchRecommendations(token, selectedVibe.genres, energy, valence, danceability, Math.min(outroCount, 15), arc, 'outro'),
        ])
        result = [...intro, ...peak, ...outro]
      }
      setTracks(result)
    } catch (e) {
      setGenError(String(e))
    } finally {
      setGenerating(false)
    }
  }, [token, selectedVibe, energy, valence, danceability, duration, arc])

  const save = useCallback(async () => {
    if (!token || !profile || tracks.length === 0 || !selectedVibe) return
    setSaving(true)
    try {
      const name = `${selectedVibe.name} · ${arc} · ${duration}m`
      const playlist = await savePlaylist(token, profile.id, name, tracks.map(t => t.uri))
      setSavedUrl(playlist.external_urls?.spotify ?? null)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }, [token, profile, tracks, selectedVibe, arc, duration])

  // ── Render: no client ID ──────────────────────────────────
  if (!CLIENT_ID) {
    return (
      <div className="music-planner">
        <div className="music-header">
          <h1 className="music-title">Music Planner</h1>
        </div>
        <div className="card music-setup-msg">
          <p style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>Setup required</p>
          <p style={{ color: 'var(--text2)', fontSize: '0.85rem', lineHeight: 1.6 }}>
            Add <code>VITE_SPOTIFY_CLIENT_ID</code> to your environment variables,
            then register <code>{redirectUri()}</code> as a redirect URI in your Spotify Developer app.
          </p>
        </div>
      </div>
    )
  }

  // ── Render: loading auth ──────────────────────────────────
  if (authLoading) {
    return (
      <div className="music-planner">
        <div className="music-header"><h1 className="music-title">Music Planner</h1></div>
        <div style={{ textAlign: 'center', color: 'var(--muted)', paddingTop: '4rem' }}>connecting…</div>
      </div>
    )
  }

  // ── Render: not connected ─────────────────────────────────
  if (!token) {
    return (
      <div className="music-planner">
        <div className="music-header">
          <h1 className="music-title">Music Planner</h1>
          <p className="music-subtitle">Build a session with intention</p>
        </div>
        <div className="card music-connect-card">
          <div className="music-connect-icon">♫</div>
          <p style={{ color: 'var(--text2)', marginBottom: '1.5rem', lineHeight: 1.6, fontSize: '0.9rem' }}>
            Design a music session by vibe, energy arc, and mood.<br />
            Generate a playlist and save it directly to Spotify.
          </p>
          <button className="btn-spotify" onClick={startAuth}>
            Connect Spotify
          </button>
          <p style={{ color: 'var(--muted-hi)', fontSize: '0.75rem', marginTop: '1rem' }}>
            Requires Spotify Premium for playback
          </p>
        </div>
      </div>
    )
  }

  // ── Render: main planner ──────────────────────────────────
  return (
    <div className="music-planner">
      <div className="music-header">
        <h1 className="music-title">Music Planner</h1>
        {profile && <p className="music-subtitle">{profile.display_name}</p>}
      </div>

      {/* Step 1: Vibe */}
      <section className="music-section">
        <h2 className="music-section-title">01 · Vibe</h2>
        <div className="vibe-grid">
          {VIBES.map(v => (
            <button
              key={v.id}
              className={`vibe-card${selectedVibe?.id === v.id ? ' selected' : ''}`}
              onClick={() => selectVibe(v)}
            >
              <span className="vibe-emoji">{v.emoji}</span>
              <span className="vibe-name">{v.name}</span>
              <span className="vibe-desc">{v.description}</span>
            </button>
          ))}
        </div>
      </section>

      {selectedVibe && (
        <>
          {/* Step 2: Tune */}
          <section className="music-section">
            <h2 className="music-section-title">02 · Tune</h2>
            <div className="card music-sliders">
              <SliderRow
                label="Energy"
                low="chill" high="intense"
                value={energy} onChange={v => { setEnergy(v); setTracks([]); setSavedUrl(null) }}
              />
              <SliderRow
                label="Mood"
                low="dark" high="euphoric"
                value={valence} onChange={v => { setValence(v); setTracks([]); setSavedUrl(null) }}
              />
              <SliderRow
                label="Groove"
                low="free" high="locked"
                value={danceability} onChange={v => { setDanceability(v); setTracks([]); setSavedUrl(null) }}
              />
            </div>
          </section>

          {/* Step 3: Shape */}
          <section className="music-section">
            <h2 className="music-section-title">03 · Session</h2>
            <div className="card music-session-opts">
              <div className="session-row">
                <span className="session-label">Duration</span>
                <div className="session-chips">
                  {[30, 60, 90, 120].map(d => (
                    <button
                      key={d}
                      className={`chip${duration === d ? ' active' : ''}`}
                      onClick={() => { setDuration(d); setTracks([]); setSavedUrl(null) }}
                    >{d}m</button>
                  ))}
                </div>
              </div>
              <div className="session-row">
                <span className="session-label">Arc</span>
                <div className="session-chips">
                  {([
                    { id: 'flat',    label: 'Flat',    hint: 'Consistent energy throughout' },
                    { id: 'build',   label: 'Build',   hint: 'Starts low, rises to peak' },
                    { id: 'journey', label: 'Journey', hint: 'Rises then winds back down' },
                  ] as { id: Arc; label: string; hint: string }[]).map(a => (
                    <button
                      key={a.id}
                      className={`chip${arc === a.id ? ' active' : ''}`}
                      onClick={() => { setArc(a.id); setTracks([]); setSavedUrl(null) }}
                      title={a.hint}
                    >{a.label}</button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Generate */}
          <div style={{ padding: '0 1rem', marginBottom: '1.5rem' }}>
            <button
              className="btn-generate"
              onClick={generate}
              disabled={generating}
            >
              {generating ? 'generating…' : tracks.length ? 'Regenerate' : 'Generate session'}
            </button>
            {genError && (
              <p style={{ color: '#e07070', fontSize: '0.8rem', marginTop: '0.5rem' }}>{genError}</p>
            )}
          </div>
        </>
      )}

      {/* Results */}
      {tracks.length > 0 && (
        <section className="music-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1rem', marginBottom: '0.75rem' }}>
            <h2 className="music-section-title" style={{ margin: 0 }}>
              {tracks.length} tracks · {totalDuration(tracks)}
            </h2>
            {savedUrl ? (
              <a href={savedUrl} target="_blank" rel="noreferrer" className="btn-save saved">
                Open in Spotify ↗
              </a>
            ) : (
              <button className="btn-save" onClick={save} disabled={saving}>
                {saving ? 'saving…' : 'Save to Spotify'}
              </button>
            )}
          </div>
          <div className="track-list">
            {tracks.map((t, i) => (
              <a
                key={t.id + i}
                href={t.external_urls.spotify}
                target="_blank"
                rel="noreferrer"
                className="track-item"
              >
                <span className="track-num">{i + 1}</span>
                {t.album.images[2] && (
                  <img className="track-art" src={t.album.images[2].url} alt="" />
                )}
                <div className="track-info">
                  <span className="track-name">{t.name}</span>
                  <span className="track-artist">{t.artists.map(a => a.name).join(', ')}</span>
                </div>
                <span className="track-dur">{fmtDuration(t.duration_ms)}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      <div style={{ height: '3rem' }} />
    </div>
  )
}

// ── Slider row ─────────────────────────────────────────────────
function SliderRow({
  label, low, high, value, onChange
}: { label: string; low: string; high: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="slider-row">
      <div className="slider-labels">
        <span className="slider-label-main">{label}</span>
        <span className="slider-label-val">{Math.round(value * 100)}%</span>
      </div>
      <div className="slider-ends">
        <span className="slider-end">{low}</span>
        <input
          type="range" min={0} max={100} value={Math.round(value * 100)}
          onChange={e => onChange(Number(e.target.value) / 100)}
          className="slider"
        />
        <span className="slider-end">{high}</span>
      </div>
    </div>
  )
}
