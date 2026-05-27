import { useMemo, useState } from 'react'
import type { Visit, DomainStats } from '../../lib/types'
import {
  groupByDomain,
  formatDuration,
  formatTimestamp,
  getFaviconUrl
} from '../../lib/analytics'

type SortKey = 'time' | 'visits' | 'recent'

export function SitesView({ visits }: { visits: Visit[] }) {
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('time')
  const [selected, setSelected] = useState<DomainStats | null>(null)

  const domains = useMemo(() => {
    let list = groupByDomain(visits)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(d => d.domain.toLowerCase().includes(q))
    }
    if (sortBy === 'time') list = [...list].sort((a, b) => b.totalTime - a.totalTime)
    else if (sortBy === 'visits')
      list = [...list].sort((a, b) => b.visitCount - a.visitCount)
    else {
      list = [...list].sort((a, b) => {
        const aLast = Math.max(...a.visits.map(v => v.startTime))
        const bLast = Math.max(...b.visits.map(v => v.startTime))
        return bLast - aLast
      })
    }
    return list
  }, [visits, query, sortBy])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Sites</h2>
        <span className="text-sm text-gray-500">
          {domains.length} domain{domains.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row gap-3">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Filter domains…"
          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortKey)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="time">Sort by time</option>
          <option value="visits">Sort by visits</option>
          <option value="recent">Sort by recent</option>
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-5 py-3 font-medium">Site</th>
              <th className="px-5 py-3 font-medium text-right">Time</th>
              <th className="px-5 py-3 font-medium text-right">Visits</th>
              <th className="px-5 py-3 font-medium text-right">Avg session</th>
              <th className="px-5 py-3 font-medium text-right">Last visit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {domains.map(d => {
              const last = Math.max(...d.visits.map(v => v.startTime))
              return (
                <tr
                  key={d.domain}
                  onClick={() => setSelected(d)}
                  className="hover:bg-gray-50 cursor-pointer transition"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={getFaviconUrl(d.domain, 16)}
                        alt=""
                        className="w-4 h-4 rounded-sm flex-shrink-0"
                        onError={e => {
                          ;(e.target as HTMLImageElement).style.visibility =
                            'hidden'
                        }}
                      />
                      <span className="text-gray-900">{d.domain}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">
                    {formatDuration(d.totalTime)}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-600">
                    {d.visitCount}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-600">
                    {formatDuration(d.totalTime / d.visitCount)}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-500 text-xs">
                    {formatTimestamp(last)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <DomainDetail domain={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

function DomainDetail({
  domain,
  onClose
}: {
  domain: DomainStats
  onClose: () => void
}) {
  const sortedVisits = [...domain.visits].sort(
    (a, b) => b.startTime - a.startTime
  )
  const first = Math.min(...domain.visits.map(v => v.startTime))
  const last = Math.max(...domain.visits.map(v => v.startTime))

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={getFaviconUrl(domain.domain, 32)}
              alt=""
              className="w-6 h-6 rounded"
              onError={e => {
                ;(e.target as HTMLImageElement).style.visibility = 'hidden'
              }}
            />
            <h3 className="text-lg font-semibold text-gray-900">
              {domain.domain}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-gray-200">
          <Stat label="Total time" value={formatDuration(domain.totalTime)} />
          <Stat label="Visits" value={domain.visitCount.toString()} />
          <Stat
            label="Avg session"
            value={formatDuration(domain.totalTime / domain.visitCount)}
          />
          <Stat label="First visit" value={new Date(first).toLocaleDateString()} />
        </div>

        <div className="overflow-y-auto flex-1">
          <ul className="divide-y divide-gray-100">
            {sortedVisits.slice(0, 200).map(v => (
              <li key={v.id} className="px-6 py-3 flex items-center gap-3">
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
                  <div className="text-xs text-gray-500 truncate">{v.url}</div>
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
            {sortedVisits.length > 200 && (
              <li className="px-6 py-3 text-xs text-gray-500 text-center bg-gray-50">
                Showing first 200 of {sortedVisits.length} visits
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-base font-semibold text-gray-900 mt-0.5">{value}</div>
    </div>
  )
}
