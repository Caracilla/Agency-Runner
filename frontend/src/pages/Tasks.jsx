import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, X, Loader2 } from 'lucide-react'
import { tasksApi, membersApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import TaskCard from '../components/TaskCard'
import Modal from '../components/Modal'
import MemberAvatar from '../components/MemberAvatar'

const COLUMNS = [
  { key: 'todo', label: 'Bekliyor', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  { key: 'in_progress', label: 'Devam Ediyor', color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
  { key: 'completed', label: 'Tamamlandı', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  { key: 'blocked', label: 'Engellendi', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
]

const PRIORITIES = [
  { value: '', label: 'Tüm Öncelikler' },
  { value: 'urgent', label: 'Acil' },
  { value: 'high', label: 'Yüksek' },
  { value: 'medium', label: 'Orta' },
  { value: 'low', label: 'Düşük' },
]

export default function Tasks() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterMember, setFilterMember] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium', status: 'todo',
    current_owner_id: '', due_date: '', memberIds: []
  })

  const loadData = () => {
    setLoading(true)
    Promise.all([tasksApi.getAll(), membersApi.getAll()])
      .then(([tRes, mRes]) => { setTasks(tRes.data); setMembers(mRes.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    if (filterPriority && t.priority !== filterPriority) return false
    return true
  })

  const byStatus = (status) => filtered.filter(t => t.status === status)

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const { data } = await tasksApi.create({
        ...form,
        current_owner_id: form.current_owner_id || null,
        memberIds: form.memberIds,
      })
      setShowModal(false)
      setForm({ title: '', description: '', priority: 'medium', status: 'todo', current_owner_id: '', due_date: '', memberIds: [] })
      navigate(`/tasks/${data.id}`)
    } catch (err) {
      alert(err.response?.data?.error || 'Hata oluştu')
      setSaving(false)
    }
  }

  const toggleMember = (id) => {
    setForm(f => ({
      ...f,
      memberIds: f.memberIds.includes(id) ? f.memberIds.filter(x => x !== id) : [...f.memberIds, id]
    }))
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-indigo-400" size={32} /></div>
  }

  return (
    <div className="p-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Görevler</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tasks.length} görev</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Yeni Görev
        </button>
      </div>

      {/* Filtreler */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Görev ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-44" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        {(search || filterPriority) && (
          <button onClick={() => { setSearch(''); setFilterPriority('') }} className="btn-secondary flex items-center gap-1">
            <X size={14} /> Temizle
          </button>
        )}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map(col => {
          const colTasks = byStatus(col.key)
          return (
            <div key={col.key} className="min-h-96">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${col.color} mb-3`}>
                <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                <span className="font-medium text-sm">{col.label}</span>
                <span className="ml-auto text-xs font-semibold opacity-70">{colTasks.length}</span>
              </div>
              <div className="space-y-3">
                {colTasks.map(t => <TaskCard key={t.id} task={t} />)}
              </div>
              {colTasks.length === 0 && (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                  <p className="text-gray-400 text-xs">Görev yok</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Yeni Görev Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Yeni Görev" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Görev Başlığı *</label>
            <input className="input" placeholder="Görev başlığı..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
          </div>
          <div>
            <label className="label">Açıklama</label>
            <textarea className="input resize-none" rows={3} placeholder="Açıklama..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Öncelik</label>
              <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">Düşük</option>
                <option value="medium">Orta</option>
                <option value="high">Yüksek</option>
                <option value="urgent">Acil</option>
              </select>
            </div>
            <div>
              <label className="label">Durum</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="todo">Bekliyor</option>
                <option value="in_progress">Devam Ediyor</option>
                <option value="blocked">Engellendi</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Görev Sahibi</label>
              <select className="input" value={form.current_owner_id} onChange={e => setForm(f => ({ ...f, current_owner_id: e.target.value }))}>
                <option value="">Seçiniz</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Bitiş Tarihi</label>
              <input className="input" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
          {members.length > 0 && (
            <div>
              <label className="label">Üyeler</label>
              <div className="flex flex-wrap gap-2">
                {members.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMember(m.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all ${
                      form.memberIds.includes(m.id)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <MemberAvatar name={m.name} color={m.avatar_color} size="xs" />
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving || !form.title.trim()} className="btn-primary flex-1">
              {saving ? 'Oluşturuluyor...' : 'Görev Oluştur'}
            </button>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">İptal</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
