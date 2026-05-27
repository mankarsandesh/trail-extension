import { useEffect, useState } from 'react'
import {
  getSettings,
  saveSettings,
  clearVisits,
  exportAllData,
  importData
} from '../../lib/storage'
import type { Settings } from '../../lib/types'

export function SettingsView({ onChange }: { onChange: () => void }) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [newExclude, setNewExclude] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  if (!settings) return null

  const update = async (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    await saveSettings(patch)
    setStatus('Saved')
    setTimeout(() => setStatus(''), 1500)
  }

  const addExclude = async () => {
    const domain = newExclude.trim().toLowerCase()
    if (!domain) return
    if (settings.excludedDomains.includes(domain)) {
      setNewExclude('')
      return
    }
    await update({
      excludedDomains: [...settings.excludedDomains, domain]
    })
    setNewExclude('')
  }

  const removeExclude = async (domain: string) => {
    await update({
      excludedDomains: settings.excludedDomains.filter(d => d !== domain)
    })
  }

  const handleExport = async () => {
    const json = await exportAllData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trail-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      await importData(text)
      setStatus('Imported')
      onChange()
      setTimeout(() => setStatus(''), 1500)
    } catch {
      setStatus('Import failed — invalid file')
      setTimeout(() => setStatus(''), 3000)
    }
  }

  const handleClear = async () => {
    if (
      !confirm(
        'Clear all browsing data? This deletes all visits Trail has recorded. Cannot be undone.'
      )
    )
      return
    await clearVisits()
    setStatus('All data cleared')
    onChange()
    setTimeout(() => setStatus(''), 1500)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Settings</h2>
        {status && (
          <span className="text-sm text-green-600 font-medium">{status}</span>
        )}
      </div>

      <Section title="Excluded domains" description="Trail won't track these sites.">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newExclude}
            onChange={e => setNewExclude(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addExclude()}
            placeholder="e.g. mail.google.com"
            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addExclude}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md"
          >
            Add
          </button>
        </div>
        {settings.excludedDomains.length === 0 ? (
          <div className="text-sm text-gray-400">No excluded domains.</div>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {settings.excludedDomains.map(d => (
              <li
                key={d}
                className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm"
              >
                <span>{d}</span>
                <button
                  onClick={() => removeExclude(d)}
                  className="text-gray-500 hover:text-red-600"
                  title="Remove"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Tracking"
        description="How Trail decides you've stopped browsing."
      >
        <label className="flex items-center justify-between py-2">
          <div>
            <div className="text-sm font-medium text-gray-900">
              Idle threshold
            </div>
            <div className="text-xs text-gray-500">
              Stop the timer after this many seconds without activity.
            </div>
          </div>
          <select
            value={settings.idleThresholdSeconds}
            onChange={e =>
              update({ idleThresholdSeconds: Number(e.target.value) })
            }
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm"
          >
            <option value={30}>30 seconds</option>
            <option value={60}>1 minute</option>
            <option value={120}>2 minutes</option>
            <option value={300}>5 minutes</option>
          </select>
        </label>

        <label className="flex items-center justify-between py-2">
          <div>
            <div className="text-sm font-medium text-gray-900">
              Track incognito
            </div>
            <div className="text-xs text-gray-500">
              Off by default for privacy.
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.trackIncognito}
            onChange={e => update({ trackIncognito: e.target.checked })}
            className="h-4 w-4"
          />
        </label>

        <label className="flex items-center justify-between py-2">
          <div>
            <div className="text-sm font-medium text-gray-900">
              Keep data for
            </div>
            <div className="text-xs text-gray-500">
              Older visits are auto-deleted.
            </div>
          </div>
          <select
            value={settings.retentionDays}
            onChange={e => update({ retentionDays: Number(e.target.value) })}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm"
          >
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={180}>6 months</option>
            <option value={365}>1 year</option>
          </select>
        </label>
      </Section>

      <Section title="Data" description="Your data is stored locally only.">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm font-medium rounded-md"
          >
            Export JSON
          </button>
          <label className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm font-medium rounded-md cursor-pointer">
            Import JSON
            <input
              type="file"
              accept="application/json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium rounded-md"
          >
            Clear all data
          </button>
        </div>
      </Section>
    </div>
  )
}

function Section({
  title,
  description,
  children
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-0.5 mb-4">{description}</p>
      {children}
    </div>
  )
}
