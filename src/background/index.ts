import {
  saveVisit,
  getSettings,
  getCurrentSession,
  setCurrentSession,
  saveText,
  getCategories
} from '../lib/storage'
import type { Visit, CurrentSession, SavedText } from '../lib/types'

const MIN_DURATION_MS = 1500

function getDomain(url: string): string | null {
  try {
    const u = new URL(url)
    if (!['http:', 'https:'].includes(u.protocol)) return null
    return u.hostname
  } catch {
    return null
  }
}

async function startSession(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.url || tab.id === undefined) return
  if (tab.incognito) {
    const settings = await getSettings()
    if (!settings.trackIncognito) return
  }

  const domain = getDomain(tab.url)
  if (!domain) return

  const settings = await getSettings()
  if (settings.excludedDomains.includes(domain)) return

  const session: CurrentSession = {
    url: tab.url,
    domain,
    title: tab.title || domain,
    startTime: Date.now(),
    tabId: tab.id
  }
  await setCurrentSession(session)
}

async function endSession(): Promise<void> {
  const session = await getCurrentSession()
  if (!session) return

  const duration = Date.now() - session.startTime
  if (duration < MIN_DURATION_MS) {
    await setCurrentSession(null)
    return
  }

  const visit: Visit = {
    id: `${session.startTime}-${session.tabId}`,
    url: session.url,
    domain: session.domain,
    title: session.title,
    startTime: session.startTime,
    endTime: Date.now(),
    duration
  }

  await saveVisit(visit)
  await setCurrentSession(null)
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  await endSession()
  try {
    const tab = await chrome.tabs.get(tabId)
    await startSession(tab)
  } catch {
    // tab may have been closed
  }
})

chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (!tab.active) return
  if (changeInfo.url || changeInfo.title) {
    const session = await getCurrentSession()
    if (session && (session.url !== tab.url || session.title !== tab.title)) {
      await endSession()
      await startSession(tab)
    } else if (!session) {
      await startSession(tab)
    }
  }
})

chrome.tabs.onRemoved.addListener(async tabId => {
  const session = await getCurrentSession()
  if (session && session.tabId === tabId) {
    await endSession()
  }
})

chrome.windows.onFocusChanged.addListener(async windowId => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await endSession()
    return
  }
  try {
    const tabs = await chrome.tabs.query({ active: true, windowId })
    if (tabs.length > 0) {
      await endSession()
      await startSession(tabs[0])
    }
  } catch {
    // ignore
  }
})

chrome.idle.setDetectionInterval(60)
chrome.idle.onStateChanged.addListener(async state => {
  if (state === 'idle' || state === 'locked') {
    await endSession()
  } else if (state === 'active') {
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })
      if (tabs.length > 0) await startSession(tabs[0])
    } catch {
      // ignore
    }
  }
})

async function buildContextMenu(): Promise<void> {
  chrome.contextMenus.removeAll()
  const categories = await getCategories()

  chrome.contextMenus.create({
    id: 'trail-save-parent',
    title: 'Save to Trail',
    contexts: ['selection']
  })

  for (const cat of categories) {
    chrome.contextMenus.create({
      id: `trail-cat-${cat.id}`,
      parentId: 'trail-save-parent',
      title: cat.name,
      contexts: ['selection']
    })
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await getSettings() // ensure defaults are initialised
  await buildContextMenu()

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tabs.length > 0) await startSession(tabs[0])
  } catch {
    // ignore
  }
})

chrome.runtime.onStartup.addListener(async () => {
  await buildContextMenu()
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tabs.length > 0) await startSession(tabs[0])
  } catch {
    // ignore
  }
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const menuId = info.menuItemId as string
  if (!menuId.startsWith('trail-cat-')) return
  if (!info.selectionText?.trim()) return

  const categoryId = menuId.replace('trail-cat-', '')
  const url = tab?.url || ''
  const domain = getDomain(url) || url

  const item: SavedText = {
    id: `saved-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: info.selectionText.trim(),
    url,
    domain,
    title: tab?.title || domain,
    savedAt: Date.now(),
    categoryId
  }

  await saveText(item)
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'OPEN_DASHBOARD') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/dashboard/index.html')
    })
    sendResponse({ ok: true })
  }
  if (message?.type === 'REBUILD_CONTEXT_MENU') {
    buildContextMenu().then(() => sendResponse({ ok: true }))
    return true
  }
  return true
})
