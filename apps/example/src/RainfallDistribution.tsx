import { useState, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from './ThemeContext'
import { HeaderRight } from './HeaderRight'

interface MonthData {
  name: string
  k: number
  theta: number
  pRain: number
  totalMm: number
  color: string
}

const MONTHS: MonthData[] = [
  { name: 'Jan', k: 0.80, theta:  6.3, pRain: 0.19, totalMm:  52, color: '#7eb8d4' },
  { name: 'Feb', k: 0.82, theta:  6.8, pRain: 0.20, totalMm:  56, color: '#89c4e1' },
  { name: 'Mar', k: 0.85, theta:  9.0, pRain: 0.28, totalMm: 117, color: '#6cbf8a' },
  { name: 'Apr', k: 0.85, theta:  9.8, pRain: 0.31, totalMm: 124, color: '#85d98c' },
  { name: 'May', k: 0.82, theta: 11.0, pRain: 0.34, totalMm: 137, color: '#a3e07a' },
  { name: 'Jun', k: 0.75, theta: 15.5, pRain: 0.46, totalMm: 167, color: '#c8c43a' },
  { name: 'Jul', k: 0.72, theta: 16.0, pRain: 0.40, totalMm: 156, color: '#e8972a' },
  { name: 'Aug', k: 0.72, theta: 15.8, pRain: 0.41, totalMm: 154, color: '#e06b2a' },
  { name: 'Sep', k: 0.70, theta: 20.8, pRain: 0.46, totalMm: 224, color: '#c44a3a' },
  { name: 'Oct', k: 0.72, theta: 21.2, pRain: 0.44, totalMm: 234, color: '#c44a8a' },
  { name: 'Nov', k: 0.85, theta: 10.2, pRain: 0.30, totalMm:  96, color: '#8a5ac4' },
  { name: 'Dec', k: 0.82, theta:  7.4, pRain: 0.23, totalMm:  61, color: '#5a8ac4' },
]

// ── Maths ──────────────────────────────────────────────────────────────────────
function lnGamma(x: number): number {
  const g = 7
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x)
  x -= 1
  let a = c[0]
  const t = x + g + 0.5
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i)
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a)
}

function gammaPDF(x: number, k: number, theta: number): number {
  if (x <= 0) return 0
  return Math.exp((k - 1) * Math.log(x) - x / theta - k * Math.log(theta) - lnGamma(k))
}

function regIncGamma(a: number, x: number): number {
  if (x < 0) return 0
  if (x === 0) return 0
  if (x < a + 1) {
    let ap = a, del = 1 / a, sum = del
    for (let n = 0; n < 200; n++) {
      ap++; del *= x / ap; sum += del
      if (Math.abs(del) < Math.abs(sum) * 1e-10) break
    }
    return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a))
  } else {
    let b = x + 1 - a, c = 1e30, d = 1 / b, h = d
    for (let i = 1; i <= 200; i++) {
      const an = -i * (i - a)
      b += 2; d = an * d + b; if (Math.abs(d) < 1e-30) d = 1e-30
      c = b + an / c; if (Math.abs(c) < 1e-30) c = 1e-30
      d = 1 / d; const del = d * c; h *= del
      if (Math.abs(del - 1) < 1e-10) break
    }
    return 1 - Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h
  }
}

function gammaCDF(x: number, k: number, theta: number): number {
  if (x <= 0) return 0
  return regIncGamma(k, x / theta)
}

function mulberry32(seed: number) {
  let s = seed
  return () => {
    s = (s | 0) + 0x6D2B79F5 | 0
    let t = Math.imul(s ^ s >>> 15, 1 | s)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function sampleGamma(k: number, theta: number, n: number, rng: () => number): number[] {
  const samples: number[] = []
  const kk = k < 1 ? k + 1 : k
  const d = kk - 1 / 3, cc = 1 / Math.sqrt(9 * d)
  while (samples.length < n) {
    let x: number, v: number
    do {
      const u1 = Math.max(rng(), 1e-15), u2 = rng()
      x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      v = Math.pow(1 + cc * x, 3)
    } while (v <= 0)
    const u = rng()
    if (u < 1 - 0.0331 * x * x * x * x || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      let s = d * v * theta
      if (k < 1) s *= Math.pow(Math.max(rng(), 1e-15), 1 / k)
      if (s > 0 && isFinite(s)) samples.push(s)
    }
  }
  return samples
}

const X_MAX = 100, BIN_W = 5, N_SAMP = 3000
const EPS = 1e-6, CLIP_P = 1 - 1e-4

function hexRgb(h: string) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)].join(',')
}

function logit(p: number): number {
  const pc = Math.min(Math.max(p, EPS), 1 - EPS)
  return Math.log(pc / (1 - pc))
}

// ── Theme-aware colour helpers ─────────────────────────────────────────────────
function svgColors(isDark: boolean) {
  return {
    grid:       isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
    axis:       isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.18)',
    axisMinor:  isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.10)',
    tickLabel:  isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.45)',
    axisLabel:  isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.3)',
    cursor:     isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
    ttBg:       isDark ? 'rgba(8,12,24,0.93)'     : 'rgba(240,246,252,0.96)',
    ttText:     isDark ? '#c8d8e8'                 : '#0c1a2e',
    dotStroke:  isDark ? '#080c18'                 : '#f0f5fa',
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function Checkbox({ label, checked, onChange, color, isDark }: {
  label: string; checked: boolean; onChange: () => void; color: string; isDark: boolean
}) {
  const dim = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.35)'
  const dimMuted = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.3)'
  return (
    <div onClick={onChange} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
      <div style={{
        width: 14, height: 14, borderRadius: 3, flexShrink: 0,
        border: `1px solid ${checked ? color : dim}`,
        background: checked ? color + '2a' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        {checked && (
          <svg width="9" height="9" viewBox="0 0 9 9">
            <path d="M1.2 4.5L3.6 7L7.8 1.5" stroke={color} strokeWidth="1.5"
              fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span style={{ fontSize: 10, letterSpacing: '0.12em', color: checked ? (isDark ? '#c0d0e0' : '#0c1a2e') : dimMuted, transition: 'color 0.2s' }}>
        {label}
      </span>
    </div>
  )
}

function ToggleSwitch({ options, value, onChange, color, isDark }: {
  options: string[]; value: string; onChange: (v: string) => void; color: string; isDark: boolean
}) {
  const dimBg  = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'
  const dimBdr = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)'
  const dimTxt = isDark ? 'rgba(255,255,255,0.3)'  : 'rgba(0,0,0,0.4)'
  return (
    <div style={{ display: 'flex', background: dimBg, borderRadius: 6, border: `1px solid ${dimBdr}`, overflow: 'hidden' }}>
      {options.map(opt => (
        <div key={opt} onClick={() => onChange(opt)} style={{
          padding: '5px 14px', fontSize: 10, letterSpacing: '0.12em',
          cursor: 'pointer', userSelect: 'none', transition: 'all 0.15s',
          background: value === opt ? color + '28' : 'transparent',
          color: value === opt ? color : dimTxt,
          borderRight: opt !== options[options.length - 1] ? `1px solid ${dimBdr}` : 'none',
        }}>{opt}</div>
      ))}
    </div>
  )
}

// ── Chart ──────────────────────────────────────────────────────────────────────
interface HoverState { svgX: number; svgY: number; dataX: number; dataY: number; label: string }

function MonthChart({ month, pdfYMax, logX, logY, mode, isSelected, onClick, isDark }: {
  month: MonthData; pdfYMax: number; logX: boolean; logY: boolean
  mode: string; isSelected: boolean; onClick: () => void; isDark: boolean
}) {
  const { name, k, theta, pRain, totalMm, color } = month
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<HoverState | null>(null)
  const sc = svgColors(isDark)

  const { bins, curve } = useMemo(() => {
    const rng = mulberry32(name.charCodeAt(0) * 1009 + name.charCodeAt(1) * 137 + 42)
    const samples = sampleGamma(k, theta, N_SAMP, rng)
    const nBins = Math.ceil(X_MAX / BIN_W)
    const counts = new Array(nBins).fill(0)
    samples.forEach(s => { const b = Math.floor(s / BIN_W); if (b < nBins) counts[b]++ })
    const bins = counts.map((c, i) => ({
      xL: i * BIN_W,
      density: c / (N_SAMP * BIN_W),
      ecdf: samples.filter(s => s <= (i + 1) * BIN_W).length / N_SAMP,
    }))
    const curve = Array.from({ length: 601 }, (_, i) => {
      const x = 0.05 + (X_MAX - 0.05) * (i / 600)
      return { x, pdf: gammaPDF(x, k, theta), cdf: gammaCDF(x, k, theta) }
    })
    return { bins, curve }
  }, [k, theta, name])

  const PL = 42, PR = 10, PT = 14, PB = 30, W = 280, H = 152
  const pw = W - PL - PR, ph = H - PT - PB

  const xMinL = Math.log10(0.4), xMaxL = Math.log10(X_MAX)
  const toSvgX = (x: number) => logX
    ? PL + ((Math.log10(Math.max(x, 0.4)) - xMinL) / (xMaxL - xMinL)) * pw
    : PL + (x / X_MAX) * pw

  let yTicks: number[], yFmt: (v: number) => string, yLabel: string
  let toRawY: (y: number) => number

  if (mode === 'PDF') {
    const yMax = pdfYMax
    if (logY) {
      const lyMin = Math.log10(EPS), lyMax = Math.log10(yMax)
      toRawY = y => PT + ph - ((Math.log10(Math.max(y, EPS)) - lyMin) / (lyMax - lyMin)) * ph
      yTicks = [1e-4, 1e-3, 1e-2, 1e-1].filter(v => Math.log10(v) >= lyMin - 0.2 && v <= yMax * 1.5)
      yFmt = v => v < 0.01 ? v.toExponential(0) : v.toFixed(3)
      yLabel = 'log density'
    } else {
      toRawY = y => PT + ph - (y / yMax) * ph
      yTicks = [0, yMax * 0.5, yMax]
      yFmt = v => v === 0 ? '0' : v.toFixed(3)
      yLabel = 'density'
    }
  } else {
    if (logY) {
      const loMax = logit(CLIP_P), loMin = logit(1 - CLIP_P), loRange = loMax - loMin
      toRawY = y => {
        const lo = logit(Math.min(Math.max(y, EPS), 1 - EPS))
        return PT + ph - ((lo - loMin) / loRange) * ph
      }
      yTicks = [0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99]
      yFmt = v => (v * 100).toFixed(0) + '%'
      yLabel = 'log-odds'
    } else {
      toRawY = y => PT + ph - y * ph
      yTicks = [0, 0.25, 0.5, 0.75, 1.0]
      yFmt = v => (v * 100).toFixed(0) + '%'
      yLabel = 'CDF'
    }
  }

  const clip = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
  const toSvgY = (y: number) => Math.max(PT - 4, Math.min(PT + ph + 4, toRawY(y)))
  const clipSvgY = (y: number) => clip(y, PT, PT + ph)

  const xTicks = logX ? [0.5, 1, 2, 5, 10, 20, 50, 100] : [0, 20, 40, 60, 80, 100]
  const mean = k * theta
  const gid = `g${name}`, glid = `gl${name}`, clid = `cl${name}`
  const yKey = mode === 'PDF' ? 'pdf' : 'cdf'

  const validCurve = curve.filter(p => {
    if (mode === 'PDF' && logY && p.pdf < EPS) return false
    if (mode === 'CDF' && logY && (p.cdf < EPS || p.cdf > 1 - EPS)) return false
    return true
  })

  const cPath = validCurve.map((p, i) => {
    const x = clip(toSvgX(p.x), PL - 1, PL + pw + 1)
    const y = clipSvgY(toSvgY(p[yKey]))
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ')

  const aPath = mode === 'PDF' && cPath
    ? cPath
      + ` L ${clip(toSvgX(validCurve[validCurve.length - 1]?.x ?? X_MAX), PL, PL + pw).toFixed(1)} ${(PT + ph).toFixed(1)}`
      + ` L ${clip(toSvgX(validCurve[0]?.x ?? 0.1), PL, PL + pw).toFixed(1)} ${(PT + ph).toFixed(1)} Z`
    : null

  const handleSvgMove = useCallback((e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const scaleX = W / rect.width
    const mx = (clientX - rect.left) * scaleX
    if (mx < PL || mx > PL + pw) { setHover(null); return }

    let dataX: number
    if (logX) {
      const frac = (mx - PL) / pw
      dataX = Math.pow(10, xMinL + frac * (xMaxL - xMinL))
    } else {
      dataX = (mx - PL) / pw * X_MAX
    }
    dataX = Math.max(0.05, Math.min(X_MAX, dataX))

    const dataY = mode === 'PDF' ? gammaPDF(dataX, k, theta) : gammaCDF(dataX, k, theta)
    const svgYv = clipSvgY(toSvgY(dataY))
    const label = mode === 'PDF'
      ? `f(${dataX.toFixed(1)}) = ${dataY.toFixed(4)}`
      : `F(${dataX.toFixed(1)}) = ${(dataY * 100).toFixed(1)}%`

    setHover({ svgX: mx, svgY: svgYv, dataX, dataY, label })
  }, [logX, logY, mode, k, theta, xMinL, xMaxL])

  const handleSvgLeave = () => setHover(null)
  const ttWidth = 130
  const ttX = hover ? (hover.svgX + ttWidth > W - PR ? hover.svgX - ttWidth - 6 : hover.svgX + 6) : 0

  // Card theming via CSS vars
  const cardBg    = isSelected ? `rgba(${hexRgb(color)},0.08)` : 'var(--surface)'
  const cardBdr   = isSelected ? color + '55' : 'var(--border)'
  const metaColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.35)'

  return (
    <div onClick={onClick} style={{
      cursor: 'pointer',
      background: cardBg,
      border: `1px solid ${cardBdr}`,
      borderRadius: 12, padding: '13px 11px 7px',
      transition: 'transform 0.15s, box-shadow 0.15s, background 0.2s',
      transform: isSelected ? 'translateY(-4px)' : 'none',
      boxShadow: isSelected ? `0 12px 32px rgba(${hexRgb(color)},0.2)` : 'var(--shadow-sm)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <div>
          <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 23, letterSpacing: '0.06em', color }}>{name}</span>
          <span style={{ fontSize: 8.5, color: metaColor, marginLeft: 6, letterSpacing: '0.1em' }}>P(rain)={Math.round(pRain * 100)}%</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>{totalMm}</span>
          <span style={{ fontSize: 8, color: metaColor, marginLeft: 2 }}>mm/mo</span>
        </div>
      </div>

      <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', overflow: 'hidden', cursor: 'crosshair' }}
        onMouseMove={handleSvgMove} onMouseLeave={handleSvgLeave}
        onTouchMove={handleSvgMove} onTouchEnd={handleSvgLeave}
        onClick={e => e.stopPropagation()}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
          <filter id={glid} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <clipPath id={clid}><rect x={PL} y={PT - 2} width={pw} height={ph + 4} /></clipPath>
        </defs>

        {yTicks.filter(v => mode === 'CDF' ? v > 0 && v < 1 : v > 0).map((yt, i) => {
          const y = clipSvgY(toSvgY(yt))
          return <line key={i} x1={PL} y1={y} x2={PL + pw} y2={y} stroke={sc.grid} strokeWidth="1" />
        })}

        {mode === 'PDF' && (
          <g clipPath={`url(#${clid})`}>
            {bins.map((bin, i) => {
              if (bin.density <= 0) return null
              const x1 = toSvgX(bin.xL), x2 = toSvgX(bin.xL + BIN_W)
              const y0 = PT + ph, y1 = clipSvgY(toSvgY(bin.density))
              const bw = Math.max(x2 - x1 - 1, 1)
              if (!isFinite(y1) || y1 >= y0) return null
              return <rect key={i} x={x1 + 0.5} y={y1} width={bw} height={y0 - y1} fill={color} opacity="0.20" rx="1" />
            })}
          </g>
        )}

        {mode === 'CDF' && (
          <g clipPath={`url(#${clid})`}>
            {bins.map((bin, i) => {
              const x = toSvgX(bin.xL + BIN_W)
              const y = clipSvgY(toSvgY(bin.ecdf))
              const prev = i > 0 ? clipSvgY(toSvgY(bins[i - 1].ecdf)) : PT + ph
              if (!isFinite(y)) return null
              return (
                <g key={i}>
                  <line x1={toSvgX(bin.xL)} y1={prev} x2={x} y2={prev} stroke={color} strokeWidth="1" opacity="0.25" />
                  <line x1={x} y1={prev} x2={x} y2={y} stroke={color} strokeWidth="1" opacity="0.25" />
                </g>
              )
            })}
          </g>
        )}

        {mode === 'PDF' && aPath && (
          <g clipPath={`url(#${clid})`}>
            <path d={aPath} fill={`url(#${gid})`} />
          </g>
        )}

        <g clipPath={`url(#${clid})`}>
          <path d={cPath} fill="none" stroke={color} strokeWidth="1.8"
            filter={`url(#${glid})`} strokeLinejoin="round" strokeLinecap="round" />
        </g>

        {mean < X_MAX && (
          <g clipPath={`url(#${clid})`}>
            <line x1={toSvgX(mean)} y1={PT} x2={toSvgX(mean)} y2={PT + ph}
              stroke={color} strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
            <text x={toSvgX(mean) + 3} y={PT + 9} fontSize="7" fill={color} opacity="0.65">{mean.toFixed(0)}</text>
          </g>
        )}

        {hover && (
          <g>
            <line x1={hover.svgX} y1={PT} x2={hover.svgX} y2={PT + ph}
              stroke={sc.cursor} strokeWidth="1" strokeDasharray="2,2" />
            <circle cx={hover.svgX} cy={hover.svgY} r="3.5"
              fill={color} stroke={sc.dotStroke} strokeWidth="1.5" opacity="0.95" />
            <rect x={ttX} y={hover.svgY - 22} width={ttWidth} height={20}
              rx="4" fill={sc.ttBg} stroke={color + '55'} strokeWidth="1" />
            <text x={ttX + 6} y={hover.svgY - 8} fontSize="8.5" fill={sc.ttText} letterSpacing="0.05em">
              {hover.label}
            </text>
          </g>
        )}

        <line x1={PL} y1={PT + ph} x2={PL + pw} y2={PT + ph} stroke={sc.axis} strokeWidth="1" />
        <line x1={PL} y1={PT} x2={PL} y2={PT + ph} stroke={sc.axisMinor} strokeWidth="1" />

        {xTicks.map(t => {
          const x = clip(toSvgX(t), PL - 1, PL + pw + 1)
          if (x < PL - 1 || x > PL + pw + 1) return null
          return (
            <g key={t}>
              <line x1={x} y1={PT + ph} x2={x} y2={PT + ph + 3} stroke={sc.axis} strokeWidth="1" />
              <text x={x} y={PT + ph + 11} textAnchor="middle" fontSize="7.5" fill={sc.tickLabel}>{t}</text>
            </g>
          )
        })}

        {yTicks.map((yt, i) => {
          const y = clipSvgY(toSvgY(yt))
          return (
            <g key={i}>
              <line x1={PL - 3} y1={y} x2={PL} y2={y} stroke={sc.axis} strokeWidth="1" />
              <text x={PL - 5} y={y + 3} textAnchor="end" fontSize="6.5" fill={sc.tickLabel}>{yFmt(yt)}</text>
            </g>
          )
        })}

        <text transform={`translate(9,${PT + ph / 2}) rotate(-90)`}
          textAnchor="middle" fontSize="6.5" fill={sc.axisLabel} letterSpacing="0.8">{yLabel}</text>
        <text x={PL + pw / 2} y={H - 1}
          textAnchor="middle" fontSize="7" fill={sc.axisLabel} letterSpacing="0.8">
          {logX ? 'mm/day (log)' : 'mm / day'}
        </text>
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 1, fontSize: 8.5, color: metaColor, letterSpacing: '0.1em' }}>
        <span>k={k.toFixed(2)}</span>
        <span style={{ color: color + '99' }}>mean {mean.toFixed(1)} mm</span>
        <span>θ={theta.toFixed(1)}</span>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function RainfallDistribution() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [selected, setSelected] = useState<string | null>(null)
  const [logY, setLogY] = useState(false)
  const [logX, setLogX] = useState(false)
  const [mode, setMode] = useState('PDF')
  const accent = '#7eb8d4'

  const pdfYMax = useMemo(() => {
    let g = 0
    MONTHS.forEach(({ k, theta }) => {
      for (let i = 1; i <= 600; i++) {
        const y = gammaPDF(i * 0.15, k, theta)
        if (y > g) g = y
      }
    })
    return Math.ceil(g * 1000) / 1000 + 0.001
  }, [])

  const subtleText   = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.35)'
  const subtleMuted  = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.4)'
  const controlsBg   = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.03)'
  const controlsBdr  = isDark ? 'rgba(255,255,255,0.07)'  : 'rgba(0,0,0,0.08)'
  const legendBg     = isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.02)'
  const legendBdr    = isDark ? 'rgba(255,255,255,0.05)'  : 'rgba(0,0,0,0.07)'
  const footerText   = isDark ? 'rgba(255,255,255,0.1)'   : 'rgba(0,0,0,0.2)'

  return (
    <div className="page">
      {/* Header — matches AppPage style */}
      <header className="page-header">
        <div className="page-header-left">
          <button className="back-btn" onClick={() => navigate('/')}>‹ Home</button>
          <span className="page-header-title">Tokyo Rainfall</span>
        </div>
        <HeaderRight />
      </header>

      {/* Content — full-width scrollable body */}
      <div style={{ flex: 1, padding: '18px 16px 48px', overflowX: 'hidden' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', fontFamily: "'DM Mono','Courier New',monospace" }}>

          <div style={{ textAlign: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.26em', color: subtleText, marginBottom: 5, textTransform: 'uppercase' }}>
              Gamma fit · JMA normals 1991–2020 · wet days only
            </div>
            <h1 style={{
              fontFamily: "'Bebas Neue',sans-serif",
              fontSize: 'clamp(26px,4.5vw,54px)', letterSpacing: '0.1em', margin: '0 0 3px',
              background: 'linear-gradient(135deg,#7eb8d4 0%,#c44a8a 55%,#e8972a 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              TOKYO RAINFALL
            </h1>
            <p style={{ fontSize: 9, color: subtleMuted, margin: 0, letterSpacing: '0.1em' }}>
              hover curve for values · dashed = mean · shared axes
            </p>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            flexWrap: 'wrap', gap: 20, margin: '14px 0 6px',
            padding: '11px 24px', background: controlsBg,
            border: `1px solid ${controlsBdr}`, borderRadius: 10,
            width: 'fit-content', marginLeft: 'auto', marginRight: 'auto',
          }}>
            <ToggleSwitch options={['PDF', 'CDF']} value={mode} onChange={setMode} color={accent} isDark={isDark} />
            <div style={{ width: 1, height: 18, background: controlsBdr }} />
            <Checkbox label="LOG Y" checked={logY} onChange={() => setLogY(v => !v)} color={accent} isDark={isDark} />
            <Checkbox label="LOG X" checked={logX} onChange={() => setLogX(v => !v)} color={accent} isDark={isDark} />
            <div style={{ fontSize: 9, color: subtleMuted, letterSpacing: '0.08em', maxWidth: 220, lineHeight: 1.5 }}>
              {mode === 'CDF' && logY
                ? 'Y = log-odds (logistic scale) — S-curve becomes linear if Gamma fits well'
                : mode === 'CDF'
                ? 'CDF — empirical step fn vs fitted Gamma'
                : logY
                ? 'Log density — tail behaviour linearised'
                : 'PDF — density histogram + Gamma fit'}
            </div>
          </div>

          <div style={{ textAlign: 'center', margin: '8px auto 14px', maxWidth: 660, fontSize: 9.5, color: subtleMuted, lineHeight: 1.7, letterSpacing: '0.07em' }}>
            <span style={{ color: '#e8972a' }}>Jul</span> drier than <span style={{ color: '#c8c43a' }}>Jun</span> — tsuyu lifts mid-July.&ensp;
            <span style={{ color: '#c44a3a' }}>Sep</span> &amp; <span style={{ color: '#c44a8a' }}>Oct</span> wettest — typhoon season.
          </div>

          <div style={{ display: 'flex', gap: 0, marginBottom: 16, height: 4, borderRadius: 3, overflow: 'hidden' }}>
            {MONTHS.map(m => <div key={m.name} style={{ flex: m.totalMm, background: m.color, opacity: 0.6 }} />)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 11 }}>
            {MONTHS.map(m => (
              <MonthChart key={m.name} month={m} pdfYMax={pdfYMax}
                logX={logX} logY={logY} mode={mode} isDark={isDark}
                isSelected={selected === m.name}
                onClick={() => setSelected(s => s === m.name ? null : m.name)} />
            ))}
          </div>

          <div style={{
            marginTop: 20, padding: '11px 16px',
            background: legendBg, border: `1px solid ${legendBdr}`,
            borderRadius: 10, display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(195px,1fr))',
            gap: '5px 16px', fontSize: 9, color: subtleMuted, letterSpacing: '0.08em', lineHeight: 1.8,
          }}>
            <div><span style={{ color: accent }}>PDF + LOG Y</span><br />Log density — straight tail implies exponential decay; Gamma deviation visible</div>
            <div><span style={{ color: accent }}>CDF + LOG Y</span><br />Logistic (log-odds) scale — a perfect Gamma CDF is sigmoid; deviations at tails show misfit</div>
            <div><span style={{ color: accent }}>LOG X</span><br />Spreads light-rain region; winter peaks sharpen, summer tails extend</div>
            <div><span style={{ color: accent }}>EMPIRICAL</span><br />PDF: grey bars. CDF: step function. Curve is analytical Gamma(k,θ)</div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 12, fontSize: 8, color: footerText, letterSpacing: '0.14em' }}>
            JMA NORMALS 1991–2020 · GAMMA METHOD OF MOMENTS · INCOMPLETE GAMMA CDF VIA CONTINUED FRACTION
          </div>
        </div>
      </div>
    </div>
  )
}
