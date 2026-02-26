import { useState, useEffect, useCallback } from 'react'
import { Plus, ExternalLink, Trash2, Edit2, Check, X, Link, FileText, Loader2 } from 'lucide-react'
import { attachmentsApi } from '../api'
import { useAuth } from '../contexts/AuthContext'

// Dosya tipine göre ikon + renk + etiket
const FILE_TYPE_CONFIG = {
  'google-doc': {
    label: 'Google Döküman',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <rect width="24" height="24" rx="3" fill="#4285F4"/>
        <path d="M6 6h8v2H6V6zm0 3h8v2H6V9zm0 3h5v2H6v-2z" fill="white"/>
        <path d="M16 2l4 4v16H4V2h12zm0 0v4h4" stroke="white" strokeWidth="1.5" fill="none"/>
      </svg>
    ),
  },
  'google-sheet': {
    label: 'Google Tablo',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <rect width="24" height="24" rx="3" fill="#0F9D58"/>
        <path d="M6 8h12M6 12h12M6 16h12M12 6v12" stroke="white" strokeWidth="1.5"/>
      </svg>
    ),
  },
  'google-slides': {
    label: 'Google Slayt',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <rect width="24" height="24" rx="3" fill="#F4B400"/>
        <rect x="5" y="7" width="14" height="10" rx="1" fill="white" opacity="0.9"/>
        <rect x="8" y="10" width="8" height="1.5" rx="0.5" fill="#F4B400"/>
        <rect x="8" y="12.5" width="5" height="1.5" rx="0.5" fill="#F4B400"/>
      </svg>
    ),
  },
  'google-forms': {
    label: 'Google Form',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <rect width="24" height="24" rx="3" fill="#7248B9"/>
        <path d="M7 8h10M7 11h10M7 14h6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  'google-drive': {
    label: 'Google Drive',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <path d="M12 4L3 19h6l3-5.2L15 19h6L12 4z" fill="#4285F4"/>
        <path d="M3 19h6l3-5.2L15 19h6" fill="none" stroke="#0F9D58" strokeWidth="0.5"/>
        <path d="M9 14h6l3 5H6l3-5z" fill="#FBBC04" opacity="0.8"/>
      </svg>
    ),
  },
  'figma': {
    label: 'Figma',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <rect width="24" height="24" rx="3" fill="#1E1E1E"/>
        <circle cx="15" cy="12" r="3" fill="#1ABCFE"/>
        <path d="M9 3h6v6H9z" rx="3" fill="#F24E1E"/>
        <path d="M9 9h6v6H9z" fill="#FF7262"/>
        <path d="M9 15h6v6H9z" fill="#0ACF83"/>
      </svg>
    ),
  },
  'github': {
    label: 'GitHub',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-700',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1F2328">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
      </svg>
    ),
  },
  'notion': {
    label: 'Notion',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-700',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <rect width="24" height="24" rx="3" fill="white" stroke="#e5e7eb"/>
        <path d="M5 5h14v2H5V5zm0 4h10v2H5V9zm0 4h8v2H5v-2z" fill="#1F2328"/>
      </svg>
    ),
  },
  'miro': {
    label: 'Miro',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <rect width="24" height="24" rx="3" fill="#FFD02F"/>
        <text x="5" y="17" fontSize="11" fontWeight="bold" fill="#1F2328">M</text>
      </svg>
    ),
  },
  'pdf': {
    label: 'PDF',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    icon: () => <FileText className="w-5 h-5 text-red-500" />,
  },
  'image': {
    label: 'Görsel',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    text: 'text-pink-700',
    icon: () => <FileText className="w-5 h-5 text-pink-500" />,
  },
  'link': {
    label: 'Link',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-600',
    icon: () => <Link className="w-5 h-5 text-gray-400" />,
  },
}

function getConfig(fileType) {
  return FILE_TYPE_CONFIG[fileType] || FILE_TYPE_CONFIG['link']
}

export default function AttachmentsSection({ taskId }) {
  const { currentUser } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ url: '', name: '' })
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  const load = useCallback(() => {
    attachmentsApi.getByTask(taskId)
      .then(r => setItems(r.data))
      .finally(() => setLoading(false))
  }, [taskId])

  useEffect(() => { load() }, [load])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.url.trim()) return
    setSaving(true)
    try {
      await attachmentsApi.add(taskId, { url: form.url.trim(), name: form.name.trim() || undefined, added_by: currentUser?.id })
      setForm({ url: '', name: '' })
      setShowForm(false)
      load()
    } finally { setSaving(false) }
  }

  const handleRename = async (id) => {
    await attachmentsApi.update(id, { name: editName })
    setEditingId(null)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Bu dosya/link silinsin mi?')) return
    await attachmentsApi.delete(id)
    load()
  }

  // URL yapıştırıldığında otomatik tip etiketini göster
  const previewType = form.url ? getConfig(detectType(form.url)) : null

  function detectType(url) {
    const lower = url.toLowerCase()
    if (lower.includes('docs.google.com/document')) return 'google-doc'
    if (lower.includes('docs.google.com/spreadsheets')) return 'google-sheet'
    if (lower.includes('docs.google.com/presentation')) return 'google-slides'
    if (lower.includes('docs.google.com/forms')) return 'google-forms'
    if (lower.includes('drive.google.com')) return 'google-drive'
    if (lower.includes('figma.com')) return 'figma'
    if (lower.includes('github.com')) return 'github'
    if (lower.includes('notion.so')) return 'notion'
    if (lower.includes('miro.com')) return 'miro'
    if (/\.(pdf)$/i.test(url)) return 'pdf'
    if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)) return 'image'
    return 'link'
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-indigo-400" size={24} /></div>

  return (
    <div className="space-y-3">
      {/* Dosya listesi */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map(item => {
            const cfg = getConfig(item.file_type)
            const Icon = cfg.icon
            const isEditing = editingId === item.id

            return (
              <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border ${cfg.border} ${cfg.bg} group`}>
                <div className="flex-shrink-0">
                  <Icon />
                </div>
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="input text-sm py-1 flex-1"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleRename(item.id); if (e.key === 'Escape') setEditingId(null) }}
                        autoFocus
                      />
                      <button onClick={() => handleRename(item.id)} className="p-1 hover:bg-green-100 rounded-lg"><Check size={14} className="text-green-600" /></button>
                      <button onClick={() => setEditingId(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={14} className="text-gray-400" /></button>
                    </div>
                  ) : (
                    <>
                      <p className={`text-sm font-medium ${cfg.text} truncate`}>{item.name}</p>
                      <p className="text-xs text-gray-400 truncate">{item.url}</p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.text} bg-white/60`}>
                    {cfg.label}
                  </span>
                  <a href={item.url} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 hover:bg-white/80 rounded-lg transition-colors"
                    onClick={e => e.stopPropagation()}>
                    <ExternalLink size={13} className={cfg.text} />
                  </a>
                  {!isEditing && (
                    <button onClick={() => { setEditingId(item.id); setEditName(item.name) }}
                      className="p-1.5 hover:bg-white/80 rounded-lg transition-colors">
                      <Edit2 size={13} className="text-gray-400" />
                    </button>
                  )}
                  <button onClick={() => handleDelete(item.id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={13} className="text-gray-300 hover:text-red-500" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Link ekle formu */}
      {showForm ? (
        <form onSubmit={handleAdd} className="border-2 border-dashed border-indigo-300 rounded-xl p-4 space-y-3">
          <div>
            <label className="label">URL *</label>
            <input
              className="input font-mono text-sm"
              placeholder="https://docs.google.com/... veya figma.com/..."
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              autoFocus
            />
            {form.url && previewType && (
              <div className={`mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${previewType.bg} ${previewType.text} border ${previewType.border}`}>
                <previewType.icon />
                {previewType.label} olarak tanındı
              </div>
            )}
          </div>
          <div>
            <label className="label">Görünen Ad (opsiyonel)</label>
            <input
              className="input"
              placeholder="Boş bırakırsanız URL kullanılır"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving || !form.url.trim()} className="btn-primary">
              {saving ? 'Ekleniyor...' : 'Ekle'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setForm({ url: '', name: '' }) }} className="btn-secondary">
              İptal
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl p-3 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Plus size={16} /> Dosya / Link Ekle
        </button>
      )}

      {items.length === 0 && !showForm && (
        <p className="text-center text-sm text-gray-400 py-4">
          Google Drive, Figma, GitHub, Notion vb. linkleri buraya ekleyebilirsiniz
        </p>
      )}
    </div>
  )
}
