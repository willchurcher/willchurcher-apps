import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeaderRight } from './HeaderRight'

// ── Black-Scholes Math ──────────────────────────────────────────────────────

// Abramowitz & Stegun approximation, max error 1.5e-7
function ncdf(x: number): number {
  const s = x < 0 ? -1 : 1
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2)
  const p = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))))
  return 0.5 * (1 + s * (1 - p * Math.exp(-0.5 * x * x)))
}

function npdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)
}

type Moneyness = 'deep-itm' | 'itm' | 'atm' | 'otm' | 'deep-otm'

interface Greeks {
  call: number; put: number
  deltaCall: number; deltaPut: number
  gamma: number; vega: number
  thetaCall: number; thetaPut: number
  rhoCall: number; rhoPut: number
  callIntrinsic: number; putIntrinsic: number
  callTV: number; putTV: number
  moneyness: Moneyness
}

function bsCalc(S: number, K: number, r: number, sigma: number, T: number): Greeks {
  const ci = Math.max(S - K, 0), pi = Math.max(K - S, 0)
  const ratio = S / K
  const moneyness: Moneyness =
    ratio > 1.10 ? 'deep-itm' : ratio > 1.02 ? 'itm' :
    ratio > 0.98 ? 'atm' : ratio > 0.90 ? 'otm' : 'deep-otm'

  if (T < 0.001 || sigma < 0.001 || S <= 0 || K <= 0) {
    return {
      call: ci, put: pi,
      deltaCall: ratio > 1 ? 1 : ratio < 1 ? 0 : 0.5,
      deltaPut: ratio > 1 ? 0 : ratio < 1 ? -1 : -0.5,
      gamma: 0, vega: 0, thetaCall: 0, thetaPut: 0, rhoCall: 0, rhoPut: 0,
      callIntrinsic: ci, putIntrinsic: pi, callTV: 0, putTV: 0, moneyness,
    }
  }

  const sqrtT = Math.sqrt(T)
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT)
  const d2 = d1 - sigma * sqrtT
  const Nd1 = ncdf(d1), Nd2 = ncdf(d2), Nm1 = ncdf(-d1), Nm2 = ncdf(-d2)
  const phi = npdf(d1)
  const disc = K * Math.exp(-r * T)

  const call = S * Nd1 - disc * Nd2
  const put  = disc * Nm2 - S * Nm1

  return {
    call, put,
    deltaCall: Nd1,
    deltaPut: Nd1 - 1,
    gamma: phi / (S * sigma * sqrtT),
    vega: S * phi * sqrtT / 100,
    thetaCall: (-S * phi * sigma / (2 * sqrtT) - r * disc * Nd2) / 365,
    thetaPut:  (-S * phi * sigma / (2 * sqrtT) + r * disc * Nm2) / 365,
    rhoCall:   disc * T * Nd2  / 100,
    rhoPut:   -disc * T * Nm2  / 100,
    callIntrinsic: ci, putIntrinsic: pi,
    callTV: Math.max(call - ci, 0), putTV: Math.max(put - pi, 0),
    moneyness,
  }
}

function greekVal(g: Greeks, greek: string, type: 'call' | 'put'): number {
  if (greek === 'delta') return type === 'call' ? g.deltaCall : g.deltaPut
  if (greek === 'gamma') return g.gamma
  if (greek === 'vega')  return g.vega
  if (greek === 'theta') return type === 'call' ? g.thetaCall : g.thetaPut
  return 0
}

// ── SVG Chart primitives ────────────────────────────────────────────────────

const CW = 320, CH = 180
const M = { t: 12, r: 10, b: 30, l: 44 }
const PW = CW - M.l - M.r
const PH = CH - M.t - M.b

function toX(v: number, lo: number, hi: number) { return M.l + (v - lo) / (hi - lo) * PW }
function toY(v: number, lo: number, hi: number) { return M.t + PH - (v - lo) / (hi - lo) * PH }

function svgPath(pts: [number, number][]): string {
  const valid = pts.filter(([x, y]) => isFinite(x) && isFinite(y))
  if (valid.length === 0) return ''
  return valid.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

// ── Slider row ──────────────────────────────────────────────────────────────

function SliderRow({ label, value, min, max, step, display, onChange }: {
  label: string; value: number; min: number; max: number; step: number
  display: string; onChange: (v: number) => void
}) {
  return (
    <div className="opt-slider-row">
      <span className="opt-slider-lbl">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
      />
      <span className="opt-slider-val">{display}</span>
    </div>
  )
}

// ── Delta chart ─────────────────────────────────────────────────────────────

function DeltaChart({ data, spot, strike }: {
  data: { S: number; deltaCall: number; deltaPut: number }[]
  spot: number; strike: number
}) {
  if (!data.length) return null
  const xMin = data[0].S, xMax = data[data.length - 1].S
  const yMin = -1, yMax = 1
  const x = (v: number) => toX(v, xMin, xMax)
  const y = (v: number) => toY(v, yMin, yMax)

  const callPts: [number, number][] = data.map(d => [x(d.S), y(clamp(d.deltaCall, yMin, yMax))])
  const putPts:  [number, number][] = data.map(d => [x(d.S), y(clamp(d.deltaPut,  yMin, yMax))])

  const yTicks = [-1, -0.5, 0, 0.5, 1]
  const xLabels = [xMin, strike, xMax].map(v => ({ v, label: Math.round(v).toString() }))
  const sx = clamp(spot, xMin, xMax)

  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: '100%', display: 'block' }}>
      {/* Grid */}
      {yTicks.map(yv => (
        <g key={yv}>
          <line x1={M.l} x2={M.l + PW} y1={y(yv)} y2={y(yv)}
            stroke="var(--border)" strokeWidth={yv === 0 ? 1 : 0.5} />
          <text x={M.l - 4} y={y(yv)} textAnchor="end" dominantBaseline="middle"
            fill="var(--text2)" fontSize={9}>{yv}</text>
        </g>
      ))}
      {/* X labels */}
      {xLabels.map(({ v, label }) => (
        <text key={v} x={x(v)} y={M.t + PH + 16} textAnchor="middle"
          fill="var(--text2)" fontSize={9}>{label}</text>
      ))}
      {/* Strike */}
      <line x1={x(strike)} x2={x(strike)} y1={M.t} y2={M.t + PH}
        stroke="#e8b53a" strokeWidth={1} strokeDasharray="4,3" />
      <text x={x(strike)} y={M.t - 3} textAnchor="middle" fill="#e8b53a" fontSize={8}>K</text>
      {/* Current spot */}
      <line x1={x(sx)} x2={x(sx)} y1={M.t} y2={M.t + PH}
        stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="3,3" />
      <text x={x(sx)} y={M.t - 3} textAnchor="middle" fill="var(--accent)" fontSize={8}>S</text>
      {/* Lines */}
      <path d={svgPath(callPts)} fill="none" stroke="var(--accent)" strokeWidth={2} />
      <path d={svgPath(putPts)}  fill="none" stroke="#c878a0" strokeWidth={2} />
    </svg>
  )
}

// ── Gamma chart ─────────────────────────────────────────────────────────────

function GammaChart({ data, spot, strike }: {
  data: { S: number; gamma: number }[]
  spot: number; strike: number
}) {
  if (!data.length) return null
  const xMin = data[0].S, xMax = data[data.length - 1].S
  const maxG = Math.max(...data.map(d => d.gamma), 0.001)
  const yMin = 0, yMax = maxG * 1.15
  const x = (v: number) => toX(v, xMin, xMax)
  const y = (v: number) => toY(v, yMin, yMax)

  const gammaPts: [number, number][] = data.map(d => [x(d.S), y(clamp(d.gamma, yMin, yMax))])
  const fillPath = `${svgPath(gammaPts)} L${x(xMax)},${y(0)} L${x(xMin)},${y(0)} Z`

  const yTicks = [0, maxG * 0.5, maxG].map(v => ({
    v, label: v < 0.001 ? '0' : v.toFixed(v < 0.01 ? 4 : 3),
  }))
  const xLabels = [xMin, strike, xMax].map(v => ({ v, label: Math.round(v).toString() }))
  const sx = clamp(spot, xMin, xMax)

  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: '100%', display: 'block' }}>
      {yTicks.map(({ v, label }) => (
        <g key={v}>
          <line x1={M.l} x2={M.l + PW} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={0.5} />
          <text x={M.l - 4} y={y(v)} textAnchor="end" dominantBaseline="middle"
            fill="var(--text2)" fontSize={8}>{label}</text>
        </g>
      ))}
      {xLabels.map(({ v, label }) => (
        <text key={v} x={x(v)} y={M.t + PH + 16} textAnchor="middle"
          fill="var(--text2)" fontSize={9}>{label}</text>
      ))}
      <line x1={x(strike)} x2={x(strike)} y1={M.t} y2={M.t + PH}
        stroke="#e8b53a" strokeWidth={1} strokeDasharray="4,3" />
      <text x={x(strike)} y={M.t - 3} textAnchor="middle" fill="#e8b53a" fontSize={8}>K</text>
      <line x1={x(sx)} x2={x(sx)} y1={M.t} y2={M.t + PH}
        stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="3,3" />
      <text x={x(sx)} y={M.t - 3} textAnchor="middle" fill="var(--accent)" fontSize={8}>S</text>
      <path d={fillPath} fill="rgba(232,181,58,0.15)" />
      <path d={svgPath(gammaPts)} fill="none" stroke="#e8b53a" strokeWidth={2} />
    </svg>
  )
}

// ── Payoff chart ────────────────────────────────────────────────────────────

function PayoffChart({ data, spot, strike, type }: {
  data: { S: number; callBS: number; callPayoff: number; putBS: number; putPayoff: number }[]
  spot: number; strike: number; type: 'call' | 'put'
}) {
  if (!data.length) return null
  const xMin = data[0].S, xMax = data[data.length - 1].S

  const bsArr      = data.map(d => type === 'call' ? d.callBS      : d.putBS)
  const intrinsArr = data.map(d => type === 'call' ? d.callPayoff  : d.putPayoff)

  const yMax = Math.max(...bsArr, ...intrinsArr, 1) * 1.12
  const yMin = 0
  const x = (v: number) => toX(v, xMin, xMax)
  const y = (v: number) => toY(v, yMin, yMax)

  const bsPts:      [number, number][] = data.map((d, i) => [x(d.S), y(clamp(bsArr[i], yMin, yMax))])
  const intrinsPts: [number, number][] = data.map((d, i) => [x(d.S), y(clamp(intrinsArr[i], yMin, yMax))])

  // Time value fill: BS curve forward, intrinsic curve backward
  const tvFill = `${svgPath(bsPts)} ${[...data].reverse().map(d =>
    `L${x(d.S)},${y(clamp(type === 'call' ? d.callPayoff : d.putPayoff, yMin, yMax))}`
  ).join(' ')} Z`

  const color = type === 'call' ? 'var(--accent)' : '#c878a0'
  const fillColor = type === 'call' ? 'rgba(126,184,212,0.18)' : 'rgba(200,120,160,0.18)'

  const yTicks = [0, Math.round(yMax / 2), Math.round(yMax)].map(v => ({
    v, label: v.toFixed(0),
  }))
  const xLabels = [xMin, strike, xMax].map(v => ({ v, label: Math.round(v).toString() }))
  const sx = clamp(spot, xMin, xMax)

  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: '100%', display: 'block' }}>
      {yTicks.map(({ v, label }) => (
        <g key={v}>
          <line x1={M.l} x2={M.l + PW} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={0.5} />
          <text x={M.l - 4} y={y(v)} textAnchor="end" dominantBaseline="middle"
            fill="var(--text2)" fontSize={9}>{label}</text>
        </g>
      ))}
      {xLabels.map(({ v, label }) => (
        <text key={v} x={x(v)} y={M.t + PH + 16} textAnchor="middle"
          fill="var(--text2)" fontSize={9}>{label}</text>
      ))}
      {/* Strike */}
      <line x1={x(strike)} x2={x(strike)} y1={M.t} y2={M.t + PH}
        stroke="#e8b53a" strokeWidth={1} strokeDasharray="4,3" />
      <text x={x(strike)} y={M.t - 3} textAnchor="middle" fill="#e8b53a" fontSize={8}>K</text>
      {/* Current spot */}
      <line x1={x(sx)} x2={x(sx)} y1={M.t} y2={M.t + PH}
        stroke={color} strokeWidth={1.5} strokeDasharray="3,3" />
      <text x={x(sx)} y={M.t - 3} textAnchor="middle" fill={color} fontSize={8}>S</text>
      {/* Time value fill */}
      <path d={tvFill} fill={fillColor} />
      {/* Payoff at expiry */}
      <path d={svgPath(intrinsPts)} fill="none" stroke={color} strokeWidth={1.5}
        strokeDasharray="5,3" opacity={0.55} />
      {/* BS price */}
      <path d={svgPath(bsPts)} fill="none" stroke={color} strokeWidth={2.2} />
    </svg>
  )
}

// ── Sensitivity chart ───────────────────────────────────────────────────────

function SensChart({ data, greek, param, currentX }: {
  data: { x: number; yCall: number; yPut: number }[]
  greek: string; param: string; currentX: number
}) {
  if (!data.length) return null
  const xMin = data[0].x, xMax = data[data.length - 1].x
  const allY = data.flatMap(d => [d.yCall, d.yPut]).filter(isFinite)
  const rawYMin = Math.min(...allY), rawYMax = Math.max(...allY)
  const pad = Math.max((rawYMax - rawYMin) * 0.12, 0.001)
  const yMin = rawYMin - pad, yMax = rawYMax + pad

  const x = (v: number) => toX(v, xMin, xMax)
  const y = (v: number) => toY(v, yMin, yMax)

  const callPts: [number, number][] = data.map(d => [x(d.x), y(clamp(d.yCall, yMin, yMax))])
  const putPts:  [number, number][] = data.map(d => [x(d.x), y(clamp(d.yPut,  yMin, yMax))])

  const yTicks = [rawYMin, (rawYMin + rawYMax) / 2, rawYMax].map(v => ({
    v, label: Math.abs(v) < 0.0001 ? '0' : v.toFixed(Math.abs(v) < 0.1 ? 4 : Math.abs(v) < 10 ? 3 : 1),
  }))
  const xTicks = [xMin, (xMin + xMax) / 2, xMax].map(v => ({
    v, label: v.toFixed(param === 'vol' ? 0 : param === 'time' ? 0 : 0),
  }))

  const isSame = greek === 'gamma' || greek === 'vega'
  const sx = clamp(currentX, xMin, xMax)

  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: '100%', display: 'block' }}>
      {yTicks.map(({ v, label }) => (
        <g key={v}>
          <line x1={M.l} x2={M.l + PW} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={0.5} />
          <text x={M.l - 4} y={y(v)} textAnchor="end" dominantBaseline="middle"
            fill="var(--text2)" fontSize={8}>{label}</text>
        </g>
      ))}
      {xTicks.map(({ v, label }) => (
        <text key={v} x={x(v)} y={M.t + PH + 16} textAnchor="middle"
          fill="var(--text2)" fontSize={9}>{label}</text>
      ))}
      {/* Current param value */}
      <line x1={x(sx)} x2={x(sx)} y1={M.t} y2={M.t + PH}
        stroke="var(--accent)" strokeWidth={1} strokeDasharray="3,3" opacity={0.7} />
      {/* Zero line if relevant */}
      {rawYMin < 0 && rawYMax > 0 && (
        <line x1={M.l} x2={M.l + PW} y1={y(0)} y2={y(0)}
          stroke="var(--text2)" strokeWidth={0.8} />
      )}
      {isSame
        ? <path d={svgPath(callPts)} fill="none" stroke="#e8b53a" strokeWidth={2} />
        : <>
            <path d={svgPath(callPts)} fill="none" stroke="var(--accent)" strokeWidth={2} />
            <path d={svgPath(putPts)}  fill="none" stroke="#c878a0" strokeWidth={2} />
          </>
      }
    </svg>
  )
}

// ── Moneyness data ──────────────────────────────────────────────────────────

const MONEYNESS_LABEL: Record<Moneyness, string> = {
  'deep-itm': 'Deep In the Money',
  'itm':      'In the Money',
  'atm':      'At the Money',
  'otm':      'Out of the Money',
  'deep-otm': 'Deep Out of the Money',
}

const MONEYNESS_INTUITION: Record<Moneyness, string> = {
  'deep-itm': 'Δ → 1: moves almost 1:1 with spot. Low Γ & ν — vol changes matter less. Mostly intrinsic. Rho matters more.',
  'itm':      'Δ > 0.5: significant directional exposure. Mix of intrinsic and time value.',
  'atm':      'Δ ≈ 0.5: highest Γ and ν. Maximum time value. Most sensitive to vol — ATM straddles are the purest vol trade.',
  'otm':      'Δ < 0.5: no intrinsic value, all time value. Still meaningful Γ and ν. Higher % sensitivity to vol changes.',
  'deep-otm': 'Δ → 0: tiny directional exposure. Almost pure time value (lottery ticket). Very small Γ and ν.',
}

// ── Tab: Pricer ─────────────────────────────────────────────────────────────

function fmt(v: number, dp = 4): string {
  if (!isFinite(v)) return '—'
  return v.toFixed(dp)
}

function PricerTab({ result, spot, strike, rate, timeYrs }: {
  result: Greeks; spot: number; strike: number; rate: number; timeYrs: number
}) {
  const g = result
  const pcpLeft  = g.call - g.put
  const pcpRight = spot - strike * Math.exp(-rate * timeYrs)
  const pcpMatch = Math.abs(pcpLeft - pcpRight) < 0.0001

  const greekRows = [
    {
      sym: 'Δ', name: 'Delta',
      call: fmt(g.deltaCall, 4), put: fmt(g.deltaPut, 4),
      callNeg: false, putNeg: g.deltaPut < 0,
      hint: 'Change in option price per £1 move in spot',
    },
    {
      sym: 'Γ', name: 'Gamma',
      call: fmt(g.gamma, 5), put: fmt(g.gamma, 5),
      callNeg: false, putNeg: false,
      same: true,
      hint: 'Rate of change of Δ — highest ATM',
    },
    {
      sym: 'ν', name: 'Vega',
      call: fmt(g.vega, 4), put: fmt(g.vega, 4),
      callNeg: false, putNeg: false,
      same: true,
      hint: 'Change per 1% move in implied vol',
    },
    {
      sym: 'Θ', name: 'Theta',
      call: fmt(g.thetaCall, 4), put: fmt(g.thetaPut, 4),
      callNeg: g.thetaCall < 0, putNeg: g.thetaPut < 0,
      hint: 'Daily time decay (negative = option loses value)',
    },
    {
      sym: 'ρ', name: 'Rho',
      call: fmt(g.rhoCall, 4), put: fmt(g.rhoPut, 4),
      callNeg: g.rhoCall < 0, putNeg: g.rhoPut < 0,
      hint: 'Change per 1% move in risk-free rate',
    },
  ]

  return (
    <div>
      {/* Moneyness */}
      <div className={`opt-badge opt-badge-${g.moneyness}`}>
        {MONEYNESS_LABEL[g.moneyness]}
      </div>
      <p className="opt-intuition">{MONEYNESS_INTUITION[g.moneyness]}</p>

      {/* Prices */}
      <div className="opt-price-row">
        <div className="opt-price-card">
          <div className="opt-price-label">Call (C)</div>
          <div className="opt-price-value">{fmt(g.call, 2)}</div>
          <div className="opt-price-sub">Intrinsic {fmt(g.callIntrinsic, 2)} · Time {fmt(g.callTV, 2)}</div>
        </div>
        <div className="opt-price-card opt-price-card-put">
          <div className="opt-price-label">Put (P)</div>
          <div className="opt-price-value opt-price-value-put">{fmt(g.put, 2)}</div>
          <div className="opt-price-sub">Intrinsic {fmt(g.putIntrinsic, 2)} · Time {fmt(g.putTV, 2)}</div>
        </div>
      </div>

      {/* Put-call parity */}
      <div className="card" style={{ marginBottom: 10, padding: '10px 12px' }}>
        <div style={{ fontSize: '0.68rem', color: 'var(--text2)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>
          Put-call parity check {pcpMatch ? '✓' : '✗'}
        </div>
        <div className="opt-pcp">
          <span className="opt-pcp-label">C − P</span>
          <span className="opt-pcp-val">{fmt(pcpLeft, 4)}</span>
        </div>
        <div className="opt-pcp">
          <span className="opt-pcp-label">S − K·e^(−rT)</span>
          <span className="opt-pcp-val">{fmt(pcpRight, 4)}</span>
        </div>
      </div>

      {/* Greeks */}
      <div className="card" style={{ padding: '8px 0' }}>
        <table className="opt-greeks">
          <thead>
            <tr>
              <th></th>
              <th>Greek</th>
              <th>Call</th>
              <th>Put</th>
            </tr>
          </thead>
          <tbody>
            {greekRows.map(row => (
              <tr key={row.name} title={row.hint}>
                <td style={{ color: 'var(--accent)', fontStyle: 'italic', padding: '5px 6px 5px 10px' }}>{row.sym}</td>
                <td style={{ color: 'var(--text2)', fontSize: '0.72rem', padding: '5px 6px' }}>{row.name}</td>
                {'same' in row
                  ? <td colSpan={2} className={row.callNeg ? 'opt-td-neg' : 'opt-td-val'}>{row.call}</td>
                  : <>
                      <td className={row.callNeg ? 'opt-td-neg' : 'opt-td-val'}>{row.call}</td>
                      <td className={row.putNeg  ? 'opt-td-neg' : 'opt-td-val'}>{row.put}</td>
                    </>
                }
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: '0.65rem', color: 'var(--text2)', padding: '6px 10px 2px', fontFamily: 'var(--font-mono)' }}>
          Vega/Theta/Rho per 1% vol/rate change, per day for Theta.
        </p>
      </div>
    </div>
  )
}

// ── Tab: Profile ─────────────────────────────────────────────────────────────

function ProfileTab({ spot, strike, rate, vol, timeYrs }: {
  spot: number; strike: number; rate: number; vol: number; timeYrs: number
}) {
  const profileData = useMemo(() => {
    const sMin = strike * 0.4, sMax = strike * 1.8, N = 100
    return Array.from({ length: N }, (_, i) => {
      const S = sMin + (sMax - sMin) * i / (N - 1)
      const g = bsCalc(S, strike, rate, vol, timeYrs)
      return { S, deltaCall: g.deltaCall, deltaPut: g.deltaPut, gamma: g.gamma }
    })
  }, [strike, rate, vol, timeYrs])

  return (
    <div>
      <div className="opt-chart-wrap">
        <div className="opt-chart-title">Delta profile — how Δ varies with spot price</div>
        <DeltaChart data={profileData} spot={spot} strike={strike} />
        <div className="opt-legend">
          <span className="opt-legend-item">
            <span className="opt-legend-line" style={{ background: 'var(--accent)' }} /> Call Δ
          </span>
          <span className="opt-legend-item">
            <span className="opt-legend-line" style={{ background: '#c878a0' }} /> Put Δ
          </span>
          <span className="opt-legend-item">
            <span className="opt-legend-line" style={{ background: 'none', borderTop: '1px dashed #e8b53a' }} /> K
          </span>
        </div>
      </div>

      <p className="opt-insight">
        Delta follows an S-curve from 0 → 1 for calls (−1 → 0 for puts) as spot moves through strike.
        Deep ITM calls have Δ ≈ 1 (behave like stock). Deep OTM calls have Δ ≈ 0.
      </p>

      <div className="opt-chart-wrap">
        <div className="opt-chart-title">Gamma profile — rate of change of Δ</div>
        <GammaChart data={profileData} spot={spot} strike={strike} />
        <div className="opt-legend">
          <span className="opt-legend-item">
            <span className="opt-legend-line" style={{ background: '#e8b53a' }} /> Γ (call = put)
          </span>
        </div>
      </div>

      <p className="opt-insight">
        Gamma peaks at-the-money and drops toward zero deep ITM or OTM.
        High gamma = delta changes rapidly = more frequent hedging required.
        Gamma also spikes as expiry approaches (for ATM options).
      </p>
    </div>
  )
}

// ── Tab: Payoff ──────────────────────────────────────────────────────────────

function PayoffTab({ spot, strike, rate, vol, timeYrs }: {
  spot: number; strike: number; rate: number; vol: number; timeYrs: number
}) {
  const [optType, setOptType] = useState<'call' | 'put'>('call')

  const payoffData = useMemo(() => {
    const sMin = strike * 0.4, sMax = strike * 1.8, N = 100
    return Array.from({ length: N }, (_, i) => {
      const S = sMin + (sMax - sMin) * i / (N - 1)
      const g = bsCalc(S, strike, rate, vol, timeYrs)
      return { S, callBS: g.call, callPayoff: g.callIntrinsic, putBS: g.put, putPayoff: g.putIntrinsic }
    })
  }, [strike, rate, vol, timeYrs])

  const color = optType === 'call' ? 'var(--accent)' : '#c878a0'

  return (
    <div>
      <div className="opt-type-toggle">
        <button
          className={`opt-type-btn${optType === 'call' ? ' active' : ''}`}
          onClick={() => setOptType('call')}
        >Call</button>
        <button
          className={`opt-type-btn opt-type-btn-put${optType === 'put' ? ' active active-put' : ''}`}
          onClick={() => setOptType('put')}
        >Put</button>
      </div>

      <div className="opt-chart-wrap">
        <div className="opt-chart-title">
          {optType === 'call' ? 'Call' : 'Put'} payoff — BS price vs intrinsic value
        </div>
        <PayoffChart data={payoffData} spot={spot} strike={strike} type={optType} />
        <div className="opt-legend">
          <span className="opt-legend-item">
            <span className="opt-legend-line" style={{ background: color }} /> BS Price (now)
          </span>
          <span className="opt-legend-item">
            <span className="opt-legend-line" style={{ background: color, opacity: 0.5, borderTop: '1px dashed', height: 0 }} /> Payoff at expiry
          </span>
          <span className="opt-legend-item">
            <span style={{ width: 12, height: 8, display: 'inline-block', background: optType === 'call' ? 'rgba(126,184,212,0.3)' : 'rgba(200,120,160,0.3)', borderRadius: 2, marginRight: 4 }} />
            Time value
          </span>
        </div>
      </div>

      <p className="opt-insight">
        The shaded region is <strong>time value</strong> — always ≥ 0 since a rational holder won't exercise early.
        As expiry approaches (reduce T), the BS price curve hugs the intrinsic hockey stick.
        That erosion is <strong>Theta</strong>.
      </p>
    </div>
  )
}

// ── Tab: Sensitivity ─────────────────────────────────────────────────────────

const GREEK_OPTS = [
  { v: 'delta', label: 'Delta (Δ)' },
  { v: 'gamma', label: 'Gamma (Γ)' },
  { v: 'vega',  label: 'Vega (ν)' },
  { v: 'theta', label: 'Theta (Θ)' },
]
const PARAM_OPTS = [
  { v: 'vol',  label: 'Implied vol (σ)' },
  { v: 'time', label: 'Time to expiry' },
  { v: 'spot', label: 'Spot price (S)' },
]

const SENS_INSIGHTS: Record<string, Record<string, string>> = {
  delta: {
    vol:  'Higher vol flattens the delta curve — ATM delta stays ~0.5, but ITM/OTM deltas converge toward it.',
    time: 'As expiry approaches, delta becomes binary: it rushes to 1 (ITM) or 0 (OTM).',
    spot: 'Delta follows the familiar S-curve through strike — same as the Profile tab.',
  },
  gamma: {
    vol:  'Lower vol concentrates gamma in a tighter spike around ATM. Higher vol spreads it out.',
    time: 'Gamma explodes near expiry for ATM options — delta can flip rapidly with small spot moves.',
    spot: 'Bell-shaped profile peaking at ATM — same as the Profile tab.',
  },
  vega: {
    vol:  'Vega is roughly constant across vol (Vega of vega — "vomma" — is second order).',
    time: 'Longer-dated options have more vega — more time for vol to move the price.',
    spot: 'Vega peaks ATM and fades for deep ITM/OTM — same as gamma, same intuition.',
  },
  theta: {
    vol:  'Higher vol increases time value, so there\'s more to decay — ATM theta grows with vol.',
    time: 'Theta accelerates as expiry approaches for ATM options (the gamma/theta tradeoff).',
    spot: 'Theta is most negative ATM (most time value to decay). Deep ITM/OTM have less theta.',
  },
}

function SensitivityTab({ spot, strike, rate, vol, timeYrs }: {
  spot: number; strike: number; rate: number; vol: number; timeYrs: number
}) {
  const [greek, setGreek] = useState('delta')
  const [param, setParam] = useState('vol')

  const { sensData, currentX } = useMemo(() => {
    const N = 80
    const pts: { x: number; yCall: number; yPut: number }[] = []

    if (param === 'vol') {
      for (let i = 0; i < N; i++) {
        const v = 0.05 + 0.95 * i / (N - 1)
        const g = bsCalc(spot, strike, rate, v, timeYrs)
        pts.push({ x: v * 100, yCall: greekVal(g, greek, 'call'), yPut: greekVal(g, greek, 'put') })
      }
      return { sensData: pts, currentX: vol * 100 }
    }

    if (param === 'time') {
      for (let i = 0; i < N; i++) {
        const t = 0.01 + 2.49 * i / (N - 1)
        const g = bsCalc(spot, strike, rate, vol, t)
        pts.push({ x: t * 12, yCall: greekVal(g, greek, 'call'), yPut: greekVal(g, greek, 'put') })
      }
      return { sensData: pts, currentX: timeYrs * 12 }
    }

    // spot
    const sMin = strike * 0.4, sMax = strike * 1.8
    for (let i = 0; i < N; i++) {
      const S = sMin + (sMax - sMin) * i / (N - 1)
      const g = bsCalc(S, strike, rate, vol, timeYrs)
      pts.push({ x: S, yCall: greekVal(g, greek, 'call'), yPut: greekVal(g, greek, 'put') })
    }
    return { sensData: pts, currentX: spot }
  }, [spot, strike, rate, vol, timeYrs, greek, param])

  const isSame = greek === 'gamma' || greek === 'vega'
  const insight = SENS_INSIGHTS[greek]?.[param] ?? ''

  return (
    <div>
      <div className="opt-sens-controls">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <label style={{ fontSize: '0.68rem', color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>Greek</label>
          <select className="opt-sens-select" value={greek} onChange={e => setGreek(e.target.value)}>
            {GREEK_OPTS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <label style={{ fontSize: '0.68rem', color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>Vary</label>
          <select className="opt-sens-select" value={param} onChange={e => setParam(e.target.value)}>
            {PARAM_OPTS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="opt-chart-wrap">
        <div className="opt-chart-title">
          How {GREEK_OPTS.find(o => o.v === greek)?.label} changes as {PARAM_OPTS.find(o => o.v === param)?.label} varies
        </div>
        <SensChart data={sensData} greek={greek} param={param} currentX={currentX} />
        <div className="opt-legend">
          {isSame
            ? <span className="opt-legend-item"><span className="opt-legend-line" style={{ background: '#e8b53a' }} /> Call = Put</span>
            : <>
                <span className="opt-legend-item"><span className="opt-legend-line" style={{ background: 'var(--accent)' }} /> Call</span>
                <span className="opt-legend-item"><span className="opt-legend-line" style={{ background: '#c878a0' }} /> Put</span>
              </>
          }
          <span className="opt-legend-item" style={{ marginLeft: 'auto' }}>
            ┊ = current value
          </span>
        </div>
      </div>

      {insight && <p className="opt-insight">{insight}</p>}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

type Tab = 'pricer' | 'profile' | 'payoff' | 'sensitivity'

export default function OptionsLab() {
  const navigate = useNavigate()

  const [tab,     setTab]     = useState<Tab>('pricer')
  const [spot,    setSpot]    = useState(100)
  const [strike,  setStrike]  = useState(100)
  const [vol,     setVol]     = useState(0.20)
  const [timeYrs, setTimeYrs] = useState(0.50)
  const [rate,    setRate]    = useState(0.05)

  const result = useMemo(() => bsCalc(spot, strike, rate, vol, timeYrs), [spot, strike, rate, vol, timeYrs])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'pricer',      label: 'Pricer' },
    { id: 'profile',     label: 'Profile' },
    { id: 'payoff',      label: 'Payoff' },
    { id: 'sensitivity', label: 'Sensitivity' },
  ]

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-left">
          <button className="back-btn" onClick={() => navigate('/')}>‹ Home</button>
          <span className="page-header-title">Options Lab</span>
        </div>
        <HeaderRight />
      </header>

      <div className="page-body">
        {/* Tabs */}
        <div className="opt-tabs">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`opt-tab${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Sliders */}
        <div className="card opt-sliders">
          <SliderRow label="S" value={spot}    min={50}   max={200}  step={1}    display={spot.toFixed(0)}                onChange={setSpot} />
          <SliderRow label="K" value={strike}  min={50}   max={200}  step={1}    display={strike.toFixed(0)}              onChange={setStrike} />
          <SliderRow label="σ" value={vol}     min={0.05} max={1.00} step={0.01} display={(vol * 100).toFixed(0) + '%'}   onChange={setVol} />
          <SliderRow label="T" value={timeYrs} min={0.01} max={2.00} step={0.01} display={(timeYrs * 12).toFixed(1) + ' mo'} onChange={setTimeYrs} />
          <SliderRow label="r" value={rate}    min={0.00} max={0.10} step={0.005} display={(rate * 100).toFixed(1) + '%'} onChange={setRate} />
        </div>

        {/* Tab content */}
        {tab === 'pricer'      && <PricerTab result={result} spot={spot} strike={strike} rate={rate} timeYrs={timeYrs} />}
        {tab === 'profile'     && <ProfileTab spot={spot} strike={strike} rate={rate} vol={vol} timeYrs={timeYrs} />}
        {tab === 'payoff'      && <PayoffTab  spot={spot} strike={strike} rate={rate} vol={vol} timeYrs={timeYrs} />}
        {tab === 'sensitivity' && <SensitivityTab spot={spot} strike={strike} rate={rate} vol={vol} timeYrs={timeYrs} />}
      </div>
    </div>
  )
}
