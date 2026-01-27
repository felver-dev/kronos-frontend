// Utilitaires partagés pour les composants Timesheet

export const formatTime = (minutes: number): string => {
  if (!minutes || minutes <= 0) {
    return '0min'
  }

  const fraction = minutes - Math.floor(minutes)
  const roundedMinutes =
    fraction > 0 ? (fraction * 100 < 50 ? Math.floor(minutes) : Math.ceil(minutes)) : minutes

  const minutesPerHour = 60
  const minutesPerWorkDay = 480 // 8 heures par jour de travail
  const minutesPerMonth = 31 * 1440 // Pour les mois, on utilise toujours des jours calendaires
  const minutesPerYear = 365 * 1440 // Pour les années, on utilise toujours des jours calendaires

  let remaining = Math.floor(roundedMinutes)

  // Pour les très grandes durées (années/mois), utiliser des jours calendaires
  const years = Math.floor(remaining / minutesPerYear)
  remaining %= minutesPerYear

  const months = Math.floor(remaining / minutesPerMonth)
  remaining %= minutesPerMonth

  // Pour les jours, utiliser des jours de travail (8h = 480min)
  const days = Math.floor(remaining / minutesPerWorkDay)
  remaining %= minutesPerWorkDay

  const hours = Math.floor(remaining / minutesPerHour)
  remaining %= minutesPerHour

  const mins = remaining

  const parts: string[] = []
  if (years > 0) parts.push(`${years}an`)
  if (months > 0) parts.push(`${months}mois`)
  if (days > 0) parts.push(`${days}j`)
  if (hours > 0) parts.push(`${hours}h`)
  if (mins > 0 || parts.length === 0) parts.push(`${mins}min`)
  return parts.join(' ')
}

export const convertToMinutes = (value: string, unit: 'minutes' | 'hours' | 'days'): number => {
  const numValue = parseFloat(value)
  if (isNaN(numValue) || numValue <= 0) return 0
  
  switch (unit) {
    case 'minutes':
      return Math.round(numValue)
    case 'hours':
      return Math.round(numValue * 60)
    case 'days':
      return Math.round(numValue * 8 * 60) // 8 heures par jour
    default:
      return Math.round(numValue)
  }
}

export const getCurrentWeek = (): string => {
  const date = new Date()
  const year = date.getFullYear()
  const week = getWeekNumber(date)
  return `${year}-W${week.toString().padStart(2, '0')}`
}

export const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export const getWeekNumberInMonth = (date: Date): number => {
  const year = date.getFullYear()
  const month = date.getMonth()
  
  // Trouver le premier jour du mois
  const firstDay = new Date(year, month, 1)
  // Trouver le premier lundi du mois (ou le 1er si c'est un lundi)
  const firstDayOfWeek = firstDay.getDay() // 0 = dimanche, 1 = lundi, ..., 6 = samedi
  const daysToFirstMonday = firstDayOfWeek === 0 ? 1 : (firstDayOfWeek === 1 ? 0 : 8 - firstDayOfWeek)
  const firstMonday = new Date(year, month, 1 + daysToFirstMonday)
  
  // Si la date est avant le premier lundi, elle appartient à la semaine 1
  if (date < firstMonday) {
    return 1
  }
  
  // Calculer le nombre de jours depuis le premier lundi
  const daysSinceFirstMonday = Math.floor((date.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24))
  // Calculer le numéro de semaine (1ère, 2ème, etc.)
  return Math.floor(daysSinceFirstMonday / 7) + 1
}

export const formatWeekString = (date: Date): string => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const weekNumber = getWeekNumberInMonth(date)
  return `${year}-${month}-W${weekNumber}`
}
