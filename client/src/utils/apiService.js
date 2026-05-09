const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'

const postJson = async (path, payload) => {
  const response = await fetch(`${SERVER_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const fallbackMessage = `Request failed with status ${response.status}`
    try {
      const errorBody = await response.json()
      throw new Error(errorBody?.message || fallbackMessage)
    } catch {
      throw new Error(fallbackMessage)
    }
  }

  return response.json()
}

export const getAICoachAdvice = async (workouts, userProfile = {}) => {
  const data = await postJson('/api/ai/coach', { workouts, userProfile })
  return data.advice
}

export const generateRoadmap = async (goalData) => {
  const data = await postJson('/api/ai/roadmap', goalData)
  return data.roadmap
}

export const sendChatMessage = async (message, history = [], context = {}) => {
  const data = await postJson('/api/ai/chat', {
    message,
    chatHistory: history,
    workoutContext: context,
  })
  return data.reply
}
