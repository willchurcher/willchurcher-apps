# Gym Tracker

Route: `/gym`

## Purpose

Two-pillar fitness app:
1. **Weak spot tracker** — identify weak muscle groups via diagnostic tests, track improvement over time
2. **Lift logger** — Strong-style workout session logging with PR tracking

The philosophy: turn soft goals ("stronger hips", "better flexibility") into concrete scores with a re-test date.

---

## Views / Navigation

Three tabs at the bottom of the page:

| Tab | Icon | Description |
|-----|------|-------------|
| Log | 🏋 | Log today's workout session |
| Tests | 📋 | Diagnostic tests and weak spot tracker |
| History | 📈 | Lift history, PRs, trends |

---

## Tab 1 — Log (Workout Session Logger)

### Session flow

1. Tap **Start workout** → creates a new session with current timestamp
2. Tap **+ Add exercise** → searchable list of exercises
3. For each exercise: log sets as rows of `weight × reps`
   - Each row: weight input | × | reps input | ✓ (done)
   - Tap ✓ to mark set complete (row greys out, next row appears)
   - Previous session's sets shown in muted text as reference
4. Tap **Finish** → session saved, summary shown (total sets, volume, PRs hit)

### Exercise list (pre-loaded)

**Strength (key lifts)**
- Back squat, Deadlift, Hip thrust, Bench press, Overhead press, Pull-up, Barbell row

**Lower — quad/glute**
- Pendulum squat, ATG split squat, Walking lunge, Romanian deadlift, B-stance hip thrust, Cossack squat, Step-up

**Lower — posterior/hamstring**
- Seated leg curl, Nordic curl, Good morning, Jefferson curl

**Lower — adductor/calf**
- Copenhagen plank, Adductor machine, Side lunge, Standing calf raise, Seated calf raise, Tibialis raise

**Upper — push**
- Incline DB press, Weighted dip, Lateral raise, Triceps extension, Face pull

**Upper — pull**
- Lat pulldown, Chest-supported row, Bicep curl, Hammer curl, Rear delt fly

**Mobility/prehab**
- Dead hang, Active hang, Scapular pull-up, Backward treadmill walk

### Set types
Each set can be tagged: Normal | Warm-up | Drop set | Failure

### Notes
Free-text note per session (e.g. "felt strong, left knee twinge on squat")

---

## Tab 2 — Tests (Weak Spot Tracker)

### Radar chart

Top of the Tests tab: a radar/spider chart with one axis per muscle group (10 axes). Each axis is scored 1–5 based on the group's most recent test scores. The filled shape shows your current profile at a glance — flat spots are weak areas.

Muscle groups on the chart:
- Hamstrings · Adductors · Glute med · Ankles · Knees · Hip flexors · Shoulders · Core · Posterior chain · Calves

### Scoring scale

All tests use a **1–5 scale**. For objective tests the scale maps to measured benchmarks (see below). For feel/joint tests the scale is subjective:

| Score | Objective tests | Feel tests |
|-------|----------------|------------|
| 1 | Well below benchmark | Pain / swelling |
| 2 | Below benchmark | Uncomfortable / clicking |
| 3 | At benchmark | Noticeable but okay |
| 4 | Above benchmark | Good |
| 5 | Excellent / elite | Perfect, no issues |

Each muscle group's radar score = average of its tests (rounded to 1 d.p.).

### Muscle group cards

Below the radar: a scrollable grid of cards, one per group. Each card shows:
- Group name
- Current radar score (e.g. **2.4 / 5**)
- Days since last tested
- Trend arrow (↑ ↗ → ↘ ↓) vs previous test

After 8 weeks without a re-test, the card pulses amber.

### Diagnostic tests with benchmarks

Tapping a group shows its individual tests. Each test:
- Name + what it measures
- Raw value input (seconds / cm / reps) **and** auto-converted 1–5 score
- Score history: sparkline + list of dated entries
- Benchmark guidance shown inline

---

**Hamstrings**

| Test | Unit | 1 | 2 | 3 | 4 | 5 |
|------|------|---|---|---|---|---|
| Pike sit against wall | feel 1–5 | can't sit upright | torso way back | slight lean | mostly upright | flat back, feet vertical |
| Active straight leg raise | degrees | <45° | 45–60° | 60–70° | 70–80° | 80°+ |
| Standing toe touch | feel 1–5 | can't reach shins | reach shins | reach ankles | fingertips floor | palms flat |

**Adductors**

| Test | Unit | 1 | 2 | 3 | 4 | 5 |
|------|------|---|---|---|---|---|
| Copenhagen plank hold (each side) | seconds | <10s | 10–20s | 20–30s | 30–45s | 45s+ |
| Cossack squat depth | feel 1–5 | can't get low | partial depth | decent depth | full depth | full depth + controlled |

**Ankles**

| Test | Unit | 1 | 2 | 3 | 4 | 5 |
|------|------|---|---|---|---|---|
| Knee-to-wall (each side) | cm | <4cm | 4–8cm | 8–10cm | 10–12cm | 12cm+ |
| Deep squat hold (heels flat) | seconds | can't hold | <15s | 15–30s | 30–60s | 60s+ |

**Knees**

| Test | Unit | 1 | 2 | 3 | 4 | 5 |
|------|------|---|---|---|---|---|
| ATG split squat | feel 1–5 | pain / can't do | very restricted | partial ROM | near-floor | back knee to floor, no pain |
| Knee joint feel | feel 1–5 | pain / swollen | clicking + ache | clicking, no pain | slight stiffness | perfect |

**Shoulders**

| Test | Unit | 1 | 2 | 3 | 4 | 5 |
|------|------|---|---|---|---|---|
| Dead hang | seconds | <10s | 10–30s | 30–60s | 60–90s | 90s+ |
| Pull-ups (strict) | reps | 0 | 1–2 | 3–5 | 6–10 | 10+ |
| Shoulder joint feel | feel 1–5 | pain / grinding | clicking + ache | clicking, no pain | slight stiffness | perfect |

**Core**

| Test | Unit | 1 | 2 | 3 | 4 | 5 |
|------|------|---|---|---|---|---|
| Hollow hold | seconds | <15s | 15–30s | 30–45s | 45–60s | 60s+ |
| Hanging leg raise (straight) | reps | 0–2 | 3–5 | 6–8 | 9–12 | 12+ |

**Posterior chain**

| Test | Unit | 1 | 2 | 3 | 4 | 5 |
|------|------|---|---|---|---|---|
| Jefferson curl feel | feel 1–5 | pain | very tight, limited | tight but full ROM | smooth, slight pull | smooth, full, no pull |
| Lower back feel | feel 1–5 | pain / spasm | aching / weird | stiff but okay | slight tightness | perfect |

**Calves**

| Test | Unit | 1 | 2 | 3 | 4 | 5 |
|------|------|---|---|---|---|---|
| Single-leg calf raise (full ROM) | reps | <10 | 10–15 | 15–20 | 20–25 | 25+ |
| Tibialis raise hold | seconds | <20s | 20–35s | 35–50s | 50–65s | 65s+ |

**Hip flexors / glute med**

| Test | Unit | 1 | 2 | 3 | 4 | 5 |
|------|------|---|---|---|---|---|
| Couch stretch feel | feel 1–5 | severe pull / pain | strong pull | moderate pull | mild pull | full upright, no pull |
| Single-leg RDL control | feel 1–5 | can't balance | very wobbly | some wobble | mostly controlled | locked in, 10 clean reps |

---

### Logging a test score

Tapping **Log score** opens a sheet:
- Raw value input (e.g. "28" seconds) → auto-displays converted 1–5 score with label
- For feel tests: tap 1–5 directly (labelled buttons)
- Bilateral tests (knee-to-wall, Copenhagen): separate left / right inputs
- Notes field (e.g. "left ankle noticeably worse")
- Date defaults to today

### Body feel check-in

Separate from individual tests — a quick daily or pre-workout log:

| Area | Scale |
|------|-------|
| Lower back | 1–5 |
| Left knee / Right knee | 1–5 |
| Left shoulder / Right shoulder | 1–5 |
| General energy | 1–5 |

These feed into a **joint health timeline** visible in History tab — see if bad sessions correlate with low feel scores.

---

## Tab 3 — History

### Exercise history

Searchable list of all exercises logged. Tapping one shows:
- **PR** (heaviest single set)
- **Volume PR** (most total kg in a session)
- **Chart** — weight over time (most recent 20 sessions)
- **Session log** — each session, collapsed by date, showing all sets

### Session history

Reverse-chronological list of all sessions:
- Date + day name
- Exercises done (pill tags)
- Total volume (kg)
- Any PRs hit (shown in gold)

Tapping a session expands to full detail.

---

## Data model (localStorage)

```ts
// Exercises
interface Exercise {
  id: string
  name: string
  category: string
  muscleGroups: string[]
}

// Sessions
interface Session {
  id: string
  date: string           // ISO date
  notes: string
  sets: SetEntry[]
}

interface SetEntry {
  exerciseId: string
  weight: number         // kg
  reps: number
  type: 'normal' | 'warmup' | 'dropset' | 'failure'
  done: boolean
}

// Diagnostic test scores
interface TestScore {
  testId: string
  date: string
  rawValue?: number      // seconds, cm, reps (omitted for pure feel tests)
  score: 1 | 2 | 3 | 4 | 5   // always stored; auto-derived for objective tests
  side?: 'left' | 'right' | 'both'
  notes: string
}

// Body feel check-in
interface FeelCheckIn {
  date: string
  lowerBack: 1 | 2 | 3 | 4 | 5
  leftKnee: 1 | 2 | 3 | 4 | 5
  rightKnee: 1 | 2 | 3 | 4 | 5
  leftShoulder: 1 | 2 | 3 | 4 | 5
  rightShoulder: 1 | 2 | 3 | 4 | 5
  energy: 1 | 2 | 3 | 4 | 5
}
```

All data stored in localStorage under `gym-tracker:*` keys.

---

## Design notes

- Input fields use `font-size: 16px` minimum to prevent iOS zoom
- Active session stays pinned — navigating away and back restores it
- Weight defaults to last used weight for that exercise
- Reps defaults to last used reps
- No account/sync — localStorage only for MVP
