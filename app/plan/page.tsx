'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSwappingStrategy,
  arraySwap,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getWeekPlan, getTargetForExercise } from '@/lib/workout-data'
import {
  detectBasketballLoad,
  getFridayOutputLabel,
  getFridayOutputType,
  getFridayOutputWhy,
  getFridayWorkoutFromOutput,
  type FridayOutputType,
} from '@/lib/recovery-governor'
import {
  getEffectiveWorkoutDayNumber,
  getWeekStartDate,
  getWeeklySettings,
  loadEquipmentPreferences,
  saveWeeklyDayOrder,
  clearWeeklyDayOrder,
  type WeeklySettingsRow,
} from '@/lib/storage-supabase'

function getDayEmphasis(dayName: string) {
  switch (dayName) {
    case 'Monday':
      return {
        title: 'Monday emphasis',
        body: 'Chest and shoulder work should stay controlled. Prioritize clean reps and a slow lowering phase on primary machine presses.',
      }
    case 'Tuesday':
      return {
        title: 'Tuesday emphasis',
        body: 'Back work stays controlled and core work should be treated as high-tension work, not just filler at the end.',
      }
    case 'Wednesday':
      return {
        title: 'Wednesday emphasis',
        body: 'Leg day should bias hamstrings, glutes, and trunk tension so the session supports posture and pelvic position, not just quad fatigue.',
      }
    case 'Thursday':
      return {
        title: 'Thursday emphasis',
        body: 'Mixed upper day should stay clean and athletic. Keep lateral raises strict and avoid swinging or chasing sloppy reps before basketball.',
      }
    case 'Friday':
      return {
        title: 'Friday emphasis',
        body: 'Friday should reflect your basketball recovery inputs first. Let the governor decide whether this is a normal lift, a recovery flow, or a lighter day.',
      }
    default:
      return null
  }
}

function getExerciseCoachingTags(dayName: string, exerciseName: string) {
  const name = exerciseName.toLowerCase()
  const tags: string[] = []

  if (
    name.includes('chest press machine') ||
    name.includes('smith machine incline chest press') ||
    name.includes('vertical traction machine') ||
    name.includes('lat pulldown') ||
    name.includes('leg press')
  ) {
    tags.push('3-sec eccentric')
  }

  if (name.includes('cable crunch') || name.includes('ab machine') || name.includes('dead-bug')) {
    tags.push('high-tension core')
  }

  if (dayName === 'Wednesday' && name.includes('hamstring curl')) {
    tags.push('posterior chain priority')
  }

  if (dayName === 'Wednesday' && (name.includes('glute bridge') || name.includes('abductor machine'))) {
    tags.push('glute support')
  }

  if (dayName === 'Thursday' && name.includes('lateral raise')) {
    tags.push('strict form')
  }

  if (
    name.includes('chest press machine') ||
    name.includes('smith machine incline chest press') ||
    name.includes('vertical traction machine') ||
    name.includes('lat pulldown') ||
    name.includes('row') ||
    name.includes('hack squat') ||
    name.includes('leg press')
  ) {
    tags.push('form-first progression')
  }

  return tags
}

function shortFocus(focus: string) {
  return focus.split(' / ')[0]
}

const weekdayOptions = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
]

function SortableWorkoutCard({
  id,
  calendarLabel,
  isSelected,
  isReordered,
  focus,
  onClick,
}: {
  id: number
  calendarLabel: string
  isSelected: boolean
  isReordered: boolean
  focus: string
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        touchAction: 'none',
      }}
      {...attributes}
      {...listeners}
      className={`relative rounded-2xl px-2 py-3 text-center select-none transition ${
        isDragging ? 'opacity-40 scale-95' : ''
      } ${
        isSelected
          ? 'bg-emerald-500 text-slate-950'
          : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
      }`}
    >
      <div className="text-xs font-semibold">{calendarLabel}</div>
      <div
        className={`mt-1 text-[10px] font-medium leading-tight ${
          isSelected ? 'text-slate-800' : 'text-slate-400'
        }`}
      >
        {shortFocus(focus)}
      </div>
      {isReordered ? (
        <div className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
      ) : null}
    </button>
  )
}

export default function PlanPage() {
  const weekPlan = useMemo(() => getWeekPlan(), [])
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const today = new Date().getDay()
    return today >= 1 && today <= 5 ? today : 1
  })
  const [weeklySettings, setWeeklySettings] = useState<WeeklySettingsRow | null>(null)
  const [cardioPreference, setCardioPreference] = useState<string | null>(null)
  const [slotOrder, setSlotOrder] = useState<number[]>([1, 2, 3, 4, 5])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    async function loadWeekly() {
      try {
        const weekStart = getWeekStartDate()
        const [weekly, prefs] = await Promise.all([
          getWeeklySettings(weekStart),
          loadEquipmentPreferences(),
        ])
        setWeeklySettings(weekly ?? null)
        setCardioPreference(prefs?.cardio_preference ?? null)
      } catch (error) {
        console.error('Plan page weekly settings load error', error)
        setWeeklySettings(null)
        setCardioPreference(null)
      }
    }
    loadWeekly()
  }, [])

  useEffect(() => {
    const order = weekdayOptions.map(({ day }) =>
      getEffectiveWorkoutDayNumber(day, weeklySettings)
    )
    setSlotOrder(order)
  }, [weeklySettings])

  const isReorderActive = useMemo(
    () => slotOrder.some((workoutDay, i) => workoutDay !== weekdayOptions[i].day),
    [slotOrder]
  )

  const selectedWorkout = useMemo(() => {
    const slotIndex = weekdayOptions.findIndex((opt) => opt.day === selectedDay)
    const workoutDay = slotIndex >= 0 ? slotOrder[slotIndex] : selectedDay
    return weekPlan.find((item) => item.day === workoutDay)?.workout ?? weekPlan[0].workout
  }, [weekPlan, slotOrder, selectedDay])

  const selectedBaseWorkout = useMemo(
    () => weekPlan.find((item) => item.day === selectedDay)?.workout ?? weekPlan[0].workout,
    [weekPlan, selectedDay]
  )

  const fridayOutput = useMemo<FridayOutputType | null>(() => {
    if (selectedWorkout.dayName !== 'Friday') return null
    return getFridayOutputType({
      basketballStatus: weeklySettings?.basketball_status ?? null,
      basketballTiming: weeklySettings?.basketball_timing ?? null,
      basketballImpact: weeklySettings?.basketball_impact ?? null,
      fridaySleepQuality: weeklySettings?.friday_sleep_quality ?? null,
      basketballMinutes: weeklySettings?.basketball_minutes ?? null,
      basketballActiveCalories: weeklySettings?.basketball_active_calories ?? null,
      basketballAvgHr: weeklySettings?.basketball_avg_hr ?? null,
    })
  }, [selectedWorkout.dayName, weeklySettings])

  const effectiveWorkout = useMemo(() => {
    if (selectedWorkout.dayName === 'Friday' && fridayOutput) {
      return getFridayWorkoutFromOutput(fridayOutput, cardioPreference)
    }
    return selectedWorkout
  }, [selectedWorkout, fridayOutput, cardioPreference])

  const detectedLoad = useMemo(() => {
    return detectBasketballLoad({
      minutes: weeklySettings?.basketball_minutes ?? 0,
      activeCalories: weeklySettings?.basketball_active_calories ?? 0,
      avgHr: weeklySettings?.basketball_avg_hr ?? 0,
    })
  }, [weeklySettings])

  const dayEmphasis = useMemo(
    () => getDayEmphasis(effectiveWorkout.dayName),
    [effectiveWorkout.dayName]
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = slotOrder.indexOf(Number(active.id))
    const newIndex = slotOrder.indexOf(Number(over.id))
    const newOrder = arraySwap(slotOrder, oldIndex, newIndex)
    setSlotOrder(newOrder)

    const weekStart = getWeekStartDate()
    const isDefault = newOrder.every((workoutDay, i) => workoutDay === weekdayOptions[i].day)

    try {
      if (isDefault) {
        await clearWeeklyDayOrder(weekStart)
      } else {
        const orderMap: Record<string, number> = {}
        weekdayOptions.forEach(({ day }, i) => {
          orderMap[String(day)] = newOrder[i]
        })
        await saveWeeklyDayOrder(weekStart, orderMap)
      }
      const refreshed = await getWeeklySettings(weekStart)
      setWeeklySettings(refreshed)
    } catch (error) {
      console.error('Save day order error', error)
      setSlotOrder(slotOrder)
    }
  }

  async function handleResetOrder() {
    const weekStart = getWeekStartDate()
    try {
      await clearWeeklyDayOrder(weekStart)
      const refreshed = await getWeeklySettings(weekStart)
      setWeeklySettings(refreshed)
    } catch (error) {
      console.error('Reset day order error', error)
    }
  }

  return (
    <div className="space-y-6 pb-6">
      <div>
        <div className="label">Weekly Plan</div>
        <h1 className="text-2xl font-semibold tracking-tight">Preview your workouts</h1>
        <p className="mt-2 text-slate-300">
          Select a day to view the full workout plan.
        </p>
      </div>

      <section className="card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="label">This Week</div>
          {isReorderActive ? (
            <button
              type="button"
              onClick={handleResetOrder}
              className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
            >
              Reset Order
            </button>
          ) : null}
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={slotOrder} strategy={rectSwappingStrategy}>
            <div className="grid grid-cols-5 gap-2">
              {weekdayOptions.map(({ day, label }, index) => {
                const workoutDay = slotOrder[index]
                const workout = weekPlan.find((item) => item.day === workoutDay)?.workout
                return (
                  <SortableWorkoutCard
                    key={workoutDay}
                    id={workoutDay}
                    calendarLabel={label}
                    isSelected={selectedDay === day}
                    isReordered={workoutDay !== day}
                    focus={workout?.focus ?? ''}
                    onClick={() => setSelectedDay(day)}
                  />
                )
              })}
            </div>
          </SortableContext>
        </DndContext>

        <p className="text-center text-[10px] text-slate-600">Drag to reorder · tap to select</p>
      </section>

      <section className="card space-y-4">
        <div className="label">{effectiveWorkout.dayName}</div>
        <h2 className="text-2xl font-semibold text-white">{effectiveWorkout.focus}</h2>
        <p className="text-slate-300">{effectiveWorkout.estimatedMinutes}</p>

        {selectedBaseWorkout.dayName !== effectiveWorkout.dayName ? (
          <div className="rounded-2xl border border-amber-500/30 bg-slate-900/40 p-4">
            <div className="label">Day Swap Applied</div>
            <p className="mt-2 text-slate-100">
              This calendar day normally shows{' '}
              <span className="font-semibold">{selectedBaseWorkout.dayName}</span>, but this week
              it is using <span className="font-semibold">{effectiveWorkout.dayName}</span>.
            </p>
          </div>
        ) : null}

        {dayEmphasis ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="label">{dayEmphasis.title}</div>
            <p className="mt-2 text-slate-100">{dayEmphasis.body}</p>
          </div>
        ) : null}

        {selectedWorkout.dayName === 'Friday' ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="label">Friday Governor Inputs</div>
            <div className="mt-2 text-sm text-slate-300">
              Basketball happened:{' '}
              <span className="capitalize text-white">
                {weeklySettings?.basketball_status ?? 'not answered'}
              </span>
            </div>

            {weeklySettings?.basketball_status === 'yes' ? (
              <>
                <div className="mt-1 text-sm text-slate-300">
                  Timing:{' '}
                  <span className="capitalize text-white">
                    {weeklySettings?.basketball_timing ?? 'not set'}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  Minutes:{' '}
                  <span className="text-white">
                    {weeklySettings?.basketball_minutes ?? '—'}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  Active Calories:{' '}
                  <span className="text-white">
                    {weeklySettings?.basketball_active_calories ?? '—'}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  Avg HR:{' '}
                  <span className="text-white">
                    {weeklySettings?.basketball_avg_hr ?? '—'}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  Morning feel:{' '}
                  <span className="capitalize text-white">
                    {weeklySettings?.friday_sleep_quality?.replaceAll('_', ' ') ?? 'not set'}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  Pain concern:{' '}
                  <span className="capitalize text-white">
                    {weeklySettings?.basketball_impact === 'pain_issue'
                      ? 'yes'
                      : weeklySettings?.basketball_impact === 'no_issue'
                        ? 'no'
                        : 'not set'}
                  </span>
                </div>
                <div className="mt-3 text-sm text-slate-300">
                  Detected Load:{' '}
                  <span className="capitalize text-white">{detectedLoad}</span>
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        {selectedWorkout.dayName === 'Friday' && fridayOutput ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="label">{getFridayOutputLabel(fridayOutput)}</div>
            <p className="mt-2 text-slate-100">{getFridayOutputWhy(fridayOutput)}</p>
          </div>
        ) : null}

        <div>
          <div className="label mb-2">Warmup</div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4 text-slate-100">
            {effectiveWorkout.warmup}
          </div>
        </div>

        <div>
          <div className="label mb-2">Exercises</div>
          <div className="space-y-3">
            {effectiveWorkout.exercises.map((exercise) => {
              const target = getTargetForExercise(exercise)
              const tags = getExerciseCoachingTags(effectiveWorkout.dayName, exercise)

              return (
                <div
                  key={exercise}
                  className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-slate-100">{exercise}</div>
                    <div className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                      {target.sets} × {target.reps}
                    </div>
                  </div>

                  {tags.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <div
                          key={`${exercise}-${tag}`}
                          className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-emerald-300"
                        >
                          {tag}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <div className="label mb-2">Cardio</div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4 text-slate-100">
            {effectiveWorkout.cardio}
          </div>
        </div>

        {effectiveWorkout.dayName !== 'Friday' ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="label">Progression rule</div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Progression should stay form-first. Clean reps earn normal progression. Slight
              breakdown means hold the load. Clear breakdown means reduce load next time.
            </p>
          </div>
        ) : null}
      </section>

      <Link
        href="/workout"
        className="block w-full rounded-[1.75rem] bg-emerald-500 px-5 py-5 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-emerald-400"
      >
        Go to Workout
      </Link>
    </div>
  )
}
