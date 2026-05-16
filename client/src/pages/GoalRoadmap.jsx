import { useCallback, useEffect, useMemo, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore'
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

const stripMarkdown = (text) =>
  text
    .replace(/---+/g, '')
    .replace(/#{1,3}\s*/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

const normalizeTitle = (title) => stripMarkdown(title)

const renderInlineText = (text) => {
  if (!text) return null

  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g
  const parts = []
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    const token = match[0]
    const value = token.slice(token.startsWith('**') ? 2 : 1, token.endsWith('**') ? -2 : -1)

    if (token.startsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-semibold text-orange-600 dark:text-orange-300">
          {value}
        </strong>,
      )
    } else {
      parts.push(
        <em key={match.index} className="font-medium italic text-zinc-600 dark:text-zinc-400">
          {value}
        </em>,
      )
    }

    lastIndex = match.index + token.length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length ? parts : text
}

const isRoutineHeader = (line) => {
  if (!line) return false
  if (/^(ROUTINE|WORKOUT|DAY|PHASE|BLOCK|CORE|WARM[- ]?UP|COOL[- ]?DOWN)\b/i.test(line)) return true
  if (/^[A-Z0-9\s]{3,30}$/.test(line) && line.trim().length > 2 && line.trim().includes(' ')) return true
  return false
}

const parseRoadmapBody = (body) => {
  const lines = body.split(/\r?\n/)
  const blocks = []
  let current = null
  const flushCurrent = () => {
    if (!current) return
    if (current.type === 'paragraph') {
      current.text = current.text.trim()
      if (current.text) blocks.push(current)
    } else {
      blocks.push(current)
    }
    current = null
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trim()
    if (!line || /^---+$/.test(line)) {
      flushCurrent()
      return
    }

    const headingMatch = line.match(/^(#{1,3})\s*(.+)$/)
    if (headingMatch) {
      flushCurrent()
      blocks.push({ type: 'heading', level: headingMatch[1].length, text: headingMatch[2].trim() })
      return
    }

    const boldHeadingMatch = line.match(/^\*\*(.+?)\*\*$/)
    if (boldHeadingMatch) {
      flushCurrent()
      blocks.push({ type: 'subheading', text: boldHeadingMatch[1].trim() })
      return
    }

    const routineMatch = isRoutineHeader(line)
    if (routineMatch) {
      flushCurrent()
      current = { type: 'routine', title: stripMarkdown(line), items: [], description: '' }
      return
    }

    const bulletMatch = line.match(/^[-*]\s+(.+)$/)
    if (bulletMatch) {
      if (current?.type === 'ul') {
        current.items.push(bulletMatch[1].trim())
      } else if (current?.type === 'routine') {
        current.items.push(bulletMatch[1].trim())
      } else {
        flushCurrent()
        current = { type: 'ul', items: [bulletMatch[1].trim()] }
      }
      return
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/)
    if (orderedMatch) {
      if (current?.type === 'ol') {
        current.items.push(orderedMatch[1].trim())
      } else if (current?.type === 'routine') {
        current.items.push(orderedMatch[1].trim())
      } else {
        flushCurrent()
        current = { type: 'ol', items: [orderedMatch[1].trim()] }
      }
      return
    }

    if (/youtube/i.test(line) || /search.*youtube/i.test(line)) {
      flushCurrent()
      blocks.push({ type: 'youtube', text: stripMarkdown(line) })
      return
    }

    if (/^(milestone|week|phase)\b/i.test(line)) {
      flushCurrent()
      blocks.push({ type: 'milestone', text: stripMarkdown(line) })
      return
    }

    if (current?.type === 'paragraph') {
      current.text += ` ${line}`
      return
    }

    if (current?.type === 'routine') {
      current.description += `${line} `
      return
    }

    flushCurrent()
    current = { type: 'paragraph', text: line }
  })

  flushCurrent()
  return blocks
}

const renderRoadmapBlocks = (blocks) =>
  blocks.map((block, index) => {
    switch (block.type) {
      case 'heading':
        return (
          <h3
            key={index}
            className={`text-sm font-semibold ${block.level === 1 ? 'text-orange-500' : 'text-orange-400'} tracking-tight`}
          >
            {renderInlineText(stripMarkdown(block.text))}
          </h3>
        )
      case 'subheading':
        return (
          <div
            key={index}
            className="rounded-3xl border-l-4 border-orange-400 bg-orange-50/60 px-4 py-3 text-sm font-semibold text-orange-700 dark:border-orange-500 dark:bg-orange-500/10 dark:text-orange-200"
          >
            {renderInlineText(stripMarkdown(block.text))}
          </div>
        )
      case 'routine':
        return (
          <div
            key={index}
            className="rounded-3xl border border-[#E5E7EB] bg-[#FEF7EE] p-4 shadow-sm dark:border-dark-border dark:bg-[#181B1F]"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B45309] dark:text-[#FBBF24]">Workout block</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-white">{renderInlineText(block.title)}</p>
              </div>
              <div className="h-10 w-1 rounded-full bg-orange-500" />
            </div>
            {block.description ? (
              <p className="mb-3 text-sm leading-7 text-zinc-700 dark:text-zinc-300">{renderInlineText(stripMarkdown(block.description.trim()))}</p>
            ) : null}
            {block.items.length ? (
              <div className="space-y-3">
                {block.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="rounded-3xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm leading-7 text-zinc-700 shadow-sm dark:border-dark-border dark:bg-[#111827] dark:text-zinc-300"
                  >
                    <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
                      {itemIndex + 1}
                    </span>
                    <span>{renderInlineText(stripMarkdown(item))}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )
      case 'paragraph':
        return (
          <p key={index} className="text-sm leading-7 text-zinc-700 dark:text-zinc-300">
            {renderInlineText(stripMarkdown(block.text))}
          </p>
        )
      case 'ul':
        return (
          <ul key={index} className="space-y-3">
            {block.items.map((item, itemIndex) => (
              <li
                key={itemIndex}
                className="rounded-3xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-sm leading-7 text-zinc-700 dark:border-dark-border dark:bg-[#111827] dark:text-zinc-300"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
                    •
                  </span>
                  <span>{renderInlineText(stripMarkdown(item))}</span>
                </div>
              </li>
            ))}
          </ul>
        )
      case 'ol':
        return (
          <ol key={index} className="space-y-3">
            {block.items.map((item, itemIndex) => (
              <li
                key={itemIndex}
                className="rounded-3xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-sm leading-7 text-zinc-700 dark:border-dark-border dark:bg-[#111827] dark:text-zinc-300"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
                    {itemIndex + 1}
                  </span>
                  <span>{renderInlineText(stripMarkdown(item))}</span>
                </div>
              </li>
            ))}
          </ol>
        )
      case 'youtube':
        return (
          <div key={index} className="rounded-3xl border border-[#F59E0B]/20 bg-[#FFF7ED] p-4 text-sm text-[#92400E] dark:border-orange-500/20 dark:bg-[#3D2208] dark:text-[#FDD38D]">
            <p className="font-semibold">YouTube search</p>
            <p className="mt-1 leading-7">{block.text}</p>
          </div>
        )
      case 'milestone':
        return (
          <div key={index} className="rounded-3xl border border-[#F97316]/20 bg-[#FFF4E5] p-4 text-sm text-[#92400E] dark:border-[#F97316]/30 dark:bg-[#3D1F08] dark:text-[#FCD34D]">
            <p className="font-semibold">Milestone</p>
            <p className="mt-1 leading-7">{block.text}</p>
          </div>
        )
      default:
        return null
    }
  })

const parseRoadmapDetail = (roadmap) => {
  return roadmap?.mode === 'weekly' ? parseWeeklyRoadmap(roadmap.content) : parseSkillRoadmap(roadmap.content)
}

const GoalRoadmap = () => {
  const { currentUser } = useAuth()
  const userId = currentUser?.uid || null
  const [activeMode, setActiveMode] = useState('skill')
  const [roadmapText, setRoadmapText] = useState('')
  const [savedRoadmaps, setSavedRoadmaps] = useState([])
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

  const loadSavedRoadmaps = useCallback(async () => {
    if (!userId) return
    setLoadingSaved(true)
    try {
      const roadmapRef = collection(db, `users/${userId}/roadmaps`)
      const roadmapQuery = query(roadmapRef, orderBy('generatedAt', 'desc'))
      const snapshot = await getDocs(roadmapQuery)
      const roadmaps = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          mode: data.mode || (data.modeLabel === 'Weekly Plan' ? 'weekly' : 'skill'),
          modeLabel: data.modeLabel || (data.mode === 'weekly' ? 'Weekly Plan' : 'Skill Goal'),
          goal: data.goal || '',
          content: data.content || '',
          generatedAt: formatTimestamp(data.generatedAt),
          generatedAtRaw: data.generatedAt,
        }
      })
      setSavedRoadmaps(roadmaps)
    } catch (error) {
      console.error('Failed to load saved roadmaps:', error)
      setSavedRoadmaps([])
    } finally {
      setLoadingSaved(false)
    }
  }, [userId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSavedRoadmaps()
  }, [loadSavedRoadmaps])

  const savedSkillRoadmaps = useMemo(
    () => savedRoadmaps.filter((roadmap) => roadmap.mode === 'skill'),
    [savedRoadmaps]
  )

  const savedWeeklyRoadmaps = useMemo(
    () => savedRoadmaps.filter((roadmap) => roadmap.mode === 'weekly'),
    [savedRoadmaps]
  )

  const currentSavedRoadmaps = useMemo(
    () => (activeMode === 'skill' ? savedSkillRoadmaps : savedWeeklyRoadmaps),
    [activeMode, savedSkillRoadmaps, savedWeeklyRoadmaps]
  )

  const currentSavedLabel = useMemo(
    () => (activeMode === 'skill' ? 'Specific Goal Roadmaps' : 'Weekly Workout Roadmaps'),
    [activeMode]
  )

  const currentEmptyMessage = useMemo(
    () => (activeMode === 'skill' ? 'No specific goal roadmaps saved yet.' : 'No weekly workout roadmaps saved yet.'),
    [activeMode]
  )

  const handleModeChange = (mode) => {
    setActiveMode(mode)
    setErrorMessage('')
    setSuccessMessage('')
    setRoadmapText('')
  }

  const handleDeleteRoadmap = async (roadmapId) => {
    if (!userId || !roadmapId) return
    const confirmed = window.confirm('Delete this roadmap?')
    if (!confirmed) return

    try {
      await deleteDoc(doc(db, `users/${userId}/roadmaps`, roadmapId))
      setSavedRoadmaps((prev) => prev.filter((roadmap) => roadmap.id !== roadmapId))
    } catch (error) {
      console.error('Failed to delete roadmap:', error)
    }
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
      await loadSavedRoadmaps()
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

      <section className="space-y-6 rounded-3xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">Saved roadmaps</p>
            <h2 className="mt-2 text-lg font-bold">Your saved plans</h2>
          </div>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">{loadingSaved ? 'Loading...' : `${currentSavedRoadmaps.length} saved roadmap${currentSavedRoadmaps.length === 1 ? '' : 's'}`}</span>
        </div>

        <div className="space-y-4">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">{currentSavedLabel}</p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Only saved {activeMode === 'skill' ? 'skill goal' : 'weekly workout'} roadmaps.</p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{currentSavedRoadmaps.length}</span>
          </div>

          {currentSavedRoadmaps.length ? (
            <div className="space-y-3">
              {currentSavedRoadmaps.map((roadmap) => (
                <div
                  key={roadmap.id}
                  onClick={() => setSelectedRoadmapDetail(parseRoadmapDetail(roadmap))}
                  className="w-full cursor-pointer rounded-3xl border border-[#E5E7EB] bg-white p-4 text-left transition hover:border-primary/50 dark:border-dark-border dark:bg-[#111111] dark:hover:border-primary/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{roadmap.goal}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-500">{roadmap.modeLabel}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{roadmap.generatedAt}</p>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleDeleteRoadmap(roadmap.id)
                        }}
                        className="rounded-full border border-zinc-200 bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300 line-clamp-4">
                    {stripMarkdown(roadmap.content).slice(0, 140)}{stripMarkdown(roadmap.content).length > 140 ? '…' : ''}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#E4E4E7] bg-white p-6 text-center text-sm text-zinc-500 dark:border-dark-border dark:bg-dark-bg dark:text-zinc-400">
              {currentEmptyMessage}
            </div>
          )}
        </div>
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
                <summary className="cursor-pointer text-sm font-semibold text-zinc-900 dark:text-white">{normalizeTitle(section.title)}</summary>
                {section.body ? (
                  <div className="mt-3 space-y-4 break-words text-sm leading-7 text-zinc-700 dark:text-zinc-300">
                    {renderRoadmapBlocks(parseRoadmapBody(section.body))}
                  </div>
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
                    {normalizeTitle(section.title)}
                  </summary>
                  {section.body ? (
                    <div className="mt-3 space-y-4 break-words text-sm leading-7 text-zinc-700 dark:text-zinc-300">
                      {renderRoadmapBlocks(parseRoadmapBody(section.body))}
                    </div>
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
