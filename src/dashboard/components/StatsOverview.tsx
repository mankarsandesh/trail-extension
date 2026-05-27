import { useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import type { Visit } from '../../lib/types'
import {
  filterByDateRange,
  todayRange,
  weekRange,
  monthRange,
  groupByDomain,
  totalTime,
  formatDuration,
  hourlyDistribution,
  dailyTimeSeries,
  getFaviconUrl
} from '../../lib/analytics'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

type Range = 'today' | 'week' | 'month'

export function StatsOverview({ visits }: { visits: Visit[] }) {
  const [range, setRange] = useState<Range>('week')

  const { from, to } = useMemo(() => {
    if (range === 'today') return todayRange()
    if (range === 'week') return weekRange()
    return monthRange()
  }, [range])

  const filtered = useMemo(
    () => filterByDateRange(visits, from, to),
    [visits, from, to]
  )

  const total = totalTime(filtered)
  const domains = groupByDomain(filtered)
  const topByTime = domains.slice(0, 10)
  const topByVisits = [...domains]
    .sort((a, b) => b.visitCount - a.visitCount)
    .slice(0, 10)

  const days = range === 'today' ? 1 : range === 'week' ? 7 : 30
  const series = useMemo(
    () => dailyTimeSeries(filtered, days),
    [filtered, days]
  )

  const hourly = useMemo(() => hourlyDistribution(filtered), [filtered])
  const peakHour = hourly.indexOf(Math.max(...hourly))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Overview</h2>
        <div className="flex bg-white border border-gray-200 rounded-md p-0.5 text-sm">
          {(['today', 'week', 'month'] as Range[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded capitalize ${
                range === r
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Total time"
          value={formatDuration(total)}
          hint={`${range === 'today' ? 'today' : `last ${days} days`}`}
        />
        <StatCard
          label="Visits"
          value={filtered.length.toLocaleString()}
          hint="pages tracked"
        />
        <StatCard
          label="Unique sites"
          value={domains.length.toLocaleString()}
          hint="domains"
        />
        <StatCard
          label="Peak hour"
          value={`${peakHour}:00`}
          hint="busiest time of day"
        />
      </div>

      {days > 1 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">
            Time spent by day
          </h3>
          <div style={{ height: 240 }}>
            <Line
              data={{
                labels: series.map(p => p.date.slice(5)),
                datasets: [
                  {
                    label: 'Minutes',
                    data: series.map(p => Math.round(p.time / 1000 / 60)),
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: '#2563eb',
                    pointRadius: 3
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { callback: v => `${v}m` }
                  }
                }
              }}
            />
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-4">
          Hourly distribution (when you browse)
        </h3>
        <div style={{ height: 200 }}>
          <Bar
            data={{
              labels: Array.from({ length: 24 }, (_, i) => `${i}`),
              datasets: [
                {
                  label: 'Minutes',
                  data: hourly.map(ms => Math.round(ms / 1000 / 60)),
                  backgroundColor: '#3b82f6',
                  borderRadius: 4
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: { callback: v => `${v}m` }
                }
              }
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DomainList
          title="Top sites by time"
          items={topByTime.map(d => ({
            domain: d.domain,
            primary: formatDuration(d.totalTime),
            secondary: `${d.visitCount} visits`,
            value: d.totalTime,
            max: topByTime[0]?.totalTime || 1
          }))}
        />
        <DomainList
          title="Top sites by visit count"
          items={topByVisits.map(d => ({
            domain: d.domain,
            primary: `${d.visitCount} visits`,
            secondary: formatDuration(d.totalTime),
            value: d.visitCount,
            max: topByVisits[0]?.visitCount || 1
          }))}
        />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  hint
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="text-xs text-gray-500 uppercase tracking-wide">
        {label}
      </div>
      <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{hint}</div>
    </div>
  )
}

function DomainList({
  title,
  items
}: {
  title: string
  items: {
    domain: string
    primary: string
    secondary: string
    value: number
    max: number
  }[]
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-sm font-medium text-gray-500 mb-4">{title}</h3>
      {items.length === 0 ? (
        <div className="text-sm text-gray-400 py-4 text-center">No data</div>
      ) : (
        <ul className="space-y-3">
          {items.map(item => (
            <li key={item.domain} className="group">
              <div className="flex items-center gap-3">
                <img
                  src={getFaviconUrl(item.domain, 16)}
                  alt=""
                  className="w-4 h-4 rounded-sm flex-shrink-0"
                  onError={e => {
                    ;(e.target as HTMLImageElement).style.visibility = 'hidden'
                  }}
                />
                <span className="text-sm text-gray-700 truncate flex-1">
                  {item.domain}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {item.primary}
                </span>
              </div>
              <div className="ml-7 mt-1 flex items-center gap-2">
                <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{
                      width: `${(item.value / item.max) * 100}%`
                    }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-20 text-right">
                  {item.secondary}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
