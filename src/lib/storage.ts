import type { Visit, DomainMeta, Settings, CurrentSession, SavedText, TextCategory } from './types'
import { OTHER_CATEGORY } from './types'

const KEYS = {
  visits: 'visits',
  domainMeta: 'domainMeta',
  settings: 'settings',
  currentSession: 'currentSession',
  savedTexts: 'savedTexts',
  textCategories: 'textCategories'
} as const

const DEFAULT_SETTINGS: Settings = {
  excludedDomains: [],
  idleThresholdSeconds: 60,
  trackIncognito: false,
  retentionDays: 90
}

export async function getVisits(): Promise<Visit[]> {
  const result = await chrome.storage.local.get(KEYS.visits)
  return (result[KEYS.visits] as Visit[]) || []
}

export async function saveVisit(visit: Visit): Promise<void> {
  const visits = await getVisits()
  visits.push(visit)

  const settings = await getSettings()
  const cutoff = Date.now() - settings.retentionDays * 24 * 60 * 60 * 1000
  const trimmed = visits.filter(v => v.startTime > cutoff)

  await chrome.storage.local.set({ [KEYS.visits]: trimmed })
}

export async function clearVisits(): Promise<void> {
  await chrome.storage.local.set({ [KEYS.visits]: [] })
}

export async function clearVisitsInRange(from: number, to: number): Promise<void> {
  const visits = await getVisits()
  const kept = visits.filter(v => v.startTime < from || v.startTime > to)
  await chrome.storage.local.set({ [KEYS.visits]: kept })
}

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(KEYS.settings)
  return { ...DEFAULT_SETTINGS, ...(result[KEYS.settings] || {}) }
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  const current = await getSettings()
  await chrome.storage.local.set({
    [KEYS.settings]: { ...current, ...settings }
  })
}

export async function getDomainMeta(): Promise<Record<string, DomainMeta>> {
  const result = await chrome.storage.local.get(KEYS.domainMeta)
  return (result[KEYS.domainMeta] as Record<string, DomainMeta>) || {}
}

export async function setDomainCategory(
  domain: string,
  category: DomainMeta['category']
): Promise<void> {
  const meta = await getDomainMeta()
  const existing = meta[domain] || { domain, category: null, excluded: false }
  meta[domain] = { ...existing, category }
  await chrome.storage.local.set({ [KEYS.domainMeta]: meta })
}

export async function toggleDomainExcluded(domain: string): Promise<void> {
  const meta = await getDomainMeta()
  const existing = meta[domain] || { domain, category: null, excluded: false }
  meta[domain] = { ...existing, excluded: !existing.excluded }
  await chrome.storage.local.set({ [KEYS.domainMeta]: meta })

  const settings = await getSettings()
  const set = new Set(settings.excludedDomains)
  if (meta[domain].excluded) set.add(domain)
  else set.delete(domain)
  await saveSettings({ excludedDomains: Array.from(set) })
}

export async function getCurrentSession(): Promise<CurrentSession | null> {
  const result = await chrome.storage.session.get(KEYS.currentSession)
  return (result[KEYS.currentSession] as CurrentSession) || null
}

export async function setCurrentSession(session: CurrentSession | null): Promise<void> {
  if (session) {
    await chrome.storage.session.set({ [KEYS.currentSession]: session })
  } else {
    await chrome.storage.session.remove(KEYS.currentSession)
  }
}

export async function exportAllData(): Promise<string> {
  const visits = await getVisits()
  const meta = await getDomainMeta()
  const settings = await getSettings()
  return JSON.stringify(
    { exportedAt: new Date().toISOString(), visits, meta, settings },
    null,
    2
  )
}

export async function importData(json: string): Promise<void> {
  const data = JSON.parse(json)
  if (data.visits) await chrome.storage.local.set({ [KEYS.visits]: data.visits })
  if (data.meta) await chrome.storage.local.set({ [KEYS.domainMeta]: data.meta })
  if (data.settings) await chrome.storage.local.set({ [KEYS.settings]: data.settings })
}

export async function getSavedTexts(): Promise<SavedText[]> {
  const result = await chrome.storage.local.get(KEYS.savedTexts)
  return (result[KEYS.savedTexts] as SavedText[]) || []
}

export async function saveText(item: SavedText): Promise<void> {
  const items = await getSavedTexts()
  items.unshift(item)
  await chrome.storage.local.set({ [KEYS.savedTexts]: items })
}

export async function deleteSavedText(id: string): Promise<void> {
  const items = await getSavedTexts()
  await chrome.storage.local.set({
    [KEYS.savedTexts]: items.filter(i => i.id !== id)
  })
}

export async function clearSavedTexts(): Promise<void> {
  await chrome.storage.local.set({ [KEYS.savedTexts]: [] })
}

export async function getCategories(): Promise<TextCategory[]> {
  const result = await chrome.storage.local.get(KEYS.textCategories)
  const stored = (result[KEYS.textCategories] as TextCategory[]) || []
  // Always ensure "Other" is last
  const withoutOther = stored.filter(c => c.id !== OTHER_CATEGORY.id)
  return [...withoutOther, OTHER_CATEGORY]
}

export async function addCategory(name: string): Promise<TextCategory> {
  const current = await getCategories()
  const withoutOther = current.filter(c => c.id !== OTHER_CATEGORY.id)
  const cat: TextCategory = {
    id: `cat-${Date.now()}`,
    name: name.trim(),
    createdAt: Date.now()
  }
  await chrome.storage.local.set({ [KEYS.textCategories]: [...withoutOther, cat] })
  return cat
}

export async function deleteCategory(id: string): Promise<void> {
  if (id === OTHER_CATEGORY.id) return
  const current = await getCategories()
  const updated = current.filter(c => c.id !== id && c.id !== OTHER_CATEGORY.id)
  await chrome.storage.local.set({ [KEYS.textCategories]: updated })
  // Move orphaned texts to "Other"
  const texts = await getSavedTexts()
  const reassigned = texts.map(t => t.categoryId === id ? { ...t, categoryId: OTHER_CATEGORY.id } : t)
  await chrome.storage.local.set({ [KEYS.savedTexts]: reassigned })
}
