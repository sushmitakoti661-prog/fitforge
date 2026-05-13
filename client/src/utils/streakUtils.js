const toLocalDateKey = (input) => {
  if (!input) return null
  const date = typeof input.toDate === 'function' ? input.toDate() : new Date(input)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const parseDateKey = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const getDayDifference = (currentKey, previousKey) => {
  const currentDate = parseDateKey(currentKey)
  const previousDate = parseDateKey(previousKey)
  const diff = currentDate.getTime() - previousDate.getTime()
  return Math.round(diff / 86400000)
}

const uniqueSortedDays = (workouts) => {
  const dayKeys = workouts
    .map((workout) => toLocalDateKey(workout.date))
    .filter(Boolean)
  return Array.from(new Set(dayKeys)).sort()
}

export const calculateStreak = (workouts) => {
  const days = uniqueSortedDays(workouts)
  if (!days.length) return 0

  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

  const startKey = days.includes(todayKey)
    ? todayKey
    : days.includes(yesterdayKey)
    ? yesterdayKey
    : null

  if (!startKey) return 0

  let streak = 1
  let position = days.indexOf(startKey)

  while (position > 0) {
    const previousDay = days[position - 1]
    if (getDayDifference(days[position], previousDay) === 1) {
      streak += 1
      position -= 1
    } else {
      break
    }
  }

  return streak
}

export const calculateLongestStreak = (workouts) => {
  const days = uniqueSortedDays(workouts)
  if (!days.length) return 0

  let maxStreak = 1
  let currentStreak = 1

  for (let index = 1; index < days.length; index += 1) {
    if (getDayDifference(days[index], days[index - 1]) === 1) {
      currentStreak += 1
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 1
    }
  }

  return maxStreak
}
