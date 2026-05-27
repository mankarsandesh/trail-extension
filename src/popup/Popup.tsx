import { useEffect, useState } from 'react'
import { getVisits } from '../lib/storage'
import {
  filterByDateRange,
  todayRange,
  weekRange,
  groupByDomain,
  totalTime,
  formatDuration,
  getFaviconUrl
} from '../lib/analytics'
import type { Visit } from '../lib/types'

export function Popup() {
  const [allVisits, setAllVisits] = useState<Visit[]>([])
  const [range, setRange] = useState<'today' | 'week'>('today')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getVisits().then(v => {
      setAllVisits(v)
      setLoading(false)
    })
  }, [])

  const { from, to } = range === 'today' ? todayRange() : weekRange()
  const visits = filterByDateRange(allVisits, from, to)
  const total = totalTime(visits)
  const topSites = groupByDomain(visits).slice(0, 5)

  const openDashboard = () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/dashboard/index.html')
    })
  }

  return (
    <div className="w-80 bg-white">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">T</span>
          </div>
          <span className="font-semibold text-gray-900">Trail</span>
        </div>
        <div className="flex bg-gray-100 rounded-md p-0.5 text-xs">
          <button
            onClick={() => setRange('today')}
            className={`px-2 py-1 rounded ${
              range === 'today'
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setRange('week')}
            className={`px-2 py-1 rounded ${
              range === 'week'
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500'
            }`}
          >
            Week
          </button>
        </div>
      </div>

      <div className="px-4 py-5">
        <div className="text-xs text-gray-500 uppercase tracking-wide">
          Time on web
        </div>
        <div className="text-3xl font-bold text-gray-900 mt-1">
          {loading ? '…' : formatDuration(total)}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {visits.length} visit{visits.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Top sites
        </div>
        {topSites.length === 0 ? (
          <div className="text-sm text-gray-400 py-4 text-center">
            No data yet — start browsing!
          </div>
        ) : (
          <ul className="space-y-2">
            {topSites.map(d => (
              <li
                key={d.domain}
                className="flex items-center gap-2 text-sm"
              >
                <img
                  src={getFaviconUrl(d.domain, 16)}
                  alt=""
                  className="w-4 h-4 rounded-sm flex-shrink-0"
                  onError={e => {
                    ;(e.target as HTMLImageElement).style.visibility = 'hidden'
                  }}
                />
                <span className="truncate flex-1 text-gray-700">
                  {d.domain}
                </span>
                <span className="text-gray-500 text-xs font-medium">
                  {formatDuration(d.totalTime)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="px-4 py-3 border-t border-gray-100">
        <button
          onClick={openDashboard}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-md transition"
        >
          Open Dashboard
        </button>
      </div>
    </div>
  )
}
