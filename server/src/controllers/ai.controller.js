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
You are FitForge AI Coach — a knowledgeable, friendly personal trainer who knows this athlete well.

Athlete's Profile:
- Recent workouts (last 14 days): ${JSON.stringify(workoutContext.workouts || [])}
- Active goal: ${workoutContext.goal || 'No active goal set'}
- Current streak: ${workoutContext.streak || 0} days

Conversation so far:
${JSON.stringify(chatHistory)}

Rules:
- Respond like a real personal trainer texting their client
- Be warm, direct, and specific to THEIR data
- Keep responses concise — 2-4 sentences usually enough unless detailed plan needed
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

  

  return res.status(200).json({
    advice: result.text,
    source: result.source,
  })
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

module.exports = { generateAIResponse, coach, roadmap, chat }
