import type { Visit, DomainStats, DailyPoint } from './types'

export function totalTime(visits: Visit[]): number {
  return visits.reduce((sum, v) => sum + v.duration, 0)
}

export function groupByDomain(visits: Visit[]): DomainStats[] {
  const map = new Map<string, DomainStats>()

  for (const v of visits) {
    const entry = map.get(v.domain) || {
      domain: v.domain,
      totalTime: 0,
      visitCount: 0,
      visits: []
    }
    entry.totalTime += v.duration
    entry.visitCount += 1
    entry.visits.push(v)
    map.set(v.domain, entry)
  }

  return Array.from(map.values()).sort((a, b) => b.totalTime - a.totalTime)
}

export function filterByDateRange(
  visits: Visit[],
  from: number,
  to: number
): Visit[] {
  return visits.filter(v => v.startTime >= from && v.startTime <= to)
}

export function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return { from: start.getTime(), to: Date.now() }
}

export function weekRange() {
  const start = new Date()
  start.setDate(start.getDate() - 7)
  start.setHours(0, 0, 0, 0)
  return { from: start.getTime(), to: Date.now() }
}

export function monthRange() {
  const start = new Date()
  start.setDate(start.getDate() - 30)
  start.setHours(0, 0, 0, 0)
  return { from: start.getTime(), to: Date.now() }
}

export function hourlyDistribution(visits: Visit[]): number[] {
  const hours = new Array(24).fill(0)
  for (const v of visits) {
    const hour = new Date(v.startTime).getHours()
    hours[hour] += v.duration
  }
  return hours
}

export function dailyTimeSeries(visits: Visit[], days: number): DailyPoint[] {
  const result: DailyPoint[] = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now)
    day.setDate(now.getDate() - i)
    day.setHours(0, 0, 0, 0)
    const next = new Date(day)
    next.setDate(day.getDate() + 1)

    const dayVisits = visits.filter(
      v => v.startTime >= day.getTime() && v.startTime < next.getTime()
    )

    result.push({
      date: day.toISOString().slice(0, 10),
      time: totalTime(dayVisits),
      visits: dayVisits.length
    })
  }

  return result
}

export function searchVisits(visits: Visit[], query: string): Visit[] {
  if (!query.trim()) return visits
  const q = query.toLowerCase()
  return visits.filter(
    v =>
      v.url.toLowerCase().includes(q) ||
      v.title.toLowerCase().includes(q) ||
      v.domain.toLowerCase().includes(q)
  )
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return '0s'
  const seconds = Math.floor(ms / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${secs}s`
  return `${secs}s`
}

export function formatDurationLong(ms: number): string {
  if (ms < 1000) return '0 seconds'
  const seconds = Math.floor(ms / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  const parts: string[] = []
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`)
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`)
  return parts.join(' ') || 'less than a minute'
}

export function formatTimestamp(ms: number): string {
  const date = new Date(ms)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const time = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })

  if (isToday) return `Today, ${time}`
  if (isYesterday) return `Yesterday, ${time}`
  return `${date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric'
  })}, ${time}`
}

export function groupVisitsByDay(visits: Visit[]): Map<string, Visit[]> {
  const map = new Map<string, Visit[]>()
  const sorted = [...visits].sort((a, b) => b.startTime - a.startTime)

  for (const v of sorted) {
    const key = new Date(v.startTime).toDateString()
    const list = map.get(key) || []
    list.push(v)
    map.set(key, list)
  }

  return map
}

export function getFaviconUrl(domain: string, size = 32): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`
}
