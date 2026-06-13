export interface Visit {
  id: string
  url: string
  domain: string
  title: string
  startTime: number
  endTime: number
  duration: number
}

export type DomainCategory = 'productive' | 'neutral' | 'distracting' | null

export interface DomainMeta {
  domain: string
  category: DomainCategory
  excluded: boolean
}

export interface Settings {
  excludedDomains: string[]
  idleThresholdSeconds: number
  trackIncognito: boolean
  retentionDays: number
}

export interface CurrentSession {
  url: string
  domain: string
  title: string
  startTime: number
  tabId: number
}

export interface DomainStats {
  domain: string
  totalTime: number
  visitCount: number
  visits: Visit[]
  category?: DomainCategory
}

export interface DailyPoint {
  date: string
  time: number
  visits: number
}

export interface TextCategory {
  id: string
  name: string
  createdAt: number
}

export const OTHER_CATEGORY: TextCategory = {
  id: 'other',
  name: 'Other',
  createdAt: 0
}

export interface SavedText {
  id: string
  text: string
  url: string
  domain: string
  title: string
  savedAt: number
  categoryId: string
}
