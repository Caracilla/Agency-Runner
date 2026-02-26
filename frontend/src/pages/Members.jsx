import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, Edit2, Trash2, Link2, Loader2 } from 'lucide-react'
import { membersApi } from '../api'
import MemberAvatar from '../components/MemberAvatar'
import Modal from '../components/Modal'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#f97316']

export default function Members() {
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [commonTasks, setCommonTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [form, setForm] = useState({ name: '', role: '', email: '', avatar_color: COLORS[0] })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([membersApi.getAll(), membersApi.getCommonTasks()])
      .then(([mRes, cRes]) => { setMembers(mRes.data); setCommonTasks(cRes.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditingMember(null)
    setForm({ name: '', role: '', email: '', avatar_color: COLORS[0] })
    setShowModal(true)
  }

  const openEdit = (e, member) => {
    e.stopPropagation()
    setEditingMember(member)
    setForm({ name: member.name, role: member.role || '', email: member.email || '', avatar_color: member.avatar_color })
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editingMember) await membersApi.update(editingMember.id, form)
      else await membersApi.create(form)
      setShowModal(false)
      load()
    } finally { setSaving(false) }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Bu üye silinsin mi? Atandığı görevlerden kaldırılacak.')) return
    await membersApi.delete(id)
    load()
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-indigo-400" size={32} /></div>

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Üyeler</h1>
          <p className="text-sm text-gray-500 mt-0.5">{members.length} kişi</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Üye Ekle
        </button>
      </div>

      {/* Üye kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-10">
        {members.map(m => (
          <div key={m.id} onClick={() => navigate(`/members/${m.id}`)}
            className="card p-5 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 group">
            <div className="flex items-start justify-between mb-4">
              <MemberAvatar name={m.name} color={m.avatar_color} size="lg" />
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={e => openEdit(e, m)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <Edit2 size={13} className="text-gray-400" />
                </button>
                <button onClick={e => handleDelete(e, m.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                  <Trash2 size={13} className="text-gray-300 hover:text-red-500" />
                </button>
              </div>
            </div>
            <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{m.name}</h3>
            {m.role && <p className="text-xs text-gray-500 mt-0.5">{m.role}</p>}
            {m.email && <p className="text-xs text-gray-400 mt-0.5 truncate">{m.email}</p>}
            <div className="flex gap-3 mt-4 pt-4 border-t border-gray-50">
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{m.task_count || 0}</p>
                <p className="text-xs text-gray-400">Görev</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-indigo-600">{m.active_task_count || 0}</p>
                <p className="text-xs text-gray-400">Aktif</p>
              </div>
            </div>
          </div>
        ))}
        {members.length === 0 && (
          <div className="col-span-4 card p-12 text-center">
            <Users size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 mb-4">Henüz üye yok</p>
            <button onClick={openNew} className="btn-primary mx-auto">İlk Üyeyi Ekle</button>
          </div>
        )}
      </div>

      {/* Ortak görevler */}
      {commonTasks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Link2 size={18} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900 text-lg">Ortak Görevler</h2>
          </div>
          <div className="space-y-3">
            {commonTasks.map((pair, i) => (
              <div key={i} className="card p-4 flex items-center gap-4">
                <div className="flex items-center">
                  <MemberAvatar name={pair.member1_name} color={pair.member1_color} size="sm" />
                  <MemberAvatar name={pair.member2_name} color={pair.member2_color} size="sm" className="-ml-2" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {pair.member1_name} &amp; {pair.member2_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{pair.task_titles}</p>
                </div>
                <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0">
                  {pair.common_task_count} ortak görev
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingMember ? 'Üyeyi Düzenle' : 'Yeni Üye'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Ad Soyad *</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div>
            <label className="label">Ünvan / Rol</label>
            <input className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
          </div>
          <div>
            <label className="label">E-posta</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="label">Avatar Rengi</label>
            <div className="flex gap-2 flex-wrap mt-1">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, avatar_color: c }))}
                  className={`w-8 h-8 rounded-full transition-transform ${form.avatar_color === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving || !form.name.trim()} className="btn-primary flex-1">
              {saving ? 'Kaydediliyor...' : editingMember ? 'Güncelle' : 'Ekle'}
            </button>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">İptal</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
