# Options Lab Spec
> Route: `/options` — component: `OptionsLab` (default export from `src/OptionsLab.tsx`)

## Purpose

Interactive Black-Scholes European options pricer with visual exploration of Greeks.
Designed as an interview-prep / learning tool — every number has an intuition label.

---

## Inputs (always visible, shared across all tabs)

Five sliders at the top of the page:

| Param | Symbol | Range | Default | Display |
|---|---|---|---|---|
| Spot price | S | 50 – 200 | 100 | `100` |
| Strike price | K | 50 – 200 | 100 | `100` |
| Implied vol | σ | 5% – 100% | 20% | `20%` |
| Time to expiry | T | 0.01 – 2 yr | 0.50 | `6.0 mo` |
| Risk-free rate | r | 0% – 10% | 5% | `5.0%` |

Slider labels use italic Greek symbols (S, K, σ, T, r). Value on the right in accent colour.

---

## Tabs

### 1. Pricer

- **Moneyness badge** — coloured pill: Deep ITM / In the Money / At the Money / Out of the Money / Deep OTM
  - Based on S/K ratio: deep-itm > 1.10, itm > 1.02, atm ±2%, otm < 0.98, deep-otm < 0.90
- **Moneyness intuition** — 1-line insight below the badge (e.g. "Δ ≈ 0.5. Highest Γ and ν. Maximum time value. This is where vol risk is greatest.")
- **Call / Put price cards** — side by side
  - Price in large monospace
  - Below: `Intrinsic: X.XX · Time: X.XX`
- **Put-call parity check** (in a card)
  - Shows `C − P = {value}` and `S − K·e^{−rT} = {value}` — should always match
- **Greeks table** — 5 rows: Δ (Delta), Γ (Gamma), ν (Vega), Θ (Theta), ρ (Rho)
  - Columns: Greek | Symbol | Call | Put | Intuition
  - Gamma and Vega are the same for call/put (one value, span)
  - Theta and Rho are negative — displayed in muted-red
  - Intuition column: brief one-liner per Greek

#### Greens table intuitions:

| Greek | Intuition |
|---|---|
| Delta | Change in price per £1 move in spot |
| Gamma | Rate of change of delta (highest at ATM) |
| Vega | Change per 1% move in implied vol |
| Theta | Daily decay (negative = option loses value each day) |
| Rho | Change per 1% move in risk-free rate |

---

### 2. Profile

Delta and Gamma profiles across spot prices (holding K, σ, T, r fixed).

**Delta chart** (full-width SVG):
- X-axis: spot from 0.4K to 1.8K
- Y-axis: −1 to 1
- Two lines: call delta (accent blue), put delta (pink #c878a0)
- Dashed vertical line at K (amber, labelled "K")
- Dashed vertical line at current S (accent blue, labelled "S")
- Y=0 baseline
- Grid lines at −1, −0.5, 0, 0.5, 1
- Legend: [─ Call Δ] [─ Put Δ]

**Gamma chart** (full-width SVG below):
- X-axis: same spot range
- Y-axis: 0 to max gamma × 1.1
- Single line (amber #e8b53a) with fill below
- Same vertical lines for K and S
- Shows the bell-curve peak at ATM

Insight text between charts: "Gamma is highest at-the-money and declines as the option moves deeper ITM or OTM. This is why ATM options require the most frequent delta hedging."

---

### 3. Payoff

Call/Put toggle at top of tab.

**Payoff diagram** (full-width SVG):
- X-axis: spot from 0.4K to 1.8K
- Y-axis: 0 to max of [BS price, intrinsic] × 1.1
- Dashed line: intrinsic value at expiry (hockey stick)
- Solid line: current BS price (smooth curve above or equal to intrinsic)
- Filled area between solid and dashed = time value (translucent)
- Dashed vertical at K (strike, amber)
- Solid vertical at current S (call: blue, put: pink)
- Break-even label on X-axis where BS price = 0 (i.e. premium paid — not shown on this payoff-from-zero chart)

Legend: [─ BS Price] [─ ─ Intrinsic] [▒ Time Value]

Insight text: "Time value is always ≥ 0 (an option can't be worth less than intrinsic). It decays to zero at expiry — this is Theta."

---

### 4. Sensitivity

Explore how a Greek changes as one parameter is varied.

**Controls** (two dropdowns):
- "Show how [Greek ▾]" — options: Delta, Gamma, Vega, Theta
- "changes as [Param ▾]" — options: Vol (σ), Time to expiry (T), Spot price (S)

**Sensitivity chart** (full-width SVG):
- For Delta / Theta: two lines — call (blue) + put (pink)
- For Gamma / Vega: single line (amber) — same for both
- X-axis label changes to match selected parameter
  - Vol: "Implied Vol (%)", 5–100%
  - Time: "Time to expiry (months)", 0–24 mo
  - Spot: "Spot price", 0.4K–1.8K
- Vertical line at current parameter value
- Grid lines + axis labels

Default state: "How Delta changes as Vol varies"

---

## Black-Scholes Formulae

### Inputs
- S = spot price, K = strike, r = risk-free rate, σ = volatility, T = time (years)

### d1, d2
```
d1 = (ln(S/K) + (r + σ²/2)·T) / (σ·√T)
d2 = d1 − σ·√T
```

### Prices
```
Call = S·N(d1) − K·e^{−rT}·N(d2)
Put  = K·e^{−rT}·N(−d2) − S·N(−d1)
```

### Greeks (per option, not scaled)
| Greek | Call | Put | Note |
|---|---|---|---|
| Delta | N(d1) | N(d1) − 1 | |
| Gamma | φ(d1) / (S·σ·√T) | same | |
| Vega | S·φ(d1)·√T / 100 | same | per 1% vol |
| Theta | −[S·φ(d1)·σ/(2√T) + r·K·e^{−rT}·N(d2)] / 365 | similar | per day |
| Rho | K·T·e^{−rT}·N(d2) / 100 | −K·T·e^{−rT}·N(−d2) / 100 | per 1% rate |

N() = standard normal CDF (Abramowitz & Stegun approximation)
φ() = standard normal PDF

### Put-call parity
```
C − P = S − K·e^{−rT}
```

---

## Moneyness badge colours

| State | Badge colour |
|---|---|
| Deep ITM | Green (#5ac878) |
| ITM | Accent blue (#7eb8d4) |
| ATM | Amber (#e8b53a) |
| OTM | Muted orange (#c87040) |
| Deep OTM | Red (#c84040) |

---

## Layout

```
<page-header> ‹ Home | OPTIONS LAB | <HeaderRight /> </page-header>
<page-body>
  [Pricer] [Profile] [Payoff] [Sensitivity]   ← tab pills
  [S: ——————•————— 100]
  [K: ——————•————— 100]
  [σ: ————•——————  20%]
  [T: ——————•————  6.0 mo]
  [r: ——•——————  5.0%]
  ← tab content below →
</page-body>
```

---

## Out of scope (for now)
- American options / early exercise
- Dividend yields
- Implied vol solver (inverting BS to find σ from price)
- Vol smile / skew surface
- Multi-leg strategies (straddles, spreads)
- Real market data
