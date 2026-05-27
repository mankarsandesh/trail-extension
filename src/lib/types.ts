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
