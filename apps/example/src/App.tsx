import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'

const apps = [
  { name: 'Example', path: '/example', description: 'Starter template' },
]

function Home() {
  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 600, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>willchurcher apps</h1>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {apps.map(app => (
          <li key={app.path} style={{ marginBottom: '1rem' }}>
            <Link to={app.path} style={{ fontSize: '1.2rem' }}>{app.name}</Link>
            <span style={{ marginLeft: '0.75rem', color: '#666' }}>{app.description}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Example() {
  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 600, margin: '2rem auto', padding: '0 1rem' }}>
      <Link to="/">← home</Link>
      <h1>Example</h1>
      <p>Your new app. Edit <code>src/App.tsx</code> to get started.</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/example" element={<Example />} />
      </Routes>
    </BrowserRouter>
  )
}
