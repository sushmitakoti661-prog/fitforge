import { useCallback, useEffect, useMemo, useState } from 'react'
import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import useAuth from '../hooks/useAuth'
import { generateRoadmap } from '../utils/apiService'

const MODE_OPTIONS = [
  {
    id: 'skill',
    title: 'Specific Skill Goal',
    subtitle: 'Learn a skill like handstand, first pullup, run 5K',
    emoji: '🎯',
  },
  {
    id: 'weekly',
    title: 'Weekly Workout Plan',
    subtitle: 'Structured week of training for your schedule',
    emoji: '📅',
  },
]

const levelOptions = ['Complete Beginner', 'Some Experience', 'Intermediate']
const timelineOptions = ['1 month', '3 months', '6 months', '1 year']
const trainingDays = [2, 3, 4, 5, 6]
const equipmentOptions = ['Gym', 'Home with dumbbells', 'Bodyweight only', 'Mix']
const fitnessLevels = ['Beginner', 'Intermediate', 'Advanced']
const focusOptions = ['Strength', 'Cardio', 'Both']
const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const formatTimestamp = (value) => {
  if (!value) return ''
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

const parseSkillRoadmap = (text) => {
  if (!text) return []
  const blocks = text
    .split(/\n(?=MONTH\s+\d)/i)
    .map((block) => block.trim())
    .filter(Boolean)

  if (!blocks.length) return [{ title: 'Roadmap', body: text.trim() }]

  return blocks.map((block) => {
    const firstLineEnd = block.indexOf('\n')
    const title = firstLineEnd > 0 ? block.slice(0, firstLineEnd).trim() : block
    const body = firstLineEnd > 0 ? block.slice(firstLineEnd + 1).trim() : ''
    return { title, body }
  })
}

const parseWeeklyRoadmap = (text) => {
  if (!text) return []
  const headings = text.match(/^(Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)(.*)$/gim)
  if (!headings) return [{ title: 'Weekly Roadmap', body: text.trim() }]

  const sections = []
  let current = { title: '', body: '' }
  text.split('\n').forEach((line) => {
    const headerMatch = line.match(/^(Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)(.*)$/i)
    if (headerMatch) {
      if (current.title) sections.push(current)
      current = { title: line.trim(), body: '' }
    } else if (current.title) {
      current.body += `${line}\n`
    }
  })
  if (current.title) sections.push({ title: current.title, body: current.body.trim() })
  return sections.length ? sections : [{ title: 'Weekly Roadmap', body: text.trim() }]
}

const GoalRoadmap = () => {
  const { currentUser } = useAuth()
  const userId = currentUser?.uid || null
  const [activeMode, setActiveMode] = useState('skill')
  const [roadmapText, setRoadmapText] = useState('')
  const [savedRoadmap, setSavedRoadmap] = useState(null)
  const [loadingSaved, setLoadingSaved] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [selectedRoadmapDetail, setSelectedRoadmapDetail] = useState(null)

  const [skillForm, setSkillForm] = useState({
    goal: 'Learn a handstand',
    currentLevel: 'Complete Beginner',
    timeline: '3 months',
    daysPerWeek: 3,
    injuries: '',
  })

  const [weeklyForm, setWeeklyForm] = useState({
    availableDays: ['Mon', 'Wed', 'Fri'],
    equipment: 'Gym',
    fitnessLevel: 'Intermediate',
    focus: 'Both',
    injuries: '',
  })

  const weeklyGoalLabel = useMemo(() => {
    const selectedDays = weeklyForm.availableDays.length ? weeklyForm.availableDays.join(', ') : 'your available days'
    return `Weekly workout plan for ${selectedDays}, ${weeklyForm.equipment.toLowerCase()}, focus on ${weeklyForm.focus.toLowerCase()}`
  }, [weeklyForm])

  const roadmapSections = useMemo(() => {
    if (!roadmapText) return []
    return activeMode === 'skill' ? parseSkillRoadmap(roadmapText) : parseWeeklyRoadmap(roadmapText)
  }, [activeMode, roadmapText])

  const validateForm = () => {
    if (activeMode === 'skill') {
      if (!skillForm.goal.trim()) return 'Please describe your skill goal.'
      if (!skillForm.currentLevel) return 'Choose your current skill level.'
      if (!skillForm.timeline) return 'Choose a timeline for your goal.'
      if (!trainingDays.includes(skillForm.daysPerWeek)) return 'Choose training days per week.'
    } else {
      if (!weeklyForm.availableDays.length) return 'Select at least one training day.'
      if (!weeklyForm.equipment) return 'Select your equipment access.'
      if (!weeklyForm.fitnessLevel) return 'Select your fitness level.'
      if (!weeklyForm.focus) return 'Select the training focus.'
    }
    return ''
  }

  const loadSavedRoadmap = useCallback(async () => {
    if (!userId) return
    setLoadingSaved(true)
    try {
      const roadmapRef = collection(db, `users/${userId}/roadmaps`)
      const roadmapQuery = query(roadmapRef, orderBy('generatedAt', 'desc'), limit(1))
      const snapshot = await getDocs(roadmapQuery)
      if (!snapshot.empty) {
        const doc = snapshot.docs[0]
        const data = doc.data()
        setSavedRoadmap({
          id: doc.id,
          ...data,
          generatedAt: formatTimestamp(data.generatedAt),
        })
      } else {
        setSavedRoadmap(null)
      }
    } catch (error) {
      console.error('Failed to load saved roadmap:', error)
      setSavedRoadmap(null)
    } finally {
      setLoadingSaved(false)
    }
  }, [userId])

  useEffect(() => {
    loadSavedRoadmap()
  }, [loadSavedRoadmap])

  const handleModeChange = (mode) => {
    setActiveMode(mode)
    setErrorMessage('')
    setSuccessMessage('')
    setRoadmapText('')
  }

  const handleSkillField = (field, value) => {
    setSkillForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleWeeklyField = (field, value) => {
    setWeeklyForm((prev) => ({ ...prev, [field]: value }))
  }

  const toggleWeeklyDay = (day) => {
    setWeeklyForm((prev) => {
      const nextDays = prev.availableDays.includes(day)
        ? prev.availableDays.filter((item) => item !== day)
        : [...prev.availableDays, day]
      return { ...prev, availableDays: nextDays }
    })
  }

  const handleGenerateRoadmap = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    const validationError = validateForm()
    if (validationError) {
      setErrorMessage(validationError)
      return
    }
    if (!userId) {
      setErrorMessage('Unable to generate roadmap without a logged-in user.')
      return
    }

    setGenerating(true)
    try {
      const payload = {
        mode: activeMode,
        goal: activeMode === 'skill' ? skillForm.goal.trim() : weeklyGoalLabel,
        currentLevel: skillForm.currentLevel,
        deadline: skillForm.timeline,
        daysPerWeek: skillForm.daysPerWeek,
        availableDays: weeklyForm.availableDays,
        equipment: weeklyForm.equipment,
        fitnessLevel: weeklyForm.fitnessLevel,
        focus: weeklyForm.focus,
        limitations: activeMode === 'skill' ? skillForm.injuries.trim() : weeklyForm.injuries.trim(),
      }
      const roadmap = await generateRoadmap(payload)
      setRoadmapText(roadmap || 'No roadmap returned yet.')
      setSuccessMessage('Roadmap generated. Review it below and save it to your profile.')
    } catch (error) {
      console.error('Roadmap generation failed:', error)
      setErrorMessage(error.message || 'Failed to generate roadmap. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveRoadmap = async () => {
    if (!userId || !roadmapText) return
    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const payload = {
        mode: activeMode,
        goal: activeMode === 'skill' ? skillForm.goal.trim() : weeklyGoalLabel,
        timeline: activeMode === 'skill' ? skillForm.timeline : null,
        daysPerWeek: activeMode === 'skill' ? skillForm.daysPerWeek : weeklyForm.availableDays.length,
        availableDays: activeMode === 'weekly' ? weeklyForm.availableDays : null,
        equipment: activeMode === 'weekly' ? weeklyForm.equipment : null,
        fitnessLevel: activeMode === 'weekly' ? weeklyForm.fitnessLevel : null,
        focus: activeMode === 'weekly' ? weeklyForm.focus : null,
        injuries: activeMode === 'skill' ? skillForm.injuries.trim() : weeklyForm.injuries.trim(),
        modeLabel: activeMode === 'skill' ? 'Skill Goal' : 'Weekly Plan',
        content: roadmapText,
        generatedAt: serverTimestamp(),
      }
      await addDoc(collection(db, `users/${userId}/roadmaps`), payload)
      setSuccessMessage('Roadmap saved to your profile.')
      await loadSavedRoadmap()
    } catch (error) {
      console.error('Save roadmap failed:', error)
      setErrorMessage('Unable to save roadmap right now.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">Goal Roadmap</p>
        <h1 className="mt-2 text-2xl font-bold">Forge your next training plan</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Generate a skill roadmap or a weekly workout plan with AI, then save it to your FitForge profile.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        {MODE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => handleModeChange(option.id)}
            className={`rounded-3xl border p-4 text-left transition ${
              activeMode === option.id
                ? 'border-primary bg-primary/10 text-white dark:border-primary dark:bg-[#1F1A13]'
                : 'border-[#E4E4E7] bg-white text-zinc-900 hover:border-primary/80 dark:border-dark-border dark:bg-dark-card dark:text-zinc-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFF0E6] text-lg dark:bg-white/10 dark:text-white">
                {option.emoji}
              </span>
              <div>
                <p className="text-sm font-semibold">{option.title}</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{option.subtitle}</p>
              </div>
            </div>
          </button>
        ))}
      </section>

      <section className="space-y-4 rounded-3xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">{activeMode === 'skill' ? 'Skill Goal Builder' : 'Weekly Plan Builder'}</p>
            <h2 className="mt-2 text-lg font-bold">Tell the AI what you want to build</h2>
          </div>
          <div className="rounded-2xl bg-[#FFF4EB] px-3 py-2 text-sm font-semibold text-[#B45309] dark:bg-[#4A3608] dark:text-[#FBBF24]">
            {activeMode === 'skill' ? 'Skill goal' : 'Weekly plan'}
          </div>
        </div>

        <form onSubmit={handleGenerateRoadmap} className="space-y-4">
          {activeMode === 'skill' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">What do you want to achieve?</label>
                <input
                  value={skillForm.goal}
                  onChange={(event) => handleSkillField('goal', event.target.value)}
                  placeholder="Learn a handstand"
                  className="w-full rounded-3xl border border-[#D1D5DB] bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-dark-border dark:bg-dark-bg dark:text-white"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Current level</label>
                  <div className="grid grid-cols-3 gap-2">
                    {levelOptions.map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => handleSkillField('currentLevel', level)}
                        className={`rounded-2xl border px-3 py-3 text-xs font-semibold transition ${
                          skillForm.currentLevel === level
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-[#E5E7EB] bg-white text-zinc-700 hover:border-primary/80 dark:border-dark-border dark:bg-dark-card dark:text-zinc-200'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Timeline</label>
                  <div className="grid grid-cols-2 gap-2">
                    {timelineOptions.map((timeline) => (
                      <button
                        key={timeline}
                        type="button"
                        onClick={() => handleSkillField('timeline', timeline)}
                        className={`rounded-2xl border px-3 py-3 text-xs font-semibold transition ${
                          skillForm.timeline === timeline
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-[#E5E7EB] bg-white text-zinc-700 hover:border-primary/80 dark:border-dark-border dark:bg-dark-card dark:text-zinc-200'
                        }`}
                      >
                        {timeline}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Training days per week</label>
                <div className="flex flex-wrap gap-2">
                  {trainingDays.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleSkillField('daysPerWeek', value)}
                      className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                        skillForm.daysPerWeek === value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-[#E5E7EB] bg-white text-zinc-700 hover:border-primary/80 dark:border-dark-border dark:bg-dark-card dark:text-zinc-200'
                      }`}
                    >
                      {value} days
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Any injuries or limitations?</label>
                <textarea
                  value={skillForm.injuries}
                  onChange={(event) => handleSkillField('injuries', event.target.value)}
                  rows={3}
                  placeholder="Optional—e.g. shoulder tightness, knee sensitivity"
                  className="w-full rounded-3xl border border-[#D1D5DB] bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-dark-border dark:bg-dark-bg dark:text-white"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Available training days</label>
                <div className="flex flex-wrap gap-2">
                  {weekDays.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleWeeklyDay(day)}
                      className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                        weeklyForm.availableDays.includes(day)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-[#E5E7EB] bg-white text-zinc-700 hover:border-primary/80 dark:border-dark-border dark:bg-dark-card dark:text-zinc-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Equipment access</label>
                  <div className="grid gap-2">
                    {equipmentOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleWeeklyField('equipment', option)}
                        className={`rounded-2xl border px-3 py-3 text-xs font-semibold text-left transition ${
                          weeklyForm.equipment === option
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-[#E5E7EB] bg-white text-zinc-700 hover:border-primary/80 dark:border-dark-border dark:bg-dark-card dark:text-zinc-200'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Fitness level</label>
                  <div className="grid gap-2">
                    {fitnessLevels.map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => handleWeeklyField('fitnessLevel', level)}
                        className={`rounded-2xl border px-3 py-3 text-xs font-semibold text-left transition ${
                          weeklyForm.fitnessLevel === level
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-[#E5E7EB] bg-white text-zinc-700 hover:border-primary/80 dark:border-dark-border dark:bg-dark-card dark:text-zinc-200'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Focus</label>
                <div className="grid grid-cols-3 gap-2">
                  {focusOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleWeeklyField('focus', option)}
                      className={`rounded-2xl border px-3 py-3 text-xs font-semibold transition ${
                        weeklyForm.focus === option
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-[#E5E7EB] bg-white text-zinc-700 hover:border-primary/80 dark:border-dark-border dark:bg-dark-card dark:text-zinc-200'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Any injuries or limitations?</label>
                <textarea
                  value={weeklyForm.injuries}
                  onChange={(event) => handleWeeklyField('injuries', event.target.value)}
                  rows={3}
                  placeholder="Optional—e.g. lower back tightness, patella pain"
                  className="w-full rounded-3xl border border-[#D1D5DB] bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-dark-border dark:bg-dark-bg dark:text-white"
                />
              </div>
            </div>
          )}

          {errorMessage ? <p className="text-sm font-semibold text-danger">{errorMessage}</p> : null}
          {successMessage ? <p className="text-sm font-semibold text-success">{successMessage}</p> : null}

          <button
            type="submit"
            disabled={generating}
            className="inline-flex h-12 w-full items-center justify-center rounded-3xl bg-primary px-5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {generating ? 'Forging your roadmap...' : 'Generate My Roadmap'}
          </button>
        </form>
      </section>

      <section className="space-y-4 rounded-3xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">Saved roadmap</p>
            <h2 className="mt-2 text-lg font-bold">Your latest saved plan</h2>
          </div>
          {loadingSaved ? (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</span>
          ) : savedRoadmap ? (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{savedRoadmap.modeLabel || 'Roadmap saved'}</span>
          ) : (
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">No roadmap yet</span>
          )}
        </div>

        {savedRoadmap ? (
          <div
            onClick={() => setSelectedRoadmapDetail(parseSkillRoadmap(savedRoadmap.content))}
            className="space-y-3 rounded-3xl border border-[#E5E7EB] bg-white p-4 cursor-pointer transition hover:border-primary/50 dark:border-dark-border dark:bg-[#111111] dark:hover:border-primary/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{savedRoadmap.goal}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-500">{savedRoadmap.modeLabel}</p>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{savedRoadmap.generatedAt}</p>
            </div>
            <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300 line-clamp-4">{savedRoadmap.content}</p>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-[#E4E4E7] bg-white p-6 text-center text-sm text-zinc-500 dark:border-dark-border dark:bg-dark-bg dark:text-zinc-400">
            No roadmap saved yet. Generate one above, then tap save to keep it in your profile.
          </div>
        )}
      </section>

      {roadmapText ? (
        <section className="space-y-4 rounded-3xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">Preview roadmap</p>
              <h2 className="mt-2 text-lg font-bold">{activeMode === 'skill' ? skillForm.goal : weeklyGoalLabel}</h2>
            </div>
            <div className="rounded-full bg-[#FFF4E5] px-3 py-1 text-xs font-semibold text-[#B45309] dark:bg-[#4A3608] dark:text-[#FBBF24]">
              {activeMode === 'skill' ? 'Skill Goal' : 'Weekly Plan'}
            </div>
          </div>

          <div className="space-y-3">
            {roadmapSections.map((section, index) => (
              <details key={`${section.title}-${index}`} className="rounded-3xl border border-[#E5E7EB] bg-white p-4 dark:border-dark-border dark:bg-dark-bg">
                <summary className="cursor-pointer text-sm font-semibold text-zinc-900 dark:text-white">{section.title}</summary>
                {section.body ? (
                  <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-600 dark:text-zinc-300">{section.body}</pre>
                ) : (
                  <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">No detail available for this section.</p>
                )}
              </details>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleSaveRoadmap}
              disabled={saving}
              className="inline-flex h-12 items-center justify-center rounded-3xl bg-primary px-5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Saving roadmap...' : 'Save Roadmap'}
            </button>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Saved roadmaps appear on your profile and can be reviewed anytime.</p>
          </div>
        </section>
      ) : null}

      {selectedRoadmapDetail && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50 transition-opacity duration-300 sm:items-center sm:justify-center"
          onClick={() => setSelectedRoadmapDetail(null)}
        >
          <div
            className="w-full max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-[#E4E4E7] bg-[#F1F1F1] p-6 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 mb-6">
              <h2 className="text-lg font-bold flex-1">Roadmap Details</h2>
              <button
                type="button"
                onClick={() => setSelectedRoadmapDetail(null)}
                className="rounded-full p-2 hover:bg-black/10 dark:hover:bg-white/10"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              {selectedRoadmapDetail.map((section, index) => (
                <details
                  key={`${section.title}-${index}`}
                  className="rounded-3xl border border-[#E5E7EB] bg-white p-4 dark:border-dark-border dark:bg-dark-bg"
                >
                  <summary className="cursor-pointer text-sm font-semibold text-zinc-900 dark:text-white">
                    {section.title}
                  </summary>
                  {section.body ? (
                    <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                      {section.body}
                    </pre>
                  ) : (
                    <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
                      No detail available for this section.
                    </p>
                  )}
                </details>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default GoalRoadmap
