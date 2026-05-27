import {
  saveVisit,
  getSettings,
  getCurrentSession,
  setCurrentSession
} from '../lib/storage'
import type { Visit, CurrentSession } from '../lib/types'

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

chrome.runtime.onInstalled.addListener(async () => {
  await getSettings() // ensure defaults are initialised

  // Start tracking the currently active tab on install / update
  try {
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true
    })
    if (tabs.length > 0) await startSession(tabs[0])
  } catch {
    // ignore
  }
})

chrome.runtime.onStartup.addListener(async () => {
  try {
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true
    })
    if (tabs.length > 0) await startSession(tabs[0])
  } catch {
    // ignore
  }
})

// Optional: open dashboard with keyboard shortcut handler
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'OPEN_DASHBOARD') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/dashboard/index.html')
    })
    sendResponse({ ok: true })
  }
  return true
})
