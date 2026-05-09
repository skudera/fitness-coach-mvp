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
} from '@/lib/recovery-governor'
import {
  getEffectiveWorkoutDayNumber,
  getWeekStartDate,
  getWeeklySettings,
  loadEquipmentPreferences,
  loadInBodyAssessmentsFromSupabase,
  saveWeeklyDayOrder,
  clearWeeklyDayOrder,
  type WeeklySettingsRow,
  type InBodyRow,
} from '@/lib/storage-supabase'
import { getInBodyDayNotes } from '@/lib/coaching-engine'

function getDayEmphasis(dayName: string) {
  switch (dayName) {
    case 'Monday':
      return 'Chest and shoulder work should stay controlled. Prioritize clean reps and a slow lowering phase on primary machine presses.'
    case 'Tuesday':
      return 'Back work stays controlled and core work should be treated as high-tension work, not just filler at the end.'
    case 'Wednesday':
      return 'Leg day should bias hamstrings, glutes, and trunk tension so the session supports posture and pelvic position, not just quad fatigue.'
    case 'Thursday':
      return 'Mixed upper day should stay clean and athletic. Keep lateral raises strict and avoid swinging or chasing sloppy reps before basketball.'
    case 'Friday':
      return 'Friday should reflect your basketball recovery inputs first. Let the governor decide whether this is a normal lift, a recovery flow, or a lighter day.'
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
      style={{ transform: CSS.Transform.toString(transform), transition, touchAction: 'none' }}
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
      <div className={`mt-1 text-[10px] font-medium leading-tight ${isSelected ? 'text-slate-800' : 'text-slate-400'}`}>
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
  const [latestInBody, setLatestInBody] = useState<InBodyRow | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    async function loadWeekly() {
      try {
        const weekStart = getWeekStartDate()
        const [weekly, prefs, inbodyRows] = await Promise.all([
          getWeeklySettings(weekStart),
          loadEquipmentPreferences(),
          loadInBodyAssessmentsFromSupabase(),
        ])
        setWeeklySettings(weekly ?? null)
        setCardioPreference(prefs?.cardio_preference ?? null)
        setLatestInBody(inbodyRows[0] ?? null)
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

  const detectedLoad = useMemo(() => detectBasketballLoad({
    minutes: weeklySettings?.basketball_minutes ?? 0,
    activeCalories: weeklySettings?.basketball_active_calories ?? 0,
    avgHr: weeklySettings?.basketball_avg_hr ?? 0,
  }), [weeklySettings])

  return (
    <div className="space-y-6 pb-6">
      <div>
        <div className="label">Weekly Plan</div>
        <h1 className="text-2xl font-semibold tracking-tight">Preview your workouts</h1>
      </div>

      {/* Drag-and-drop reorder grid */}
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

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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

        <p className="text-center text-[10px] text-slate-600">Drag to reorder · tap to expand</p>
      </section>

      {/* Week overview accordion — all 5 days visible */}
      <div className="space-y-2">
        {weekdayOptions.map(({ day, label }, index) => {
          const workoutDay = slotOrder[index]
          const baseWorkout = weekPlan.find((item) => item.day === workoutDay)?.workout ?? weekPlan[0].workout
          const isReordered = workoutDay !== day
          const isExpanded = selectedDay === day
          const emphasis = getDayEmphasis(baseWorkout.dayName)

          const fridayOutput =
            baseWorkout.dayName === 'Friday'
              ? getFridayOutputType({
                  basketballStatus: weeklySettings?.basketball_status ?? null,
                  basketballTiming: weeklySettings?.basketball_timing ?? null,
                  basketballImpact: weeklySettings?.basketball_impact ?? null,
                  fridaySleepQuality: weeklySettings?.friday_sleep_quality ?? null,
                  basketballMinutes: weeklySettings?.basketball_minutes ?? null,
                  basketballActiveCalories: weeklySettings?.basketball_active_calories ?? null,
                  basketballAvgHr: weeklySettings?.basketball_avg_hr ?? null,
                })
              : null

          const displayWorkout =
            baseWorkout.dayName === 'Friday' && fridayOutput
              ? getFridayWorkoutFromOutput(fridayOutput, cardioPreference)
              : baseWorkout

          return (
            <div
              key={day}
              className={`rounded-2xl border transition-colors ${
                isExpanded
                  ? 'border-emerald-500/30 bg-slate-900'
                  : 'border-slate-700 bg-slate-900/40'
              }`}
            >
              {/* Row header — always visible, tap to expand */}
              <button
                type="button"
                onClick={() => setSelectedDay(isExpanded ? -1 : day)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`w-7 shrink-0 text-xs font-bold ${
                      isExpanded ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {label}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-100">
                      {displayWorkout.focus}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      {displayWorkout.exercises.length} exercises · {displayWorkout.estimatedMinutes}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {isReordered ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  ) : null}
                  <span
                    className={`text-lg text-slate-500 transition-transform duration-200 ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  >
                    ›
                  </span>
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded ? (
                <div className="space-y-4 border-t border-slate-700/60 px-4 pb-4 pt-3">
                  {/* Reorder note */}
                  {isReordered ? (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                      <p className="text-xs text-amber-300">
                        This slot normally shows{' '}
                        {weekPlan.find((item) => item.day === day)?.workout.dayName} — swapped this week.
                      </p>
                    </div>
                  ) : null}

                  {/* InBody-informed day notes */}
                  {(() => {
                    const inbodyNotes = getInBodyDayNotes(displayWorkout.dayName, latestInBody)
                    if (!inbodyNotes.length) return null
                    return (
                      <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 px-3 py-2.5 space-y-1">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-400">
                          InBody insight
                        </div>
                        {inbodyNotes.map((note, i) => (
                          <p key={i} className="text-xs text-slate-300 leading-relaxed">
                            {note}
                          </p>
                        ))}
                      </div>
                    )
                  })()}

                  {/* Emphasis */}
                  {emphasis ? (
                    <p className="text-sm leading-relaxed text-slate-400">{emphasis}</p>
                  ) : null}

                  {/* Warmup */}
                  <div>
                    <div className="label mb-1.5">Warmup</div>
                    <p className="text-sm text-slate-300">{displayWorkout.warmup}</p>
                  </div>

                  {/* Exercise list */}
                  <div>
                    <div className="label mb-2">Exercises</div>
                    <div className="space-y-2">
                      {displayWorkout.exercises.map((exercise) => {
                        const target = getTargetForExercise(exercise)
                        const tags = getExerciseCoachingTags(displayWorkout.dayName, exercise)
                        return (
                          <div
                            key={exercise}
                            className="rounded-xl border border-slate-700/60 bg-slate-800/50 px-3 py-2.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm text-slate-100">{exercise}</span>
                              <span className="shrink-0 rounded-full bg-slate-700 px-2.5 py-1 text-xs text-slate-300">
                                {target.sets} × {target.reps}
                              </span>
                            </div>
                            {tags.length ? (
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {tags.map((tag) => (
                                  <span
                                    key={`${exercise}-${tag}`}
                                    className="text-[10px] font-semibold text-emerald-400"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Cardio */}
                  <div>
                    <div className="label mb-1.5">Cardio</div>
                    <p className="text-sm text-slate-300">{displayWorkout.cardio}</p>
                  </div>

                  {/* Friday governor summary */}
                  {baseWorkout.dayName === 'Friday' ? (
                    <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-3 space-y-1.5">
                      <div className="label">Friday Governor</div>
                      <div className="text-sm text-slate-300">
                        Basketball:{' '}
                        <span className="capitalize text-white">
                          {weeklySettings?.basketball_status ?? 'not answered'}
                        </span>
                      </div>
                      {weeklySettings?.basketball_status === 'yes' ? (
                        <>
                          <div className="text-sm text-slate-300">
                            Detected load:{' '}
                            <span className="capitalize text-white">{detectedLoad}</span>
                          </div>
                          <div className="text-sm text-slate-300">
                            Morning feel:{' '}
                            <span className="capitalize text-white">
                              {weeklySettings?.friday_sleep_quality?.replaceAll('_', ' ') ?? 'not set'}
                            </span>
                          </div>
                        </>
                      ) : null}
                      {fridayOutput ? (
                        <div className="mt-2 rounded-lg bg-slate-800/60 px-3 py-2">
                          <div className="text-xs font-semibold text-emerald-400">
                            {getFridayOutputLabel(fridayOutput)}
                          </div>
                          <p className="mt-1 text-xs text-slate-400">
                            {getFridayOutputWhy(fridayOutput)}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600">
                      Form-first progression: Clean → advance · Slight Breakdown → hold · Breakdown → reduce
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <Link
        href="/workout"
        className="block w-full rounded-[1.75rem] bg-emerald-500 px-5 py-5 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-emerald-400"
      >
        Go to Workout
      </Link>
    </div>
  )
}
