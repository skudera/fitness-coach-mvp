'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getWorkoutForDay,
  getTargetForExercise,
  getExerciseSubstitutions,
  PT_CLEARANCE_EXERCISES,
  getExerciseHistoryAliases,
  applyCardioPreference,
  type WorkoutDefinition,
} from '@/lib/workout-data'
import {
  getFridayOutputType,
  getFridayWorkoutFromOutput,
  type FridayOutputType,
} from '@/lib/recovery-governor'
import {
  getEffectiveWorkoutDayNumber,
  getLocalDateString,
  getWeekStartDate,
  getWeeklySettings,
  saveWorkoutAndLogsToSupabase,
  loadExerciseLogHistoryFromSupabase,
  loadExerciseSettings,
  loadPainLogsFromSupabase,
  saveExerciseSettings,
  loadEquipmentPreferences,
  loadCoachingOverrides,
  type ExerciseLogRow,
  type WeeklySettingsRow,
  type CoachingOverrides,
} from '@/lib/storage-supabase'
import {
  loadWorkoutProgress,
  saveWorkoutProgress,
  clearWorkoutProgress,
  type WorkoutExerciseEntry,
  type WorkoutProgressState,
} from '@/lib/workout-log-state'
import {
  BASELINE_WEEK_END,
  getMachineAwareSuggestion,
  isWorseThan,
  parsePainSeverity,
  PROGRESSION_FRESH_START,
} from '@/lib/progression-engine'
import { applyExerciseSettings, type ExerciseSettings } from '@/lib/exercise-settings'

type RecoveryFlowConfig = {
  isRecovery: boolean
  introTitle: string
  introText: string
  introItems: Array<{ name: string; detail: string }>
  introButtonLabel: string
  finishLabel: string
  targetByExercise: Record<string, string>
}

function createBlankSets(count = 3) {
  return Array.from({ length: count }, () => ({ weight: '', reps: '' }))
}

function buildInitialEntries(
  workout: WorkoutDefinition,
  fixedSetCount?: number
): WorkoutExerciseEntry[] {
  return workout.exercises.map((name) => ({
    name,
    substitutedFrom: null,
    sets: createBlankSets(fixedSetCount ?? getTargetForExercise(name, workout).sets),
    difficulty: '',
    effort: '',
    discomfortLocation: 'None',
    discomfortSeverity: '',
    note: '',
  }))
}

function getNextPendingIndex(
  currentIndex: number,
  entriesLength: number,
  completedIndices: number[]
) {
  for (let i = currentIndex + 1; i < entriesLength; i += 1) {
    if (!completedIndices.includes(i)) return i
  }

  for (let i = 0; i < entriesLength; i += 1) {
    if (!completedIndices.includes(i)) return i
  }

  return -1
}

function parseFirstNumber(value: string) {
  const match = value.match(/\d+/)
  return match ? Number(match[0]) : 0
}

function getLatestPerformance(logs: ExerciseLogRow[], aliases: string[]) {
  const aliasSet = new Set(aliases)
  const freshStartMs = new Date(PROGRESSION_FRESH_START).getTime()
  const candidates = logs
    .filter((log) => aliasSet.has(log.exercise_name))
    .filter((log) => new Date(log.created_at ?? 0).getTime() >= freshStartMs)
  // Skipped exercises are saved as blank rows; they must not replace real history.
  const performed = new Set(
    candidates
      .filter((log) => (log.reps ?? 0) > 0 || log.discomfort)
      .map((log) => log.workout_id)
  )
  const relevant = candidates
    .filter((log) => performed.has(log.workout_id))
    .sort((a, b) => {
      const aTime = new Date(a.created_at ?? 0).getTime()
      const bTime = new Date(b.created_at ?? 0).getTime()
      return bTime - aTime
    })

  if (!relevant.length) return null

  const latest = relevant[0]
  const latestGroup = relevant.filter(
    (log) => log.workout_id === latest.workout_id && log.exercise_name === latest.exercise_name
  )

  const sets = [...latestGroup]
    .sort((a, b) => a.set_number - b.set_number)
    .map((log) => ({ weight: log.weight ?? null, reps: log.reps ?? null }))
  const weightedSets = sets.filter((set) => (set.weight ?? 0) > 0)
  const topWeight = Math.max(0, ...weightedSets.map((set) => set.weight ?? 0))
  const topReps = Math.max(
    0,
    ...weightedSets.filter((set) => set.weight === topWeight).map((set) => set.reps ?? 0)
  )

  return {
    sets,
    topWeight,
    topReps,
    lastDifficulty: latestGroup.find((log) => log.difficulty)?.difficulty ?? null,
    lastEffort: latest.effort ?? null,
  }
}

/**
 * Pain is never reset by date. Severe pain blocks until cleared; other discomfort
 * stays active until a later session of the exercise is performed without it.
 */
function getPainState(
  history: ExerciseLogRow[],
  painLogs: ExerciseLogRow[],
  aliases: string[],
  clearedAt?: string | null
) {
  const time = (value?: string | null) => new Date(value ?? 0).getTime()
  const painful = painLogs
    .filter((log) => aliases.includes(log.exercise_name) && parsePainSeverity(log.discomfort))
    .sort((a, b) => time(b.created_at) - time(a.created_at))
  const latest = painful[0]
  const resolved =
    latest &&
    history.some(
      (log) =>
        aliases.includes(log.exercise_name) &&
        (log.reps ?? 0) > 0 &&
        time(log.created_at) > time(latest.created_at)
    )
  const active = latest && !resolved ? latest : null

  return {
    reviewRequired: painful.some(
      (log) =>
        parsePainSeverity(log.discomfort) === 'Severe' && time(log.created_at) > time(clearedAt)
    ),
    discomfort: active?.discomfort ?? null,
    cleared: Boolean(active && time(clearedAt) > time(active.created_at)),
  }
}

function formatDiscomfort(entry: WorkoutExerciseEntry, previous: string | null | undefined) {
  if (entry.discomfortLocation === 'None') return null
  const text = `${entry.discomfortLocation}${
    entry.discomfortSeverity ? ` - ${entry.discomfortSeverity}` : ''
  }`
  const worse = isWorseThan(parsePainSeverity(text), parsePainSeverity(previous))
  return worse && parsePainSeverity(text) !== 'Severe' ? `${text} (worsening)` : text
}

function getSuggestedCardioMinutes(
  plannedCardioMinutes: number,
  targetSessionMinutes: number,
  strengthElapsedMinutes: number
) {
  if (!plannedCardioMinutes) return 0
  if (!targetSessionMinutes) return plannedCardioMinutes

  const projectedWithPlanned = strengthElapsedMinutes + plannedCardioMinutes
  const shortfall = targetSessionMinutes - projectedWithPlanned

  if (shortfall <= 3) {
    return plannedCardioMinutes
  }

  if (shortfall <= 8) {
    return plannedCardioMinutes + 2
  }

  return Math.min(plannedCardioMinutes + 4, 20)
}

function getEffectiveWorkoutForLog(params: {
  baseWorkout: WorkoutDefinition
  weeklySettings: WeeklySettingsRow | null
  cardioPreference: string | null
}): { workout: WorkoutDefinition; fridayOutput: FridayOutputType | null } {
  const { baseWorkout, weeklySettings, cardioPreference } = params

  if (baseWorkout.dayName !== 'Friday') {
    return {
      workout: baseWorkout,
      fridayOutput: null,
    }
  }

  const fridayOutput = getFridayOutputType({
    basketballStatus: weeklySettings?.basketball_status ?? null,
    basketballTiming: weeklySettings?.basketball_timing ?? null,
    basketballImpact: weeklySettings?.basketball_impact ?? null,
    fridaySleepQuality: weeklySettings?.friday_sleep_quality ?? null,
    basketballMinutes: weeklySettings?.basketball_minutes ?? null,
    basketballActiveCalories: weeklySettings?.basketball_active_calories ?? null,
    basketballAvgHr: weeklySettings?.basketball_avg_hr ?? null,
  })

  return {
    workout: getFridayWorkoutFromOutput(fridayOutput, cardioPreference),
    fridayOutput,
  }
}

function getRecoveryFlowConfig(workout: WorkoutDefinition): RecoveryFlowConfig {
  if (workout.focus === 'Home Anti-Office Recovery') {
    return {
      isRecovery: true,
      introTitle: 'Decompress & Open',
      introText:
        'Start with the opening mobility block below before moving into activation and breathing.',
      introItems: [
        { name: '90/90 Hip Switches', detail: '2 min' },
        { name: 'Couch Stretch', detail: '2 min each side' },
        { name: 'Child’s Pose with Side Reach', detail: '2 min total' },
      ],
      introButtonLabel: 'Start Recovery Flow',
      finishLabel: 'Finish Recovery Flow',
      targetByExercise: {
        '90/90 Hip Switches': '2 min',
        'Couch Stretch': '2 min each side',
        'Child’s Pose with Side Reach': '2 min total',
        'Bird-Dogs': '2 sets each side',
        'Glute Bridges': '2–3 sets of 12–15',
        'Box Breathing': '4–5 min',
      },
    }
  }

  if (workout.focus === 'Anti-Office / Structural Integrity') {
    return {
      isRecovery: true,
      introTitle: 'Dynamic Mobility & Decompression',
      introText:
        'Start with the opening mobility block below before moving into structural integrity work.',
      introItems: [
        { name: '90/90 Hip Switches', detail: '2 min' },
        { name: 'Couch Stretch', detail: '2 min each side' },
        { name: 'Child’s Pose with Side Reach', detail: '2 min total' },
        { name: 'Dead Hangs', detail: '2 sets of 20–30 sec' },
      ],
      introButtonLabel: 'Start Recovery Flow',
      finishLabel: 'Finish Recovery Flow',
      targetByExercise: {
        '90/90 Hip Switches': '2 min',
        'Couch Stretch': '2 min each side',
        'Child’s Pose with Side Reach': '2 min total',
        'Dead Hangs': '2 sets of 20–30 sec',
        'Face Pulls (Light)': '2–3 sets of 12–15',
        'Goblet Squat Hold': '2 sets of 20–30 sec',
        'Band Pull-Aparts': '2 sets of 15–20',
      },
    }
  }

  return {
    isRecovery: false,
    introTitle: 'Warmup',
    introText: '',
    introItems: [],
    introButtonLabel: 'Start Exercise 1',
    finishLabel: 'Cardio & Finish',
    targetByExercise: {},
  }
}

function entryHasAnyData(entry: WorkoutExerciseEntry) {
  // Weights are pre-filled, so only reps show that a set was actually done.
  const hasSetData = entry.sets.some((set) => set.reps.trim())
  return (
    hasSetData ||
    Boolean(entry.difficulty) ||
    Boolean(entry.effort) ||
    Boolean(entry.note.trim()) ||
    entry.discomfortLocation !== 'None' ||
    Boolean(entry.discomfortSeverity)
  )
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

  if (dayName === 'Sunday' && name.includes('hamstring curl')) {
    tags.push('posterior chain priority')
  }

  if (dayName === 'Sunday' && (name.includes('abductor machine') || name.includes('glute bridge'))) {
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

function getFormQualityHint(value: string) {
  switch (value) {
    case 'Clean':
      return 'Progression can move forward when reps and control are there.'
    case 'Slight Breakdown':
      return 'Own this load first. Next time should likely hold steady.'
    case 'Breakdown':
      return 'This crossed the form governor. Next time should likely reduce load.'
    default:
      return 'Rate the final set by movement quality, not effort alone.'
  }
}

const formQualityOptions = ['Clean', 'Slight Breakdown', 'Breakdown']
const effortOptions = ['Easy', 'Moderate', 'Hard', 'Very Hard']
const discomfortLocationOptions = ['None', 'Shoulder', 'Back', 'Knee', 'Elbow', 'Other']
const discomfortSeverityOptions = ['Mild', 'Moderate', 'Severe', 'Sharp / radiating / worsening']
const partialFinishReasons = ['Ran out of time', 'Low energy', 'Discomfort', 'Other']

export default function WorkoutLogPage() {
  const router = useRouter()
  const date = getLocalDateString()
  const todayDay = new Date().getDay()

  const [weeklySettings, setWeeklySettings] = useState<WeeklySettingsRow | null>(null)
  const [cardioPreference, setCardioPreference] = useState<string | null>(null)
  const [coachingOverrides, setCoachingOverrides] = useState<CoachingOverrides | null>(null)
  const [resolvedWorkoutDay, setResolvedWorkoutDay] = useState<number>(todayDay)

  const baseWorkout = useMemo(
    () => getWorkoutForDay(resolvedWorkoutDay),
    [resolvedWorkoutDay]
  )

  const [exerciseSettings, setExerciseSettings] = useState<ExerciseSettings>({})
  const [confirmClearance, setConfirmClearance] = useState('')

  const workout = useMemo(
    () =>
      applyExerciseSettings(
        getEffectiveWorkoutForLog({
          baseWorkout,
          weeklySettings,
          cardioPreference,
        }).workout,
        exerciseSettings
      ),
    [baseWorkout, weeklySettings, cardioPreference, exerciseSettings]
  )

  const recoveryConfig = useMemo(() => getRecoveryFlowConfig(workout), [workout])
  const isRecoveryMode = recoveryConfig.isRecovery

  const [startedAt, setStartedAt] = useState('')
  const [strengthEndedAt, setStrengthEndedAt] = useState('')
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [entries, setEntries] = useState<WorkoutExerciseEntry[]>(() =>
    buildInitialEntries(baseWorkout)
  )
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [completedCardio, setCompletedCardio] = useState(true)
  const [cardioMinutes, setCardioMinutes] = useState('')
  const [skippedIndices, setSkippedIndices] = useState<number[]>([])
  const [completedIndices, setCompletedIndices] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showSubstitutions, setShowSubstitutions] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [skipLock, setSkipLock] = useState(false)
  const [basketballStatus, setBasketballStatus] = useState('unsure')
  const [historyLogs, setHistoryLogs] = useState<ExerciseLogRow[]>([])
  const [painLogs, setPainLogs] = useState<ExerciseLogRow[]>([])
  const [usedSavedProgress, setUsedSavedProgress] = useState(false)

  const [showPartialFinish, setShowPartialFinish] = useState(false)
  const [partialReason, setPartialReason] = useState('')
  const [partialNote, setPartialNote] = useState('')

  const scrollAnchorRef = useRef<HTMLDivElement | null>(null)
  const prefilledRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      try {
        const weekStart = getWeekStartDate()
        const [weekly, prefs, overrides, settings] = await Promise.all([
          getWeeklySettings(weekStart),
          loadEquipmentPreferences(),
          loadCoachingOverrides(),
          loadExerciseSettings(),
        ])
        setExerciseSettings(settings)

        setWeeklySettings(weekly ?? null)
        setBasketballStatus(weekly?.basketball_status ?? 'unsure')
        setCardioPreference(prefs?.cardio_preference ?? null)
        setCoachingOverrides(overrides ?? null)

        const effectiveDay = getEffectiveWorkoutDayNumber(todayDay, weekly ?? null)
        setResolvedWorkoutDay(effectiveDay)

        const effectiveBaseWorkout = getWorkoutForDay(effectiveDay)
        const saved = loadWorkoutProgress(date, effectiveBaseWorkout.dayName)

        if (saved) {
          setStartedAt(saved.startedAt || new Date().toISOString())
          setStrengthEndedAt(saved.strengthEndedAt || '')
          setEntries(saved.entries)
          setCurrentIndex(typeof saved.currentIndex === 'number' ? saved.currentIndex : -1)
          setCompletedCardio(
            typeof saved.completedCardio === 'boolean' ? saved.completedCardio : true
          )
          setCardioMinutes(saved.cardioMinutes ?? '')
          setSkippedIndices(saved.skippedIndices)
          setCompletedIndices(saved.completedIndices)
          setUsedSavedProgress(true)
        } else {
          // Build from the workout actually shown, which on Friday depends on the
          // recovery check.
          const shown = applyExerciseSettings(
            getEffectiveWorkoutForLog({
              baseWorkout: effectiveBaseWorkout,
              weeklySettings: weekly ?? null,
              cardioPreference: prefs?.cardio_preference ?? null,
            }).workout,
            settings
          )
          setStartedAt(new Date().toISOString())
          setEntries(
            buildInitialEntries(shown, getRecoveryFlowConfig(shown).isRecovery ? 1 : undefined)
          )
          setCurrentIndex(-1)
          // Optional cardio only counts if you say you did it.
          setCompletedCardio(!/optional|none planned/i.test(shown.cardio))
          setCardioMinutes('')
          setSkippedIndices([])
          setCompletedIndices([])
          setUsedSavedProgress(false)
        }
      } catch (loadError) {
        console.error('Workout log weekly settings load error', loadError)
        setBasketballStatus('unsure')
        setCardioPreference(null)
      } finally {
        setIsLoaded(true)
      }
    }

    load()
  }, [date, todayDay])

  useEffect(() => {
    if (!isLoaded) return
    if (usedSavedProgress) return
    if (currentIndex !== -1) return
    if (completedIndices.length) return
    if (skippedIndices.length) return

    const currentNames = entries.map((entry) => entry.name).join('|')
    const expectedNames = workout.exercises.join('|')

    if (currentNames !== expectedNames) {
      setEntries(buildInitialEntries(workout, isRecoveryMode ? 1 : undefined))
    }
  }, [
    isLoaded,
    usedSavedProgress,
    currentIndex,
    completedIndices,
    skippedIndices,
    entries,
    workout.exercises,
    isRecoveryMode,
  ])

  useEffect(() => {
    if (!startedAt) return
    if (strengthEndedAt) return

    setNowMs(Date.now())

    const interval = window.setInterval(() => {
      setNowMs(Date.now())
    }, 15000)

    return () => window.clearInterval(interval)
  }, [startedAt, strengthEndedAt])

  const historyAliasPool = useMemo(() => {
    if (isRecoveryMode) return []

    const names = new Set<string>()

    entries.forEach((entry) => {
      getExerciseHistoryAliases(entry.name).forEach((name) => names.add(name))
      getExerciseSubstitutions(entry.name).forEach((sub) => {
        getExerciseHistoryAliases(sub).forEach((name) => names.add(name))
      })
    })

    return [...names]
  }, [entries, isRecoveryMode])

  useEffect(() => {
    async function loadHistory() {
      if (!historyAliasPool.length) {
        setHistoryLogs([])
        setPainLogs([])
        return
      }

      const [logs, pain] = await Promise.all([
        loadExerciseLogHistoryFromSupabase(historyAliasPool),
        loadPainLogsFromSupabase(historyAliasPool),
      ])
      setHistoryLogs(logs)
      setPainLogs(pain)
    }

    loadHistory()
  }, [historyAliasPool.join('|')])

  useEffect(() => {
    if (!isLoaded || !startedAt) return

    const progress: WorkoutProgressState = {
      date,
      dayName: workout.dayName,
      startedAt,
      strengthEndedAt,
      currentIndex,
      completedCardio,
      cardioMinutes,
      skippedIndices,
      completedIndices,
      entries,
    }

    saveWorkoutProgress(progress)
  }, [
    isLoaded,
    startedAt,
    strengthEndedAt,
    date,
    workout.dayName,
    currentIndex,
    completedCardio,
    cardioMinutes,
    skippedIndices,
    completedIndices,
    entries,
  ])

  useEffect(() => {
    if (!isLoaded) return

    const id = window.setTimeout(() => {
      scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 40)

    return () => window.clearTimeout(id)
  }, [currentIndex, isLoaded, showSubstitutions, showPartialFinish])

  const currentEntry = currentIndex >= 0 ? entries[currentIndex] : null
  const currentTarget =
    currentEntry && !isRecoveryMode ? getTargetForExercise(currentEntry.name, workout) : null

  const nextPendingIndex = useMemo(() => {
    return getNextPendingIndex(currentIndex, entries.length, completedIndices)
  }, [currentIndex, entries.length, completedIndices])

  const incompleteIndices = entries
    .map((_, index) => index)
    .filter((index) => !completedIndices.includes(index))

  const isCurrentLastIncomplete =
    currentIndex >= 0 &&
    incompleteIndices.length === 1 &&
    incompleteIndices[0] === currentIndex

  const nextLabel =
    isCurrentLastIncomplete
      ? isRecoveryMode
        ? recoveryConfig.finishLabel
        : 'Cardio / Finish'
      : nextPendingIndex >= 0 && entries[nextPendingIndex]
        ? entries[nextPendingIndex].name
        : isRecoveryMode
          ? recoveryConfig.finishLabel
          : 'Cardio / Finish'

  const allExercisesCompleted = completedIndices.length === entries.length
  const isWarmupStep = currentIndex === -1

  useEffect(() => {
    if (!allExercisesCompleted) return
    if (strengthEndedAt) return

    setStrengthEndedAt(new Date().toISOString())
  }, [allExercisesCompleted, strengthEndedAt])

  const strengthElapsedMinutes = useMemo(() => {
    if (!startedAt) return 1

    const start = new Date(startedAt).getTime()
    const end = strengthEndedAt ? new Date(strengthEndedAt).getTime() : nowMs

    return Math.max(1, Math.round((end - start) / 60000))
  }, [startedAt, strengthEndedAt, nowMs])

  const resolvedCardioText = useMemo(() => {
    return applyCardioPreference(workout.cardio, cardioPreference)
  }, [workout.cardio, cardioPreference])

  const plannedCardioMinutes = useMemo(() => {
    return parseFirstNumber(resolvedCardioText)
  }, [resolvedCardioText])

  const targetSessionMinutes = useMemo(() => {
    return parseFirstNumber(workout.estimatedMinutes)
  }, [workout.estimatedMinutes])

  const coachingCardioAdd = useMemo(
    () => coachingOverrides?.cardio_add_minutes?.[workout.dayName] ?? 0,
    [coachingOverrides, workout.dayName]
  )

  const suggestedCardioMinutes = useMemo(() => {
    const base = getSuggestedCardioMinutes(
      plannedCardioMinutes,
      targetSessionMinutes,
      strengthElapsedMinutes
    )
    return base + coachingCardioAdd
  }, [plannedCardioMinutes, targetSessionMinutes, strengthElapsedMinutes])

  useEffect(() => {
    if (!isLoaded) return
    if (!allExercisesCompleted) return
    if (!completedCardio) return
    if (cardioMinutes) return

    const defaultMinutes = suggestedCardioMinutes || plannedCardioMinutes || 0
    if (defaultMinutes > 0) {
      setCardioMinutes(String(defaultMinutes))
    }
  }, [
    isLoaded,
    allExercisesCompleted,
    completedCardio,
    cardioMinutes,
    suggestedCardioMinutes,
    plannedCardioMinutes,
  ])

  const actualCardioMinutesNumber =
    completedCardio && cardioMinutes ? Number(cardioMinutes) : 0

  const totalProjectedMinutes = strengthElapsedMinutes + actualCardioMinutesNumber

  const substitutionOptions =
    currentEntry && !isRecoveryMode
      ? getExerciseSubstitutions(currentEntry.name).filter(
          (option) =>
            // One entry per exercise, or two sets of logs would merge in history.
            !entries.some((entry) => entry.name === option) && !exerciseSettings[option]?.disabled
        )
      : []

  const exerciseSuggestion = useMemo(() => {
    if (isRecoveryMode || !currentEntry || !currentTarget) return null

    const aliases = getExerciseHistoryAliases(currentEntry.name)
    const latest = getLatestPerformance(historyLogs, aliases)

    const pain = getPainState(
      historyLogs,
      painLogs,
      aliases,
      exerciseSettings[currentEntry.name]?.painReviewedAt
    )

    if (!latest && !pain.reviewRequired && !pain.discomfort) return null

    const suggestion = getMachineAwareSuggestion({
      exerciseName: currentEntry.name,
      targetRepRange: currentTarget.reps,
      setCount: currentEntry.sets.length,
      lastSets: latest?.sets ?? [],
      lastDifficulty: latest?.lastDifficulty ?? null,
      lastEffort: latest?.lastEffort ?? null,
      lastPain: parsePainSeverity(pain.discomfort),
      reviewRequired: pain.reviewRequired,
      painReviewed: pain.cleared,
      baselineWeek: date <= BASELINE_WEEK_END,
    })
    if (!suggestion) return null

    return { suggestion, latest }
  }, [currentEntry, currentTarget, historyLogs, painLogs, exerciseSettings, isRecoveryMode, date])

  const suggestion = exerciseSuggestion?.suggestion ?? null
  const latestPerf = exerciseSuggestion?.latest ?? null

  useEffect(() => {
    if (currentIndex < 0 || isRecoveryMode) return
    const prefillKey = `${currentIndex}:${entries[currentIndex]?.name}`
    if (prefilledRef.current.has(prefillKey)) return
    if (!suggestion?.setWeights?.length) return

    setEntries((prev) => {
      const entry = prev[currentIndex]
      if (!entry) return prev

      const alreadyHasWeights = entry.sets.some((s) => s.weight.trim() !== '')
      if (alreadyHasWeights) {
        prefilledRef.current.add(prefillKey)
        return prev
      }

      prefilledRef.current.add(prefillKey)

      return prev.map((e, i) => {
        if (i !== currentIndex) return e
        return {
          ...e,
          sets: e.sets.map((set, setIndex) => ({
            ...set,
            weight:
              suggestion.setWeights[setIndex] != null
                ? String(suggestion.setWeights[setIndex])
                : set.weight,
          })),
        }
      })
    })
  }, [currentIndex, suggestion, isRecoveryMode])

  const recoveryTarget =
    currentEntry && isRecoveryMode ? recoveryConfig.targetByExercise[currentEntry.name] ?? '' : ''

  const coachingTags = useMemo(() => {
    if (!currentEntry) return []
    return getExerciseCoachingTags(workout.dayName, currentEntry.name)
  }, [currentEntry, workout.dayName])

  function updateSetValue(setIndex: number, field: 'weight' | 'reps', value: string) {
    if (currentIndex < 0) return

    setEntries((prev) =>
      prev.map((entry, index) =>
        index === currentIndex
          ? {
              ...entry,
              sets: entry.sets.map((set, i) =>
                i === setIndex ? { ...set, [field]: value } : set
              ),
            }
          : entry
      )
    )
  }

  function updateCurrentField(
    field: 'difficulty' | 'effort' | 'discomfortLocation' | 'discomfortSeverity' | 'note',
    value: string
  ) {
    if (currentIndex < 0) return

    setEntries((prev) =>
      prev.map((entry, index) =>
        index === currentIndex ? { ...entry, [field]: value } : entry
      )
    )
  }

  function handleStartExercises() {
    setCurrentIndex(0)
    setShowSubstitutions(false)
  }

  function handleSkip() {
    if (currentIndex < 0 || skipLock) return

    setSkipLock(true)

    setSkippedIndices((prev) =>
      prev.includes(currentIndex) ? prev : [...prev, currentIndex]
    )

    const nextIndex = getNextPendingIndex(currentIndex, entries.length, completedIndices)

    if (nextIndex >= 0 && nextIndex !== currentIndex) {
      setCurrentIndex(nextIndex)
    }

    setShowSubstitutions(false)

    window.setTimeout(() => {
      setSkipLock(false)
    }, 300)
  }

  function handleSubstitute(newExerciseName: string) {
    if (currentIndex < 0 || isRecoveryMode) return

    const current = entries[currentIndex]
    const replacement: WorkoutExerciseEntry = {
      ...buildInitialEntries({ ...workout, exercises: [newExerciseName] })[0],
      substitutedFrom: current.substitutedFrom ?? current.name,
    }
    // Reps, ratings and pain belong to the exercise they were logged on.
    const hasWork =
      current.sets.some((set) => set.reps.trim()) ||
      Boolean(current.difficulty || current.effort || current.note.trim()) ||
      current.discomfortLocation !== 'None'

    if (hasWork) {
      const shift = (indices: number[]) =>
        indices.map((index) => (index > currentIndex ? index + 1 : index))

      setEntries([
        ...entries.slice(0, currentIndex + 1),
        replacement,
        ...entries.slice(currentIndex + 1),
      ])
      setCompletedIndices([
        ...shift(completedIndices).filter((index) => index !== currentIndex),
        currentIndex,
      ])
      setSkippedIndices(shift(skippedIndices).filter((index) => index !== currentIndex))
      setCurrentIndex(currentIndex + 1)
    } else {
      setEntries(entries.map((entry, index) => (index === currentIndex ? replacement : entry)))
    }

    prefilledRef.current.clear()
    setShowSubstitutions(false)
  }

  async function handleMarkPainReviewed(exerciseName: string) {
    const next = {
      ...exerciseSettings,
      [exerciseName]: {
        ...exerciseSettings[exerciseName],
        painReviewedAt: new Date().toISOString(),
      },
    }
    try {
      setError('')
      await saveExerciseSettings(next)
      setExerciseSettings(next)
      setConfirmClearance('')
    } catch (err) {
      console.error(err)
      setError('Could not save the review. Please try again.')
    }
  }

  function handleNext() {
    if (currentIndex < 0) return

    const updatedCompleted = completedIndices.includes(currentIndex)
      ? completedIndices
      : [...completedIndices, currentIndex]

    setCompletedIndices(updatedCompleted)
    setSkippedIndices((prev) => prev.filter((idx) => idx !== currentIndex))

    const nextIndex = getNextPendingIndex(currentIndex, entries.length, updatedCompleted)

    if (nextIndex >= 0) {
      setCurrentIndex(nextIndex)
      setShowSubstitutions(false)
      return
    }

    setShowSubstitutions(false)
  }

  function buildExerciseLogs(savePartial: boolean) {
    if (isRecoveryMode) {
      const indicesToSave = savePartial
        ? entries
            .map((entry, index) =>
              completedIndices.includes(index) || entryHasAnyData(entry) ? index : -1
            )
            .filter((index) => index >= 0)
        : entries.map((_, index) => index)

      return indicesToSave.map((exerciseIndex) => {
        const entry = entries[exerciseIndex]
        return {
          exercise_name: entry.name,
          exercise_index: exerciseIndex,
          set_number: 1,
          weight: null,
          reps: null,
          difficulty: null,
          discomfort:
            entry.discomfortLocation === 'None'
              ? null
              : `${entry.discomfortLocation}${
                  entry.discomfortSeverity ? ` - ${entry.discomfortSeverity}` : ''
                }`,
          notes: `Target: ${
            recoveryConfig.targetByExercise[entry.name] ?? 'completed'
          }${entry.note ? ` • ${entry.note}` : ''}`,
        }
      })
    }

    const indicesToSave = savePartial
      ? entries
          .map((entry, index) =>
            completedIndices.includes(index) || entryHasAnyData(entry) ? index : -1
          )
          .filter((index) => index >= 0)
      : entries.map((_, index) => index)

    return indicesToSave.flatMap((exerciseIndex) => {
      const entry = entries[exerciseIndex]
      return entry.sets.map((set, setIndex) => ({
        exercise_name: entry.name,
        exercise_index: exerciseIndex,
        set_number: setIndex + 1,
        weight: set.weight ? Number(set.weight) : null,
        reps: set.reps ? Number(set.reps) : null,
        difficulty: setIndex === entry.sets.length - 1 ? entry.difficulty || null : null,
        discomfort:
          setIndex === entry.sets.length - 1
            ? formatDiscomfort(
                entry,
                getPainState(historyLogs, painLogs, getExerciseHistoryAliases(entry.name))
                  .discomfort
              )
            : null,
        notes:
          setIndex === entry.sets.length - 1
            ? entry.substitutedFrom
              ? `Substituted from ${entry.substitutedFrom}${entry.note ? ` • ${entry.note}` : ''}`
              : entry.note || null
            : null,
      }))
    })
  }

  function buildEffortByExercise() {
    return Object.fromEntries(
      entries.filter((entry) => entry.effort).map((entry) => [entry.name, entry.effort])
    )
  }

  async function handleFinishWorkout() {
    try {
      setSaving(true)
      setError('')

      const safeCardioMinutes = completedCardio ? Number(cardioMinutes || 0) : 0
      const totalActualMinutes = strengthElapsedMinutes + safeCardioMinutes

      await saveWorkoutAndLogsToSupabase({
        date,
        day_name: workout.dayName,
        focus: workout.focus,
        status: 'completed',
        outcome_note: null,
        estimated_minutes: parseInt(workout.estimatedMinutes, 10) || null,
        actual_minutes: totalActualMinutes,
        strength_minutes: strengthElapsedMinutes,
        cardio_minutes: safeCardioMinutes,
        warmup_text: workout.warmup,
        cardio_text: resolvedCardioText,
        completed_cardio: completedCardio,
        exercise_order: entries.map((entry) => entry.name),
        exercise_logs: buildExerciseLogs(false),
        workout_extra: { effort_by_exercise: buildEffortByExercise() },
      })

      clearWorkoutProgress(date, workout.dayName)
      router.push('/workout')
    } catch (err) {
      console.error(err)
      setError('Could not save workout. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleFinishPartialWorkout() {
    try {
      setSaving(true)
      setError('')

      const safeCardioMinutes = completedCardio ? Number(cardioMinutes || 0) : 0
      const totalActualMinutes = strengthElapsedMinutes + safeCardioMinutes

      const combinedNote = partialReason
        ? partialNote.trim()
          ? `${partialReason} • ${partialNote.trim()}`
          : partialReason
        : partialNote.trim() || null

      await saveWorkoutAndLogsToSupabase({
        date,
        day_name: workout.dayName,
        focus: workout.focus,
        status: 'completed_partial',
        outcome_note: combinedNote,
        estimated_minutes: parseInt(workout.estimatedMinutes, 10) || null,
        actual_minutes: totalActualMinutes,
        strength_minutes: strengthElapsedMinutes,
        cardio_minutes: safeCardioMinutes,
        warmup_text: workout.warmup,
        cardio_text: resolvedCardioText,
        // Ending early with no minutes entered means the cardio didn't happen.
        completed_cardio: completedCardio && safeCardioMinutes > 0,
        exercise_order: entries.map((entry) => entry.name),
        exercise_logs: buildExerciseLogs(true),
        workout_extra: { effort_by_exercise: buildEffortByExercise() },
      })

      clearWorkoutProgress(date, workout.dayName)
      router.push('/workout')
    } catch (err) {
      console.error(err)
      setError('Could not save workout. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 pb-6">
      <div ref={scrollAnchorRef} />

      <div>
        <div className="label">Workout Log</div>
        <h1 className="text-xl font-semibold tracking-tight">
          {workout.dayName}: {workout.focus}
        </h1>
        <p className="mt-1 text-sm text-slate-300">{workout.estimatedMinutes}</p>
      </div>

      <section className="card space-y-3">
        <div className="label">Progress</div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isWarmupStep ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-200'
            }`}
          >
            {isRecoveryMode ? 'Intro' : 'Warmup'}
          </div>

          {entries.map((entry, index) => {
            const isCurrent = currentIndex === index
            const isCompleted = completedIndices.includes(index)
            const isSkipped = skippedIndices.includes(index) && !isCompleted

            return (
              <div key={`${entry.name}-${index}`} className="relative">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                    isCompleted
                      ? 'bg-emerald-500 text-slate-950'
                      : isCurrent
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>

                {isSkipped ? (
                  <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-slate-950">
                    ↺
                  </div>
                ) : null}
              </div>
            )
          })}

          <div
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              allExercisesCompleted ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-200'
            }`}
          >
            {isRecoveryMode ? 'Finish' : 'Cardio'}
          </div>
        </div>

        {!isWarmupStep && !allExercisesCompleted && currentEntry ? (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">{currentEntry.name}</h2>
              <div className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                {isRecoveryMode
                  ? recoveryTarget || 'Complete'
                  : currentTarget
                    ? `${currentTarget.sets} × ${currentTarget.reps}`
                    : 'Complete'}
              </div>
            </div>

            {currentEntry.substitutedFrom ? (
              <p className="text-xs text-amber-300">
                Substituted from {currentEntry.substitutedFrom}
              </p>
            ) : null}

            {date <= BASELINE_WEEK_END && !isRecoveryMode ? (
              <p className="text-xs text-sky-300">
                Baseline week: pick comfortable weights. Log working sets only, not warm-ups.
              </p>
            ) : null}

            {suggestion?.blocked ? (
              <div className="space-y-2 rounded-xl border border-rose-500/40 bg-rose-950/30 p-3">
                <p className="text-sm text-rose-200">{suggestion.note}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSubstitutions(true)}
                    className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-900"
                  >
                    Substitute
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearance(currentEntry.name)}
                    className="rounded-full bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100"
                  >
                    Cleared by PT / provider…
                  </button>
                </div>
                {confirmClearance === currentEntry.name ? (
                  <div className="space-y-2 rounded-xl border border-slate-600 bg-slate-900 p-3">
                    <p className="text-sm text-slate-100">
                      Confirm that your PT or healthcare provider has reviewed{' '}
                      {currentEntry.name} and cleared you to do it.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleMarkPainReviewed(currentEntry.name)}
                        className="rounded-full bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950"
                      >
                        Yes, reviewed and cleared
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClearance('')}
                        className="rounded-full bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
                {error ? <p className="text-xs text-rose-300">{error}</p> : null}
              </div>
            ) : null}

            {!latestPerf && suggestion && !suggestion.blocked ? (
              <p className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-sm text-amber-200">
                {suggestion.note}
              </p>
            ) : null}

            {latestPerf && suggestion && !suggestion.blocked ? (
              <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-3 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-slate-500 uppercase tracking-wide">Last session</span>
                  <span className="text-xs font-semibold text-slate-200">
                    {latestPerf.topWeight} lbs × {latestPerf.topReps} reps
                  </span>
                  {latestPerf.lastDifficulty ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        latestPerf.lastDifficulty === 'Breakdown' || latestPerf.lastDifficulty === 'Too Hard'
                          ? 'bg-rose-500/20 text-rose-300'
                          : latestPerf.lastDifficulty === 'Slight Breakdown' || latestPerf.lastDifficulty === 'Hard'
                            ? 'bg-amber-400/20 text-amber-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {latestPerf.lastDifficulty}
                    </span>
                  ) : null}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{suggestion.note}</p>
              </div>
            ) : null}

            {coachingTags.length ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {coachingTags.map((tag) => (
                  <div
                    key={`${currentEntry.name}-${tag}`}
                    className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold text-emerald-300"
                  >
                    {tag}
                  </div>
                ))}
              </div>
            ) : null}

            <p className="text-xs text-slate-400">Next: {nextLabel}</p>
          </div>
        ) : isWarmupStep ? (
          <div className="pt-1 text-xs text-slate-400">
            {isRecoveryMode
              ? 'Use the intro card below to start the flow.'
              : 'Warmup is included in tracked time.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3">
              <div className="label">Strength elapsed</div>
              <div className="mt-1 text-base font-semibold text-white">
                {strengthElapsedMinutes} min
              </div>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3">
              <div className="label">{isRecoveryMode ? 'Optional walk' : 'Planned cardio'}</div>
              <div className="mt-1 text-base font-semibold text-white">
                {plannedCardioMinutes || 0} min
              </div>
            </div>
          </div>
        )}
      </section>

      {isWarmupStep ? (
        <section className="card space-y-4">
          <div className="label">{recoveryConfig.introTitle}</div>

          <h2 className="text-lg font-semibold text-white">{workout.warmup}</h2>

          {isRecoveryMode ? (
            <>
              <p className="text-sm text-slate-400">{recoveryConfig.introText}</p>

              <div className="space-y-3">
                {recoveryConfig.introItems.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-white">{item.name}</div>
                      <div className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                        {item.detail}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400">
              Complete your warmup, then begin Exercise 1.
            </p>
          )}

          <button
            type="button"
            onClick={handleStartExercises}
            className="block w-full rounded-[1.5rem] bg-emerald-500 px-5 py-4 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-emerald-400"
          >
            {recoveryConfig.introButtonLabel}
          </button>
        </section>
      ) : !allExercisesCompleted && currentEntry ? (
        <section className="card space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-slate-300">
              Exercise {currentIndex + 1} of {entries.length}
            </div>

            {!isRecoveryMode ? (
              <button
                type="button"
                onClick={() => setShowSubstitutions((prev) => !prev)}
                className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700"
              >
                Substitute
              </button>
            ) : null}
          </div>

          {!isRecoveryMode && showSubstitutions ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3">
              <div className="label">Substitute Exercise</div>
              <div className="mt-2 space-y-2">
                {substitutionOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSubstitute(option)}
                    className="block w-full rounded-xl bg-slate-800 px-3 py-2 text-left text-sm font-semibold text-slate-100 hover:bg-slate-700"
                  >
                    {option}
                    {PT_CLEARANCE_EXERCISES.includes(option) ? (
                      <span className="ml-2 text-xs font-normal text-amber-300">
                        only if PT-cleared
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {isRecoveryMode ? (
            <>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
                <div className="label">Target</div>
                <div className="mt-2 text-base font-semibold text-white">{recoveryTarget}</div>
              </div>

              <div className="space-y-2">
                <div className="label">Discomfort Location</div>
                <div className="flex flex-wrap gap-2">
                  {discomfortLocationOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        updateCurrentField('discomfortLocation', option)
                        if (option === 'None') {
                          updateCurrentField('discomfortSeverity', '')
                        }
                      }}
                      className={`rounded-full px-3 py-2 text-xs font-semibold ${
                        currentEntry.discomfortLocation === option
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-200'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {currentEntry.discomfortLocation !== 'None' ? (
                <div className="space-y-2">
                  <div className="label">Discomfort Severity</div>
                  <div className="flex flex-wrap gap-2">
                    {discomfortSeverityOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => updateCurrentField('discomfortSeverity', option)}
                        className={`rounded-full px-3 py-2 text-xs font-semibold ${
                          currentEntry.discomfortSeverity === option
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-200'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <div className="label mb-2">Notes (optional)</div>
                <textarea
                  value={currentEntry.note}
                  onChange={(e) => updateCurrentField('note', e.target.value)}
                  className="min-h-[84px] w-full rounded-2xl border border-slate-700 bg-slate-900/40 px-3 py-3 text-white outline-none"
                  placeholder="Optional notes"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                {currentEntry.sets.map((set, setIndex) => (
                  <div
                    key={setIndex}
                    className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3"
                  >
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Working set {setIndex + 1}
                    </div>

                    <div className={`grid gap-2 ${currentTarget?.bodyweight ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {currentTarget?.bodyweight ? null : (
                      <input
                        value={set.weight}
                        onChange={(e) => updateSetValue(setIndex, 'weight', e.target.value)}
                        inputMode="decimal"
                        className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-white outline-none"
                        placeholder={
                          suggestion?.setWeights?.[setIndex] != null
                            ? String(suggestion.setWeights[setIndex])
                            : 'Weight'
                        }
                      />
                      )}

                      <input
                        value={set.reps}
                        onChange={(e) => updateSetValue(setIndex, 'reps', e.target.value)}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-white outline-none"
                        placeholder={currentTarget?.reps ?? 'Reps'}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="label">Muscular Effort</div>
                <div className="flex flex-wrap gap-2">
                  {effortOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateCurrentField('effort', option)}
                      className={`rounded-full px-3 py-2 text-xs font-semibold ${
                        currentEntry.effort === option
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-200'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="label">Final Set Form Quality</div>
                <div className="flex flex-wrap gap-2">
                  {formQualityOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateCurrentField('difficulty', option)}
                      className={`rounded-full px-3 py-2 text-xs font-semibold ${
                        currentEntry.difficulty === option
                          ? option === 'Breakdown'
                            ? 'bg-rose-500 text-white'
                            : option === 'Slight Breakdown'
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-200'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400">
                  {getFormQualityHint(currentEntry.difficulty)}
                </p>
              </div>

              <div className="space-y-2">
                <div className="label">Discomfort Location</div>
                <div className="flex flex-wrap gap-2">
                  {discomfortLocationOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        updateCurrentField('discomfortLocation', option)
                        if (option === 'None') {
                          updateCurrentField('discomfortSeverity', '')
                        }
                      }}
                      className={`rounded-full px-3 py-2 text-xs font-semibold ${
                        currentEntry.discomfortLocation === option
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-200'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {currentEntry.discomfortLocation !== 'None' ? (
                <div className="space-y-2">
                  <div className="label">Discomfort Severity</div>
                  <div className="flex flex-wrap gap-2">
                    {discomfortSeverityOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => updateCurrentField('discomfortSeverity', option)}
                        className={`rounded-full px-3 py-2 text-xs font-semibold ${
                          currentEntry.discomfortSeverity === option
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-200'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {currentEntry.discomfortSeverity &&
              currentEntry.discomfortSeverity !== 'Mild' ? (
                <p className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-sm text-rose-200">
                  {currentEntry.discomfortSeverity === 'Moderate'
                    ? 'Stop or substitute this exercise.'
                    : 'Stop this exercise. Get severe, sharp, radiating or worsening pain reviewed before loading it again.'}
                </p>
              ) : null}

              <div>
                <div className="label mb-2">Notes (optional)</div>
                <textarea
                  value={currentEntry.note}
                  onChange={(e) => updateCurrentField('note', e.target.value)}
                  className="min-h-[84px] w-full rounded-2xl border border-slate-700 bg-slate-900/40 px-3 py-3 text-white outline-none"
                  placeholder="Optional notes"
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleSkip}
              disabled={skipLock}
              className="rounded-[1.5rem] bg-white px-4 py-4 text-center text-[0.95rem] font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-60"
            >
              Skip for now
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="rounded-[1.5rem] bg-emerald-500 px-4 py-4 text-center text-[0.95rem] font-semibold text-slate-900 transition hover:bg-emerald-400"
            >
              {isRecoveryMode ? 'Mark Complete' : 'Next Exercise'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowPartialFinish((prev) => !prev)}
            className="w-full rounded-[1.5rem] border border-slate-700 bg-slate-900/40 px-4 py-4 text-center text-[0.95rem] font-semibold text-slate-100 transition hover:bg-slate-800/60"
          >
            Finish Session Early
          </button>

          {showPartialFinish ? (
            <div className="space-y-4 rounded-[1.5rem] border border-slate-700 bg-slate-900/40 p-4">
              <div className="label">Finish Partial Session</div>

              <div className="space-y-2">
                <div className="label">Why are you ending early?</div>
                <div className="flex flex-wrap gap-2">
                  {partialFinishReasons.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setPartialReason(reason)}
                      className={`rounded-full px-3 py-2 text-xs font-semibold ${
                        partialReason === reason
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-200'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="label mb-2">Optional note</div>
                <textarea
                  value={partialNote}
                  onChange={(e) => setPartialNote(e.target.value)}
                  className="min-h-[84px] w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none"
                  placeholder="Anything useful to remember about ending early?"
                />
              </div>

              {error ? <p className="text-sm text-red-400">{error}</p> : null}

              <button
                type="button"
                onClick={handleFinishPartialWorkout}
                disabled={saving}
                className="w-full rounded-[1.5rem] bg-white px-5 py-4 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Partial Workout'}
              </button>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="card space-y-4">
          <div className="label">{isRecoveryMode ? recoveryConfig.finishLabel : 'Cardio & Finish'}</div>

          {!isRecoveryMode ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-3">
              <div className="label">Machine</div>
              <div className="mt-1 text-sm font-semibold text-white">{resolvedCardioText}</div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
              <div className="label">Strength elapsed</div>
              <div className="mt-2 text-[1.4rem] font-semibold text-white">
                {strengthElapsedMinutes} min
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
              <div className="label">{isRecoveryMode ? 'Optional walk' : 'Suggested cardio'}</div>
              <div className="mt-2 text-[1.4rem] font-semibold text-white">
                {suggestedCardioMinutes} min
              </div>
              {coachingCardioAdd > 0 ? (
                <div className="mt-1 text-xs font-semibold text-emerald-400">
                  incl. +{coachingCardioAdd} min coaching plan
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="label">{isRecoveryMode ? 'Optional Walk Status' : 'Cardio Status'}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setCompletedCardio(true)
                  if (!cardioMinutes && suggestedCardioMinutes) {
                    setCardioMinutes(String(suggestedCardioMinutes))
                  }
                }}
                className={`rounded-full px-3 py-2 text-xs font-semibold ${
                  completedCardio
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-200'
                }`}
              >
                {isRecoveryMode ? 'Walk completed' : 'Completed'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCompletedCardio(false)
                  setCardioMinutes('0')
                }}
                className={`rounded-full px-3 py-2 text-xs font-semibold ${
                  !completedCardio
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-200'
                }`}
              >
                {isRecoveryMode ? 'Skipped walk' : 'Skipped'}
              </button>
            </div>

            {completedCardio ? (
              <div className="mt-4">
                <div className="label mb-2">
                  {isRecoveryMode ? 'Actual Walk Minutes' : 'Actual Cardio Minutes'}
                </div>
                <input
                  value={cardioMinutes}
                  onChange={(e) => setCardioMinutes(e.target.value)}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-white outline-none"
                  placeholder={String(suggestedCardioMinutes || plannedCardioMinutes || 0)}
                />
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="label">Projected Total Duration</div>
            <div className="mt-2 text-[1.4rem] font-semibold text-white">
              {totalProjectedMinutes} min
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Strength and cardio are tracked separately so future workout-length logic can stay accurate.
            </p>
          </div>

          {error ? <p className="text-red-400">{error}</p> : null}

          <button
            type="button"
            onClick={handleFinishWorkout}
            disabled={saving}
            className="block w-full rounded-[1.5rem] bg-emerald-500 px-5 py-4 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {saving ? 'Saving…' : isRecoveryMode ? 'Finish Recovery Flow' : 'Finish Workout'}
          </button>
        </section>
      )}
    </div>
  )
}