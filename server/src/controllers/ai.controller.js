const { GoogleGenerativeAI } = require('@google/generative-ai')

const GEMINI_MODEL = 'gemini-1.5-flash'
const FRIENDLY_FALLBACK = 'AI response is temporarily unavailable. Please try again shortly.'

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'YOUR_KEY') return null
  return new GoogleGenerativeAI(apiKey)
}

const generateAIResponse = async (prompt) => {
  const client = getGeminiClient()
  if (!client) {
    return {
      ok: false,
      text: FRIENDLY_FALLBACK,
      reason: 'missing_api_key',
    }
  }

  try {
    const model = client.getGenerativeModel({ model: GEMINI_MODEL })
    const result = await model.generateContent(prompt)
    const text = result?.response?.text?.()?.trim()

    return {
      ok: Boolean(text),
      text: text || FRIENDLY_FALLBACK,
      reason: text ? null : 'empty_response',
    }
  } catch (error) {
    console.error('Gemini API error:', error.message)
    return {
      ok: false,
      text: FRIENDLY_FALLBACK,
      reason: 'gemini_error',
    }
  }
}

const buildCoachPrompt = ({ workouts = [], userProfile = {} }) => `
You are FitForge AI Coach.
Provide short, practical advice for this athlete.
Keep it concise and plain text.

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
You are FitForge AI Coach.
Reply helpfully in plain text and keep it concise.

User message: ${message}
Chat history: ${JSON.stringify(chatHistory)}
Workout context: ${JSON.stringify(workoutContext)}
`

const coach = async (req, res) => {
  const { workouts = [], userProfile = {} } = req.body || {}
  const prompt = buildCoachPrompt({ workouts, userProfile })
  const result = await generateAIResponse(prompt)

  return res.status(200).json({
    advice: result.text,
    source: result.ok ? 'gemini' : 'fallback',
  })
}

const roadmap = async (req, res) => {
  const { mode, goal, currentLevel, deadline, daysPerWeek } = req.body || {}
  const prompt = buildRoadmapPrompt({ mode, goal, currentLevel, deadline, daysPerWeek })
  const result = await generateAIResponse(prompt)

  return res.status(200).json({
    roadmap: result.text,
    source: result.ok ? 'gemini' : 'fallback',
  })
}

const chat = async (req, res) => {
  const { message = '', chatHistory = [], workoutContext = {} } = req.body || {}
  const prompt = buildChatPrompt({ message, chatHistory, workoutContext })
  const result = await generateAIResponse(prompt)

  return res.status(200).json({
    reply: result.text,
    source: result.ok ? 'gemini' : 'fallback',
  })
}

module.exports = { generateAIResponse, coach, roadmap, chat }
