import { useEffect, useState, useMemo } from 'react'
import { getVisits } from '../lib/storage'
import type { Visit } from '../lib/types'
import { StatsOverview } from './components/StatsOverview'
import { HistoryView } from './components/HistoryView'
import { SitesView } from './components/SitesView'
import { SettingsView } from './components/SettingsView'
import { SavedView } from './components/SavedView'

type Tab = 'overview' | 'history' | 'sites' | 'saved' | 'settings'

export function Dashboard() {
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')

  const loadData = async () => {
    setLoading(true)
    const v = await getVisits()
    setVisits(v)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const tabs: { id: Tab; label: string }[] = useMemo(
    () => [
      { id: 'overview', label: 'Overview' },
      { id: 'history', label: 'History' },
      { id: 'sites', label: 'Sites' },
      { id: 'saved', label: 'Saved' },
      { id: 'settings', label: 'Settings' }
    ],
    []
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white text-lg font-bold">T</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Trail</h1>
              <p className="text-xs text-gray-500">Your browsing, visualised</p>
            </div>
          </div>
          <nav className="flex gap-1">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                  tab === t.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-400">Loading your data…</div>
          </div>
        ) : (
          <>
            {tab === 'saved' ? (
              <SavedView />
            ) : visits.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                {tab === 'overview' && <StatsOverview visits={visits} />}
                {tab === 'history' && <HistoryView visits={visits} />}
                {tab === 'sites' && <SitesView visits={visits} />}
                {tab === 'settings' && <SettingsView onChange={loadData} />}
              </>
            )}
          </>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-6 text-center text-xs text-gray-400">
        Trail — all data stays on your device.
      </footer>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <div className="text-4xl mb-4">👋</div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Welcome to Trail
      </h2>
      <p className="text-gray-600 max-w-md mx-auto">
        Trail is now tracking your browsing time. Come back in a few minutes to
        see your insights, or open a few tabs to start filling up your
        dashboard.
      </p>
    </div>
  )
}
