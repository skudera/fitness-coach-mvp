'use client'

import { useState } from 'react'

type RoutineItem = {
  title: string
  durationOrReps: string
  instructions: string[]
}

const fullRoutine: RoutineItem[] = [
  {
    title: 'Diaphragmatic Breathing',
    durationOrReps: '2 min • 6–8 slow breaths',
    instructions: [
      'Lie on your back with knees bent and feet flat, or place feet on a wall.',
      'Keep one hand on your chest and one on your stomach.',
      'Inhale through your nose and expand your stomach, not your chest.',
      'Exhale slowly through your mouth.',
    ],
  },
  {
    title: 'Kneeling Hip Flexor Stretch',
    durationOrReps: '2 min total • 45–60 sec per side',
    instructions: [
      'Start in a half-kneeling position with one knee down and one foot forward.',
      'Keep your torso upright and gently push the hips forward.',
      'Squeeze the glute of the kneeling leg.',
      'Do not arch your lower back.',
    ],
  },
  {
    title: 'Hamstring Stretch',
    durationOrReps: '2 min total • 8–10 slow raises per side + hold',
    instructions: [
      'Lie on your back and loop a strap or towel around one foot.',
      'Raise the leg upward while keeping a slight bend in the knee.',
      'Keep hips flat on the ground.',
      'After the raises, hold the final stretch for 20–30 seconds.',
    ],
  },
  {
    title: 'Standing or Side-Lying Quad Stretch',
    durationOrReps: '1–2 min • 30 sec per side',
    instructions: [
      'Grab the ankle behind you, or lie on your side and pull the ankle in.',
      'Keep the knees close together.',
      'Slightly tuck the pelvis and avoid arching your lower back.',
      'Stay upright through the torso.',
    ],
  },
  {
    title: 'Thoracic Spine Extension',
    durationOrReps: '2 min • 8–10 slow reps',
    instructions: [
      'Place a foam roller or rolled towel under the upper back.',
      'Support your head with your hands.',
      'Gently lean backward over the roller.',
      'Return to neutral with control.',
    ],
  },
  {
    title: 'Doorway Chest (Pec) Stretch',
    durationOrReps: '1–2 min • 30–45 sec, repeat 2 times',
    instructions: [
      'Place arms on the doorway around a 45–90° angle.',
      'Step forward slowly.',
      'Keep your chest tall and core engaged.',
      'Do not arch your lower back.',
    ],
  },
  {
    title: 'Upper Trap / Neck Stretch',
    durationOrReps: '1–2 min • 30 sec per side',
    instructions: [
      'Sit or stand upright.',
      'Gently tilt your head to one side.',
      'Use your hand for light pressure only.',
      'Keep the opposite shoulder relaxed and down.',
    ],
  },
  {
    title: 'Glute Bridge',
    durationOrReps: '2 min • 2 sets of 12 reps',
    instructions: [
      'Lie on your back with knees bent and feet flat.',
      'Push through your heels to lift the hips.',
      'Squeeze the glutes at the top.',
      'Pause 1–2 seconds and avoid arching the back.',
    ],
  },
  {
    title: 'Wall Slides',
    durationOrReps: '2 min • 8–10 slow reps',
    instructions: [
      'Stand with your back against the wall.',
      'Keep arms and hands against the wall as much as possible.',
      'Slowly slide the arms upward.',
      'Keep ribs down and lower back neutral.',
    ],
  },
  {
    title: 'Resistance Band Pull-Aparts',
    durationOrReps: '1–2 min • 2 sets of 12–15 reps',
    instructions: [
      'Hold a light band at chest height.',
      'Pull the band apart by moving the arms outward.',
      'Focus on squeezing the shoulder blades together.',
      'Keep shoulders down and do not shrug.',
    ],
  },
  {
    title: 'Child’s Pose with Side Stretch',
    durationOrReps: '1–2 min • 30–45 sec per side',
    instructions: [
      'Start in child’s pose with knees down and hips back.',
      'Walk the hands to one side.',
      'Feel the stretch along the side of the upper back.',
      'Breathe slowly and stay relaxed.',
    ],
  },
]

const minimumRoutine: RoutineItem[] = [
  {
    title: 'Kneeling Hip Flexor Stretch',
    durationOrReps: '45–60 sec per side',
    instructions: [
      'Keep torso upright.',
      'Push hips forward gently.',
      'Squeeze the glute of the kneeling leg.',
    ],
  },
  {
    title: 'Doorway Chest (Pec) Stretch',
    durationOrReps: '30–45 sec, repeat 2 times',
    instructions: [
      'Step forward slowly into the stretch.',
      'Keep chest tall.',
      'Do not arch lower back.',
    ],
  },
  {
    title: 'Glute Bridges',
    durationOrReps: '2 sets of 12 reps',
    instructions: [
      'Drive through the heels.',
      'Squeeze glutes at the top.',
      'Pause 1–2 seconds each rep.',
    ],
  },
  {
    title: 'Resistance Band Pull-Aparts',
    durationOrReps: '2 sets of 12–15 reps',
    instructions: [
      'Move arms outward with control.',
      'Squeeze shoulder blades together.',
      'Keep shoulders down.',
    ],
  },
]

function RoutineCard({ item }: { item: RoutineItem }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[1rem] font-semibold text-white">{item.title}</div>
        <div className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
          {item.durationOrReps}
        </div>
      </div>

      <ul className="mt-4 space-y-2 pl-5 text-sm leading-6 text-slate-300">
        {item.instructions.map((instruction) => (
          <li key={instruction} className="list-disc">
            {instruction}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function RecoveryPage() {
  const [mode, setMode] = useState<'full' | 'minimum'>('full')

  const isFull = mode === 'full'
  const activeRoutine = isFull ? fullRoutine : minimumRoutine

  return (
    <div className="space-y-6 pb-6">
      <div>
        <div className="label">Recovery</div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Evening Mobility & Recovery
        </h1>
        <p className="mt-2 text-slate-300">
          A simple nightly routine to improve posture, loosen tight areas, support recovery,
          and reduce injury risk.
        </p>
      </div>

      <section className="card space-y-4">
        <div className="label">Choose Tonight&apos;s Routine</div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode('full')}
            className={`rounded-2xl px-4 py-4 text-center text-sm font-semibold transition ${
              isFull
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            Full Routine
          </button>

          <button
            type="button"
            onClick={() => setMode('minimum')}
            className={`rounded-2xl px-4 py-4 text-center text-sm font-semibold transition ${
              !isFull
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            5-Min Option
          </button>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4 text-sm leading-6 text-slate-300">
          {isFull
            ? 'Full 12–15 minute mobility and recovery flow.'
            : 'Quick reset when you are short on time.'}
        </div>
      </section>

      <section className="card space-y-4">
        <div className="label">Purpose</div>
        <ul className="space-y-2 pl-5 text-sm leading-6 text-slate-300">
          <li className="list-disc">Improve posture and reduce rounded shoulders.</li>
          <li className="list-disc">Reduce upper trap and shoulder tension.</li>
          <li className="list-disc">Loosen hips, hamstrings, and quads.</li>
          <li className="list-disc">Improve core and glute activation.</li>
          <li className="list-disc">Support recovery and reduce injury risk.</li>
        </ul>
      </section>

      <section className="card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="label">{isFull ? 'Full Routine' : '5-Min Minimum Version'}</div>
          <div className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
            {isFull ? '12–15 min' : 'Quick option'}
          </div>
        </div>

        <div className="space-y-3">
          {activeRoutine.map((item) => (
            <RoutineCard key={item.title} item={item} />
          ))}
        </div>
      </section>

      <section className="card space-y-4">
        <div className="label">Guidelines</div>
        <ul className="space-y-2 pl-5 text-sm leading-6 text-slate-300">
          <li className="list-disc">Move slowly and with control.</li>
          <li className="list-disc">Stretch to mild tension, not pain.</li>
          <li className="list-disc">Focus on breathing throughout.</li>
          <li className="list-disc">Avoid shrugging the shoulders during movements.</li>
        </ul>
      </section>
    </div>
  )
}