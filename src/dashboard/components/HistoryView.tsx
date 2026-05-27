import { useMemo, useState } from 'react'
import type { Visit } from '../../lib/types'
import {
  searchVisits,
  groupVisitsByDay,
  formatDuration,
  formatTimestamp,
  getFaviconUrl
} from '../../lib/analytics'

type DateFilter = 'all' | 'today' | 'week' | 'month'
type SortBy = 'recent' | 'duration'

export function HistoryView({ visits }: { visits: Visit[] }) {
  const [query, setQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('recent')

  const filtered = useMemo(() => {
    let result = visits

    if (dateFilter !== 'all') {
      const now = Date.now()
      const cutoff =
        dateFilter === 'today'
          ? new Date(new Date().setHours(0, 0, 0, 0)).getTime()
          : dateFilter === 'week'
          ? now - 7 * 24 * 60 * 60 * 1000
          : now - 30 * 24 * 60 * 60 * 1000
      result = result.filter(v => v.startTime >= cutoff)
    }

    result = searchVisits(result, query)

    if (sortBy === 'recent') {
      result = [...result].sort((a, b) => b.startTime - a.startTime)
    } else {
      result = [...result].sort((a, b) => b.duration - a.duration)
    }

    return result
  }, [visits, query, dateFilter, sortBy])

  const grouped = useMemo(() => groupVisitsByDay(filtered), [filtered])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">History</h2>
        <span className="text-sm text-gray-500">
          {filtered.length.toLocaleString()} result
          {filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <svg
              className="w-4 h-4 absolute left-3 top-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-4.35-4.35M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0z"
              />
            </svg>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search URLs, titles, domains…"
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value as DateFilter)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortBy)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="recent">Most recent</option>
            <option value="duration">Longest time</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-gray-400">No visits match your search.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([day, dayVisits]) => (
            <div
              key={day}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden"
            >
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="text-sm font-medium text-gray-700">{day}</div>
                <div className="text-xs text-gray-500">
                  {dayVisits.length} visits ·{' '}
                  {formatDuration(
                    dayVisits.reduce((s, v) => s + v.duration, 0)
                  )}
                </div>
              </div>
              <ul className="divide-y divide-gray-100">
                {dayVisits.slice(0, 100).map(v => (
                  <li
                    key={v.id}
                    className="px-5 py-3 hover:bg-gray-50 transition flex items-center gap-3"
                  >
                    <img
                      src={getFaviconUrl(v.domain, 16)}
                      alt=""
                      className="w-4 h-4 rounded-sm flex-shrink-0"
                      onError={e => {
                        ;(e.target as HTMLImageElement).style.visibility =
                          'hidden'
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <a
                        href={v.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-900 hover:text-blue-600 truncate block"
                        title={v.title}
                      >
                        {v.title || v.url}
                      </a>
                      <div className="text-xs text-gray-500 truncate">
                        {v.url}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-medium text-gray-900">
                        {formatDuration(v.duration)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTimestamp(v.startTime)}
                      </div>
                    </div>
                  </li>
                ))}
                {dayVisits.length > 100 && (
                  <li className="px-5 py-2 text-xs text-gray-500 text-center bg-gray-50">
                    Showing first 100 of {dayVisits.length} visits
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
