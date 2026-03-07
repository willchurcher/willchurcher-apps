import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeaderRight } from './HeaderRight'
import { loadUsageLog } from './claude-utils'

const PAGE_SIZE = 20

function fmt$(n: number) {
  if (n < 0.01) return '<$0.01'
  return `$${n.toFixed(4)}`
}

function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return `${n}`
}

function fmtDate(ts: number) {
  const d = new Date(ts)
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function shortModel(model: string) {
  return model.replace('claude-', '').replace(/-\d{8}$/, '')
}

export default function ClaudeUsage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)

  const records = useMemo(() => loadUsageLog(), [])

  // Aggregate totals
  const totalCost   = records.reduce((s, r) => s + r.costUsd, 0)
  const totalIn     = records.reduce((s, r) => s + r.inputTokens, 0)
  const totalOut    = records.reduce((s, r) => s + r.outputTokens, 0)

  // By-app breakdown
  const byApp = useMemo(() => {
    const map: Record<string, { requests: number; inputTokens: number; outputTokens: number; costUsd: number }> = {}
    for (const r of records) {
      if (!map[r.app]) map[r.app] = { requests: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 }
      map[r.app].requests++
      map[r.app].inputTokens  += r.inputTokens
      map[r.app].outputTokens += r.outputTokens
      map[r.app].costUsd      += r.costUsd
    }
    return Object.entries(map).sort((a, b) => b[1].costUsd - a[1].costUsd)
  }, [records])

  // Pagination
  const pageCount = Math.ceil(records.length / PAGE_SIZE)
  const pageRows  = records.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-left">
          <button className="back-btn" onClick={() => navigate('/')}>‹ Home</button>
          <span className="page-header-title">Claude Usage</span>
        </div>
        <HeaderRight />
      </header>

      <div className="page-body cu-body">
        {records.length === 0 ? (
          <div className="cu-empty">
            <p>No usage logged yet.</p>
            <p className="cu-empty-hint">Usage is recorded when apps call the Claude API via this site.</p>
          </div>
        ) : (<>

          {/* Summary stats */}
          <div className="cu-stats">
            <div className="cu-stat-card">
              <span className="cu-stat-val">{fmt$(totalCost)}</span>
              <span className="cu-stat-label">Total spent</span>
            </div>
            <div className="cu-stat-card">
              <span className="cu-stat-val">{records.length}</span>
              <span className="cu-stat-label">Requests</span>
            </div>
            <div className="cu-stat-card">
              <span className="cu-stat-val">{fmtTokens(totalIn + totalOut)}</span>
              <span className="cu-stat-label">Total tokens</span>
            </div>
            <div className="cu-stat-card">
              <span className="cu-stat-val">{fmtTokens(totalIn)}</span>
              <span className="cu-stat-label">Input</span>
            </div>
            <div className="cu-stat-card">
              <span className="cu-stat-val">{fmtTokens(totalOut)}</span>
              <span className="cu-stat-label">Output</span>
            </div>
          </div>

          {/* By-app table */}
          {byApp.length > 0 && (
            <div className="card cu-section">
              <div className="cu-section-title">By App</div>
              <table className="cu-table">
                <thead>
                  <tr>
                    <th>App</th>
                    <th className="cu-right">Requests</th>
                    <th className="cu-right">In</th>
                    <th className="cu-right">Out</th>
                    <th className="cu-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {byApp.map(([app, s]) => (
                    <tr key={app}>
                      <td className="cu-app-name">{app}</td>
                      <td className="cu-right">{s.requests}</td>
                      <td className="cu-right">{fmtTokens(s.inputTokens)}</td>
                      <td className="cu-right">{fmtTokens(s.outputTokens)}</td>
                      <td className="cu-right cu-cost">{fmt$(s.costUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Request log */}
          <div className="card cu-section">
            <div className="cu-section-title">
              Request Log
              <span className="cu-section-count">{records.length} total</span>
            </div>
            <table className="cu-table cu-log-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>App</th>
                  <th>Model</th>
                  <th className="cu-right">In</th>
                  <th className="cu-right">Out</th>
                  <th className="cu-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(r => (
                  <tr key={r.id}>
                    <td className="cu-time">{fmtDate(r.timestamp)}</td>
                    <td className="cu-app-name">{r.app}</td>
                    <td className="cu-model">{shortModel(r.model)}</td>
                    <td className="cu-right">{fmtTokens(r.inputTokens)}</td>
                    <td className="cu-right">{fmtTokens(r.outputTokens)}</td>
                    <td className="cu-right cu-cost">{fmt$(r.costUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pageCount > 1 && (
              <div className="cu-pagination">
                <button
                  className="cu-page-btn"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >‹ Prev</button>
                <span className="cu-page-info">Page {page + 1} / {pageCount}</span>
                <button
                  className="cu-page-btn"
                  onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
                  disabled={page === pageCount - 1}
                >Next ›</button>
              </div>
            )}
          </div>

          <p className="cu-note">
            Costs are estimated based on public Anthropic pricing. Actual charges may differ.
          </p>
        </>)}
      </div>
    </div>
  )
}
