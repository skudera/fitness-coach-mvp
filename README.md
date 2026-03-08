# Fitness Coach MVP Scaffold

This is a first-pass MVP scaffold for the personal adaptive fitness coach app.

## Included
- Next.js + TypeScript + Tailwind mobile-first scaffold
- Bottom tab navigation
- Home screen
- Monday Check-In screen
- Workout snapshot with optional reordering
- One-exercise-per-screen logger
- Progress bar: Warmup → 1 → 2 → 3 → 4 → 5 → Cardio
- Mock weekly plan data
- Rules engine starter functions
- Supabase schema starter SQL

## Not yet implemented
- Real authentication
- Real Supabase CRUD integration
- Drag-and-drop reordering
- Stored learning model for gym flow
- Charts
- Photo upload
- LLM weekly summaries
- Persistent workout logs

## Quick start
1. `npm install`
2. Create `.env.local` with:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `npm run dev`

## Suggested next build steps
1. Connect Home / Check-In / Workout to Supabase
2. Add auth for single-user login
3. Save weekly plans and logs
4. Add charting on Progress page
5. Add photo uploads
6. Add weekly coach report generation
