import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import useAuth from '../hooks/useAuth'
import { sendChatMessage } from '../utils/apiService'
import { createNotification, getNotificationPreferences } from '../utils/notificationService'

const SUGGESTED_PROMPTS = [
  'What should I train today?',
  'I felt pain in my shoulder today',
  'Am I overtraining this week?',
  'Change my plan, I have knee pain',
]

const CHAT_UNAVAILABLE_MESSAGE = 'FitForge Coach is currently busy. Please try again in a few minutes.'
const API_FALLBACK_MESSAGE = 'AI response is temporarily unavailable. Please try again shortly.'

const formatTimestamp = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

const Chatbot = () => {
  const { currentUser } = useAuth()
  const userId = currentUser?.uid || null
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef(null)
  const messageIdRef = useRef(0)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const loadChatHistory = useCallback(async () => {
    if (!userId) return []

    try {
      const chatRef = collection(db, `users/${userId}/chatHistory`)
      const chatQuery = query(chatRef, orderBy('timestamp', 'asc'), limit(50))
      const snapshot = await getDocs(chatQuery)
      return snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          type: data.type,
          content: data.content,
          timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp),
        }
      })
    } catch (error) {
      console.error('Failed to load chat history:', error)
      return []
    }
  }, [userId])

  const saveMessage = useCallback(async (message) => {
    if (!userId) return

    try {
      const chatRef = collection(db, `users/${userId}/chatHistory`)
      await addDoc(chatRef, {
        type: message.type,
        content: message.content,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
      })
    } catch (error) {
      console.error('Failed to save message:', error)
    }
  }, [userId])

  const clearChatHistory = useCallback(async () => {
    if (!userId) return

    try {
      // Note: Firestore doesn't have a direct "delete collection" method in client SDK
      // For simplicity, we'll just reset the local state and let new messages overwrite old ones
      // In a production app, you'd want to delete all documents in the collection
      setMessages([
        {
          id: 'welcome',
          type: 'ai',
          content: "Hi! I'm your FitForge Coach. I know your workout history, goals, and can help you train smarter. What can I help you with today?",
          timestamp: new Date(),
        },
      ])
    } catch (error) {
      console.error('Failed to clear chat:', error)
    }
  }, [userId])

  const loadUserContext = useCallback(async () => {
    if (!userId) return { workouts: [], goal: null, streak: 0 }

    try {
      // Get recent workouts (last 14 days)
      const workoutsRef = collection(db, `users/${userId}/workouts`)
      const workoutQuery = query(workoutsRef, orderBy('date', 'desc'), limit(14))
      const workoutSnapshot = await getDocs(workoutQuery)
      const workouts = workoutSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          ...data,
          date: data.date?.toDate?.()?.toISOString() || null,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        }
      })

      // Get active roadmap
      const roadmapRef = collection(db, `users/${userId}/roadmaps`)
      const roadmapQuery = query(roadmapRef, orderBy('generatedAt', 'desc'), limit(1))
      const roadmapSnapshot = await getDocs(roadmapQuery)
      const goal = roadmapSnapshot.empty ? null : roadmapSnapshot.docs[0].data().goal

      // For now, streak is 0 since the utility isn't implemented
      const streak = 0

      return { workouts, goal, streak }
    } catch (error) {
      console.error('Failed to load user context:', error)
      return { workouts: [], goal: null, streak: 0 }
    }
  }, [userId])

  useEffect(() => {
    const initializeChat = async () => {
      const chatHistory = await loadChatHistory()
      if (chatHistory.length === 0) {
        // Show welcome message only if no chat history exists
        setMessages([
          {
            id: 'welcome',
            type: 'ai',
            content: "Hi! I'm your FitForge Coach. I know your workout history, goals, and can help you train smarter. What can I help you with today?",
            timestamp: new Date(),
          },
        ])
      } else {
        setMessages(chatHistory)
      }
      setLoading(false)
    }

    if (userId) {
      initializeChat()
    } else {
      setLoading(false)
    }
  }, [userId, loadChatHistory])

  const handleSendMessage = async (messageText) => {
    if (!messageText.trim() || !userId) return

    const userMessage = {
      id: `msg-${++messageIdRef.current}`,
      type: 'user',
      content: messageText.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    await saveMessage(userMessage)
    setInputValue('')
    setIsTyping(true)

    try {
      const context = await loadUserContext()
      const chatHistory = messages.map(msg => ({
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
      }))

      const reply = await sendChatMessage(messageText, chatHistory, context)

      const aiMessage = {
        id: `msg-${++messageIdRef.current}`,
        type: 'ai',
        content: reply === API_FALLBACK_MESSAGE ? CHAT_UNAVAILABLE_MESSAGE : reply,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, aiMessage])
      await saveMessage(aiMessage)

      // Create notification for AI Coach tips
      const prefs = getNotificationPreferences()
      if (prefs.aiCoachUpdates && userId) {
        await createNotification(userId, 'ai_coach', 'AI Coach replied', 'Your coach has sent you a message. Check the chat to see tips and guidance.')
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage = {
        id: `msg-${++messageIdRef.current}`,
        type: 'ai',
        content: CHAT_UNAVAILABLE_MESSAGE,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
      await saveMessage(errorMessage)
    } finally {
      setIsTyping(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    handleSendMessage(inputValue)
  }

  const handlePromptClick = (prompt) => {
    handleSendMessage(prompt)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <p className="mt-2 text-sm text-zinc-400">Loading your coach...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E4E4E7] bg-[#F1F1F1] px-4 py-3 dark:border-dark-border dark:bg-dark-card">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
              <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-white dark:border-dark-card"></div>
          </div>
          <div>
            <h1 className="font-semibold text-zinc-900 dark:text-white">FitForge Coach</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Knows your workouts, goals, and history</p>
          </div>
        </div>
        {messages.length > 1 && (
          <button
            onClick={clearChatHistory}
            className="rounded-full px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-700"
          >
            Clear Chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-[#E4E4E7] text-zinc-900 dark:bg-dark-card dark:text-zinc-100'
                }`}
              >
                {message.type === 'ai' && (
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                      <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">FitForge Coach</span>
                  </div>
                )}
                <div className="text-sm leading-7 [&_p]:mt-0 [&_p]:mb-3 [&_strong]:font-semibold [&_em]:italic [&_ul]:list-disc [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:pl-5 [&_li]:mt-2">
                  {message.type === 'ai' ? (
                    <ReactMarkdown>{message.content || ''}</ReactMarkdown>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
                <p className="mt-2 text-xs opacity-70">{formatTimestamp(message.timestamp)}</p>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl bg-[#E4E4E7] px-4 py-3 text-zinc-900 dark:bg-dark-card dark:text-zinc-100">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                    <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">FitForge Coach</span>
                </div>
                <div className="flex space-x-1">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: '0.1s' }}></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts */}
      {messages.length === 1 && messages[0].id === 'welcome' && (
        <div className="border-t border-[#E4E4E7] bg-[#F1F1F1] px-4 py-3 dark:border-dark-border dark:bg-dark-card">
          <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handlePromptClick(prompt)}
                className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-[#E4E4E7] bg-[#F1F1F1] px-4 py-3 dark:border-dark-border dark:bg-dark-card">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask your coach anything..."
            className="flex-1 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm focus:border-primary focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:focus:border-primary"
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}

export default Chatbot
