const { GoogleGenerativeAI } = require('@google/generative-ai')

// Model hierarchy: try fastest/most capable first, fallback to more stable
const GEMINI_MODELS = [
  'gemini-flash-latest'
]

const FRIENDLY_FALLBACK = 'AI response is temporarily unavailable. Please try again shortly.'

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'YOUR_KEY') {
    console.error('❌ Gemini API: Missing or placeholder API key')
    return null
  }
  return new GoogleGenerativeAI(apiKey)
}

const generateAIResponse = async (prompt) => {
  const client = getGeminiClient()
  if (!client) {
    return {
      ok: false,
      text: FRIENDLY_FALLBACK,
      reason: 'missing_api_key',
      source: 'fallback'
    }
  }

  // Try models in order until one works
  for (const modelName of GEMINI_MODELS) {
    try {
      
      const model = client.getGenerativeModel({ model: modelName })
      const result = await model.generateContent(prompt)
      const text = result?.response?.text?.()?.trim()

      if (text) {
        
        return {
          ok: true,
          text: text,
          reason: null,
          source: modelName
        }
      } else {
        console.warn(`⚠️ Gemini ${modelName}: Empty response, trying next model`)
        continue
      }
    } catch (error) {
      const errorMessage = error.message || 'Unknown error'
      const statusCode = error.status || error.code

      // Log specific error types
      if (statusCode === 404 || errorMessage.includes('model not found')) {
        console.warn(`⚠️ Gemini ${modelName}: Model not found (404), trying next model`)
      } else if (statusCode === 429 || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
        console.warn(`⚠️ Gemini ${modelName}: Quota exceeded (429), trying next model`)
      } else if (statusCode === 403 || errorMessage.includes('permission') || errorMessage.includes('forbidden')) {
        console.error(`❌ Gemini ${modelName}: Permission denied (403), API key may be invalid`)
        break // Don't try other models if API key is invalid
      } else if (statusCode >= 500) {
        console.warn(`⚠️ Gemini ${modelName}: Server error (${statusCode}), trying next model`)
      } else {
        console.error(`❌ Gemini ${modelName}: Unexpected error (${statusCode}): ${errorMessage}`)
      }

      // Continue to next model
      continue
    }
  }

  // All models failed
  console.error('❌ All Gemini models failed, using fallback response')
  return {
    ok: false,
    text: FRIENDLY_FALLBACK,
    reason: 'all_models_failed',
    source: 'fallback'
  }
}

const buildDailyTipPrompt = ({ workout = {}, userProfile = {} }) => `
You are FitForge AI Coach.
Create a concise daily coaching tip based only on the single most recent workout.
Use 2-4 short paragraphs and keep the advice under 150 words.
Focus on:
- the workout completed today
- effort level
- recovery reminder
- hydration reminder
- motivational coaching
Use headings, bullet points, and short readable sections.
Do not analyze the last 7 days.
Do not generate a weekly summary.
Do not create a progression plan.
Do not generate workout programming.
Do not add detailed exercise prescriptions.
Do not produce long-form coaching sections.

Workout: ${JSON.stringify(workout)}
User profile: ${JSON.stringify(userProfile)}
`

const buildCoachPrompt = ({ workouts = [], userProfile = {} }) => `
You are FitForge AI Coach.
Create a detailed weekly summary of the athlete's training from the last 7 days.
Use headings, bullet points, numbered lists, and short readable sections.
Highlight recovery, progress, and overall weekly trends.
Do not produce a short daily coaching tip.
Do not generate workout progression plans or next session programming.
Do not focus on a single workout only.

Workouts (last 7 days): ${JSON.stringify(workouts)}
User profile: ${JSON.stringify(userProfile)}
`

const buildRoadmapPrompt = ({ mode, goal, currentLevel, deadline, daysPerWeek }) => `
You are FitForge AI Coach.
Create a concise training roadmap in plain text.

Mode: ${mode}
Goal: ${goal}
Current level: ${currentLevel}
Deadline: ${deadline}
Days per week: ${daysPerWeek}
`

const buildChatPrompt = ({ message, chatHistory = [], workoutContext = {} }) => `
You are FitForge AI Coach — a knowledgeable, friendly personal trainer who knows this athlete well.

Athlete's Profile:
- Recent workouts (last 14 days): ${JSON.stringify(workoutContext.workouts || [])}
- Active goal: ${workoutContext.goal || 'No active goal set'}
- Current streak: ${workoutContext.streak || 0} days

Conversation so far:
${JSON.stringify(chatHistory)}

Rules:
- Respond like a real personal trainer texting their client
- Use markdown-style headings, bullets, numbered lists, and short paragraphs
- Make the guidance easy to scan on mobile and highlight key actions
- If they report pain or injury, take it seriously and give safe alternatives
- If they ask to change their plan, give a specific modified plan
- Never be generic — always reference their actual workout history
- If you don't know something, say so honestly

User's message: ${message}
`
const coach = async (req, res) => {
  const { workouts = [], userProfile = {} } = req.body || {}

  const prompt = buildCoachPrompt({ workouts, userProfile })
  const result = await generateAIResponse(prompt)

  // If the AI service fails, return a local weekly summary based on workout data
  if (!result.ok) {
    console.warn('[AI Fallback] Using local workout-based advice for weekly summary')
    const fallback = buildLocalWeeklySummary(workouts)
    return res.status(200).json({
      advice: fallback,
      source: 'fallback',
      offlineFallback: true,
    })
  }

  return res.status(200).json({
    advice: result.text,
    source: result.source,
  })
}

const dailyTip = async (req, res) => {
  const { workout = {}, userProfile = {} } = req.body || {}

  const prompt = buildDailyTipPrompt({ workout, userProfile })
  const result = await generateAIResponse(prompt)

  // If the AI service fails, return a concise local daily tip based on the latest workout
  if (!result.ok) {
    console.warn('[AI Fallback] Using local workout-based advice for daily tip')
    const fallback = buildLocalDailyTip(workout)
    return res.status(200).json({
      advice: fallback,
      source: 'fallback',
      offlineFallback: true,
    })
  }

  return res.status(200).json({
    advice: result.text,
    source: result.source,
  })
}

// Local fallback generators (keep simple and deterministic so UI always shows helpful text)
const buildLocalDailyTip = (workout = {}) => {
  if (!workout || Object.keys(workout).length === 0) {
    return 'Nice work! Log a workout to receive a short daily coaching tip based on that session.'
  }

  const name = workout.name || workout.type || 'your workout'
  const effort = workout.effort || workout.intensity || workout.perceivedEffort || 'moderate'
  const minutes = workout.duration ? `${workout.duration} min` : ''

  const lines = []
  lines.push(`Nice work completing ${name}${minutes ? ` (${minutes})` : ''} today. Your effort level was ${effort}, which supports consistent progress.`)
  lines.push('\nRecovery Focus:\n• Hydrate well\n• Prioritize protein\n• Gentle stretching')
  lines.push('\nSmall wins repeated consistently create big results. See you at the next session!')

  return lines.join('\n\n')
}

const buildLocalWeeklySummary = (workouts = []) => {
  const total = workouts.length
  let totalCardio = 0
  const muscleSet = new Set()
  const trainedDays = new Set()

  workouts.forEach((w) => {
    if (w.type === 'cardio') totalCardio += Number(w.distance) || 0
    ;(w.muscleGroups || []).forEach(g => muscleSet.add(g))
    if (w.date) {
      const d = new Date(w.date)
      if (!isNaN(d.getTime())) trainedDays.add(d.toISOString().slice(0,10))
    }
  })

  const muscleGroups = Array.from(muscleSet)
  const consistency = `${trainedDays.size} days trained`

  const parts = []
  parts.push(`# Weekly Summary`)
  parts.push(`- Total workouts: ${total}`)
  parts.push(`- Total cardio distance: ${totalCardio.toFixed(2)} km`)
  parts.push(`- Muscle groups trained: ${muscleGroups.length ? muscleGroups.join(', ') : 'None recorded'}`)
  parts.push(`- Consistency: ${consistency}`)

  parts.push(`\nKeep up the momentum — small, steady steps lead to progress.`)

  return parts.join('\n')
}

const roadmap = async (req, res) => {
  const { mode, goal, currentLevel, deadline, daysPerWeek } = req.body || {}
  

  const prompt = buildRoadmapPrompt({ mode, goal, currentLevel, deadline, daysPerWeek })
  const result = await generateAIResponse(prompt)

  

  return res.status(200).json({
    roadmap: result.text,
    source: result.source,
  })
}

const chat = async (req, res) => {
  const { message = '', chatHistory = [], workoutContext = {} } = req.body || {}
  

  const prompt = buildChatPrompt({ message, chatHistory, workoutContext })
  const result = await generateAIResponse(prompt)

  

  return res.status(200).json({
    reply: result.text,
    source: result.source,
  })
}

module.exports = { generateAIResponse, coach, dailyTip, roadmap, chat }
