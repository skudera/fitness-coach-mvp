# Fitness Coach MVP — CLAUDE.md

Personal adaptive fitness coaching app for a single user (Jonathan). Mobile-first PWA deployed on Vercel, backed by Supabase.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| UI | React 19 + Tailwind CSS + Lucide icons |
| Charts | Recharts |
| Drag-and-drop | @dnd-kit/core + @dnd-kit/sortable |
| Backend/DB | Supabase (Postgres + Auth + Storage) |
| AI parsing | Anthropic Claude API (claude-opus-4-7) |
| Deployment | Vercel (auto-deploy on push to main) |

## Commands

```bash
npm run dev      # local dev server
npm run build    # production build
npx tsc --noEmit # type-check only (run before every commit)
```

## Environment Variables

`.env.local` (local) and Vercel dashboard (production):
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/publishable key
- `ANTHROPIC_API_KEY` — Claude API key (server-side only, used in API routes)

## Project Structure

```
app/
  page.tsx                    # Home dashboard
  layout.tsx                  # Root layout, PWA meta tags, AuthGate wrapper
  icon.tsx                    # Generated favicon (32×32)
  apple-icon.tsx              # Generated iOS home screen icon (180×180)
  checkin/page.tsx            # Monday body metrics check-in
  plan/page.tsx               # Weekly plan — drag-and-drop reorder + accordion view
  workout/
    page.tsx                  # Workout start / day selection
    log/page.tsx              # Active workout logging (primary workout UI)
    warmup/page.tsx
    exercise/[index]/page.tsx # Legacy per-exercise page (old storage system)
    cardio/page.tsx
    summary/page.tsx
  history/page.tsx            # Completed workout history
  progress/page.tsx           # Body metrics charts + history table
  inbody/page.tsx             # InBody assessment upload + history
  photos/page.tsx             # Progress photos
  recovery/page.tsx           # Evening recovery/mobility flow
  preferences/page.tsx        # Equipment preferences
  more/page.tsx               # Navigation hub for tools
  api/
    checkin/                  # Check-in API route
    parse-inbody/route.ts     # Claude vision API — parses InBody report image

lib/
  supabase.ts                 # Supabase client, getCurrentUser, requireUserId
  storage-supabase.ts         # All Supabase data helpers (types + CRUD functions)
  workout-data.ts             # Static workout definitions (exercises, targets)
  workout-log-state.ts        # LocalStorage-based in-progress workout state
  progression-engine.ts       # Weight suggestion logic (form-governor)
  recovery-governor.ts        # Friday workout adjustment based on basketball inputs
  storage.ts                  # Legacy LocalStorage helpers (old exercise page only)
  mock-data.ts                # Dev mock data

components/
  AuthGate.tsx                # Email+password auth wrapper
  BottomNav.tsx               # Mobile bottom navigation
  MetricCard.tsx
  ProgressBar.tsx
  WorkoutSnapshot.tsx

rules/
  checkin.ts
  progression.ts

types/index.ts                # Shared TypeScript types
public/manifest.json          # PWA manifest
supabase/schema.sql           # Reference schema (older — active tables listed below)
```

## Supabase Tables (Active)

All tables use `user_id uuid references auth.users(id)` + Row Level Security.

| Table | Purpose |
|---|---|
| `body_metrics` | At-home scale check-ins (weight, body_fat, water_percent, waist, etc.) |
| `workouts` | Completed workout sessions (day_name, focus, status, actual_minutes, etc.) |
| `exercise_logs` | Per-set logs (exercise_name, set_number, weight, reps, difficulty, discomfort) |
| `completed_sessions` | Session summary (duration, completed_cardio) |
| `weekly_settings` | Per-week settings (basketball inputs, Friday recovery, day_order_json) |
| `user_preferences` | Equipment preferences (pressing, row, leg press, cardio style) |
| `inbody_assessments` | InBody clinic assessments (SMM, visceral fat, segmental lean/fat, etc.) |

### Supabase Storage

- Bucket: `inbody-images` (private)
- Path pattern: `{user_id}/{timestamp}.{ext}`
- Access: RLS policies restrict reads/writes to the owning user
- Signed URLs expire after 1 hour (generated on demand for "View report")

### Key Column: `weekly_settings.day_order_json`

JSONB mapping `{ "1": 3, "2": 1, ... }` — calendar day → workout template day.  
Used by `getEffectiveWorkoutDayNumber()` to resolve which workout runs on each calendar day.  
Legacy fields `swap_day_one` / `swap_day_two` still fall back to if `day_order_json` is null.

Added via migration:
```sql
alter table weekly_settings add column if not exists day_order_json jsonb default null;
```

`inbody_assessments` table and `inbody-images` storage bucket were created manually (not in schema.sql).

## Key Architectural Patterns

### Auth
Email + password via Supabase Auth. Session persists with `autoRefreshToken: true`. No OTP/magic-link — avoids rate-limit lockouts during development.

### Workout Logging Flow
`workout/page.tsx` (start/select) → `workout/log/page.tsx` (active session) → finish → `saveWorkoutAndLogsToSupabase()`.

In-progress session state is kept in `localStorage` via `lib/workout-log-state.ts` so a refresh doesn't lose work. Cleared after successful save.

### Progression Engine (`lib/progression-engine.ts`)
`getMachineAwareSuggestion()` takes `{ exerciseName, targetRepRange, topWeight, topReps, lastDifficulty }` and returns `{ workingWeight, setWeights[], note, incrementText }`.

Form quality drives load decisions:
- `Clean` + reps hit top of range → increase weight
- `Clean` + reps below top → hold
- `Slight Breakdown` → hold
- `Breakdown` → reduce

Machine-aware step sizes: cable stack (7.5 lb start, 5 lb ladder), lateral raises (custom ladder), major machines (fixed jumps), free movements (5–20 lb flexible).

Set weights are **pre-filled** in the workout log UI when history exists. The user can override before saving.

### Recovery Governor (`lib/recovery-governor.ts`)
Friday workout is adjusted based on basketball inputs collected in `weekly_settings`. `getFridayOutputType()` returns a `FridayOutputType` which drives `getFridayWorkoutFromOutput()`. Basketball timing, load detection, sleep quality, and pain flags all factor in.

### InBody AI Parsing
`POST /api/parse-inbody` — receives image as multipart form data, sends to `claude-opus-4-7` via vision API, returns structured JSON of all InBody 570 fields. Client shows a review form with pre-filled values before saving. Image is stored in private Supabase Storage; values saved to `inbody_assessments`.

InBody data is **intentionally separate** from `body_metrics` — clinic machine vs at-home scale measure differently and should not be mixed.

## Weekly Day Reordering

Plan page supports full Mon–Fri workout reordering for the current week only. Implemented as drag-and-drop via `@dnd-kit` with `rectSwappingStrategy` (swap semantics, not shift). Order persists in `weekly_settings.day_order_json`. Default template is unaffected.

## PWA Setup

- `apple-mobile-web-app-capable: true` — standalone mode on iOS
- Status bar style: `black`
- Theme color: `#020617` (slate-950)
- `overscroll-behavior: none` — prevents rubber-band bounce
- `-webkit-tap-highlight-color: transparent` — removes tap flash
- Production URL: `https://fitness-coach-mvp.vercel.app` (permanent, never changes between deploys)

## Feature Roadmap Status

**Tier 1 — Done:**
1. ✅ Full weekly day reordering (drag-and-drop, `day_order_json`)
2. ✅ Form-governor engine wired to actual load decisions + pre-fill
3. ✅ Better planner UI (5-day accordion, full week visible at once)

**Tier 2 — In Progress:**
4. ✅ InBody manual entry + AI upload (`inbody_assessments`, Claude vision)
5. ⬜ Dynamic weekly programming (rules engine reading 2–6 weeks of data)

**Tier 3 — Upcoming:**
6. ⬜ InBody-informed targeted programming
7. ⬜ Stubborn-fat / belly-fat response system
8. ⬜ Fully adaptive weekly coaching engine

## Notes

- Single-user app (Jonathan, jskud27@gmail.com). No multi-tenancy concerns.
- Workout template data lives entirely in `lib/workout-data.ts` — no DB table for the template itself.
- `lib/storage.ts` and `app/workout/exercise/[index]/page.tsx` are legacy (old LocalStorage system). Not actively used in the main workout flow but not yet removed.
- Always run `npx tsc --noEmit` before committing. CI does not run automatically.
- Do not sync InBody weight/BF% into `body_metrics` — user explicitly wants them separate.
