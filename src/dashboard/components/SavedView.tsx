import { useEffect, useState } from 'react'
import { getFaviconUrl } from '../../lib/analytics'
import {
  addCategory,
  clearSavedTexts,
  deleteCategory,
  deleteSavedText,
  getCategories,
  getSavedTexts
} from '../../lib/storage'
import type { SavedText, TextCategory } from '../../lib/types'
import { OTHER_CATEGORY } from '../../lib/types'

function formatDate(ms: number): string {
  const d = new Date(ms)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (isToday) return `Today, ${time}`
  if (isYesterday) return `Yesterday, ${time}`
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`
}

type Block =
  | { type: 'paragraph'; lines: string[] }
  | { type: 'bullet'; items: string[] }
  | { type: 'numbered'; items: string[] }

function parseBlocks(text: string): Block[] {
  const lines = text.split('\n')
  const blocks: Block[] = []
  let current: Block | null = null

  const flush = () => { if (current) { blocks.push(current); current = null } }

  for (const raw of lines) {
    const trimmed = raw.trim()

    if (!trimmed) { flush(); continue }

    if (/^[-*•]\s/.test(trimmed)) {
      const item = trimmed.replace(/^[-*•]\s+/, '')
      if (current?.type === 'bullet') current.items.push(item)
      else { flush(); current = { type: 'bullet', items: [item] } }
      continue
    }

    if (/^\d+[.)]\s/.test(trimmed)) {
      const item = trimmed.replace(/^\d+[.)]\s+/, '')
      if (current?.type === 'numbered') current.items.push(item)
      else { flush(); current = { type: 'numbered', items: [item] } }
      continue
    }

    if (current?.type === 'paragraph') current.lines.push(raw)
    else { flush(); current = { type: 'paragraph', lines: [raw] } }
  }

  flush()
  return blocks
}

function FormattedText({ text }: { text: string }) {
  const URL_RE = /https?:\/\/[^\s]+/g

  function renderInline(line: string) {
    const parts: React.ReactNode[] = []
    let last = 0
    let match: RegExpExecArray | null
    URL_RE.lastIndex = 0
    while ((match = URL_RE.exec(line)) !== null) {
      if (match.index > last) parts.push(line.slice(last, match.index))
      const href = match[0].replace(/[.,;)]+$/, '')
      parts.push(
        <a key={match.index} href={href} target="_blank" rel="noreferrer"
          className="text-blue-600 underline underline-offset-2 break-all hover:text-blue-800">
          {href}
        </a>
      )
      last = match.index + match[0].length
    }
    if (last < line.length) parts.push(line.slice(last))
    return parts
  }

  const blocks = parseBlocks(text)

  return (
    <div className="space-y-2 text-sm text-gray-800 leading-relaxed">
      {blocks.map((block, i) => {
        if (block.type === 'bullet') {
          return (
            <ul key={i} className="list-disc list-inside space-y-0.5 pl-1">
              {block.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
            </ul>
          )
        }
        if (block.type === 'numbered') {
          return (
            <ol key={i} className="list-decimal list-inside space-y-0.5 pl-1">
              {block.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
            </ol>
          )
        }
        return (
          <p key={i} className="text-gray-800">
            {block.lines.map((line, j) => (
              <span key={j}>
                {renderInline(line)}
                {j < block.lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

function CategoryBadge({ name, onDelete }: { name: string; onDelete?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
      {name}
      {onDelete && (
        <button
          onClick={onDelete}
          className="ml-0.5 text-blue-400 hover:text-red-500 transition-colors leading-none"
          title="Delete category"
        >
          ×
        </button>
      )}
    </span>
  )
}

export function SavedView() {
  const [items, setItems] = useState<SavedText[]>([])
  const [categories, setCategories] = useState<TextCategory[]>([])
  const [activeTab, setActiveTab] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [newCatName, setNewCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const load = async () => {
    const [data, cats] = await Promise.all([getSavedTexts(), getCategories()])
    setItems(data)
    setCategories(cats)
  }

  useEffect(() => { load() }, [])

  const rebuildMenu = () =>
    chrome.runtime.sendMessage({ type: 'REBUILD_CONTEXT_MENU' }).catch(() => {})

  const handleAddCategory = async () => {
    const name = newCatName.trim()
    if (!name) return
    await addCategory(name)
    setNewCatName('')
    setAddingCat(false)
    await load()
    rebuildMenu()
  }

  const handleDeleteCategory = async (id: string) => {
    await deleteCategory(id)
    if (activeTab === id) setActiveTab('all')
    await load()
    rebuildMenu()
  }

  const handleCopy = async (item: SavedText) => {
    await navigator.clipboard.writeText(item.text)
    setCopied(item.id)
    setTimeout(() => setCopied(null), 1500)
  }

  const handleDeleteItem = async (id: string) => {
    await deleteSavedText(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const handleClearAll = async () => {
    await clearSavedTexts()
    setItems([])
    setConfirmClear(false)
  }

  const filtered = items.filter(i => {
    const matchesTab = activeTab === 'all' || i.categoryId === activeTab
    const q = query.toLowerCase()
    const matchesSearch = !q ||
      i.text.toLowerCase().includes(q) ||
      i.title.toLowerCase().includes(q) ||
      i.domain.toLowerCase().includes(q)
    return matchesTab && matchesSearch
  })

  // Group by category when "All" is active
  const grouped: { category: TextCategory; items: SavedText[] }[] =
    activeTab === 'all'
      ? categories
          .map(cat => ({
            category: cat,
            items: filtered.filter(i => i.categoryId === cat.id)
          }))
          .filter(g => g.items.length > 0)
      : [{
          category: categories.find(c => c.id === activeTab) ?? OTHER_CATEGORY,
          items: filtered
        }]

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search saved text…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <span className="text-sm text-gray-400 whitespace-nowrap">{filtered.length} saved</span>
        {!confirmClear ? (
          <button onClick={() => setConfirmClear(true)} className="text-sm text-red-400 hover:text-red-600 whitespace-nowrap">
            Clear all
          </button>
        ) : (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-sm text-gray-500">Delete all?</span>
            <button onClick={handleClearAll} className="text-sm font-medium text-red-600 hover:text-red-800">Yes</button>
            <button onClick={() => setConfirmClear(false)} className="text-sm text-gray-400 hover:text-gray-600">No</button>
          </div>
        )}
      </div>

      {/* Category tabs + manage */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All{items.length > 0 && <span className="ml-1 opacity-70">({items.length})</span>}
            </button>
            {categories.map(cat => {
              const count = items.filter(i => i.categoryId === cat.id).length
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    activeTab === cat.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                  {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                </button>
              )
            })}
          </div>

          {/* Add / manage categories */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {addingCat ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  placeholder="Category name"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddCategory()
                    if (e.key === 'Escape') { setAddingCat(false); setNewCatName('') }
                  }}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={handleAddCategory} className="text-sm font-medium text-blue-600 hover:text-blue-800">Save</button>
                <button onClick={() => { setAddingCat(false); setNewCatName('') }} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setAddingCat(true)}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                <span className="text-lg leading-none">+</span> New category
              </button>
            )}
          </div>
        </div>

        {/* Category delete buttons (non-Other only) */}
        {categories.filter(c => c.id !== OTHER_CATEGORY.id).length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
            <span className="text-xs text-gray-400 self-center">Manage:</span>
            {categories
              .filter(c => c.id !== OTHER_CATEGORY.id)
              .map(cat => (
                <CategoryBadge
                  key={cat.id}
                  name={cat.name}
                  onDelete={() => handleDeleteCategory(cat.id)}
                />
              ))}
          </div>
        )}
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">No saved text yet</h2>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            Select any text on a webpage, right-click, choose{' '}
            <span className="font-medium text-gray-700">Save to Trail</span>, then pick a category.
          </p>
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">No results match your search.</div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ category, items: catItems }) => (
            <section key={category.id}>
              {/* Category heading */}
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-base font-semibold text-gray-800">{category.name}</h2>
                <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                  {catItems.length} {catItems.length === 1 ? 'item' : 'items'}
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Cards */}
              <div className="space-y-3">
                {catItems.map(item => (
                  <article key={item.id} className="bg-white rounded-xl border border-gray-200 p-5 group hover:border-gray-300 transition-colors">
                    {/* Text content — formatted and readable */}
                    <div className="mb-4">
                      <FormattedText text={item.text} />
                    </div>

                    {/* Footer row */}
                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 min-w-0 hover:opacity-70 transition-opacity"
                        title={item.url}
                      >
                        <img
                          src={getFaviconUrl(item.domain, 16)}
                          alt=""
                          className="w-4 h-4 rounded-sm flex-shrink-0"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                        <span className="text-xs text-gray-500 truncate max-w-xs">{item.title || item.domain}</span>
                      </a>

                      <div className="flex items-center gap-4 flex-shrink-0">
                        <span className="text-xs text-gray-400">{formatDate(item.savedAt)}</span>
                        <button
                          onClick={() => handleCopy(item)}
                          className="text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors"
                        >
                          {copied === item.id ? '✓ Copied' : 'Copy'}
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-xs text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
