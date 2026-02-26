import { useState, useEffect } from 'react'
import { Zap, Plus, UserCheck, Loader2 } from 'lucide-react'
import { membersApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import MemberAvatar from '../components/MemberAvatar'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#f97316']

export default function Login() {
  const { login } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ name: '', role: '', email: '', avatar_color: COLORS[0] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    membersApi.getAll()
      .then(r => setMembers(r.data))
      .catch(() => setError('Sunucuya bağlanılamadı. Backend çalışıyor mu?'))
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const { data } = await membersApi.create(form)
      login(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Bir hata oluştu')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex w-16 h-16 bg-indigo-600 rounded-2xl items-center justify-center mb-4 shadow-lg">
            <Zap size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Agency Runner</h1>
          <p className="text-gray-500 mt-2">Profil seçerek devam edin</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={32} className="animate-spin text-indigo-400" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {members.length > 0 && (
              <>
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                    <UserCheck size={18} className="text-indigo-500" />
                    Kim olduğunuzu seçin
                  </h2>
                </div>
                <ul className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                  {members.map(member => (
                    <li key={member.id}>
                      <button
                        onClick={() => login(member)}
                        className="w-full flex items-center gap-4 px-6 py-4 hover:bg-indigo-50 transition-colors text-left group"
                      >
                        <MemberAvatar name={member.name} color={member.avatar_color} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 group-hover:text-indigo-700">{member.name}</p>
                          {member.role && <p className="text-sm text-gray-500">{member.role}</p>}
                        </div>
                        <span className="text-xs text-gray-400 group-hover:text-indigo-500">
                          {member.task_count || 0} görev
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Yeni profil oluştur */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              {!showNew ? (
                <button
                  onClick={() => setShowNew(true)}
                  className="w-full flex items-center justify-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm py-2"
                >
                  <Plus size={18} />
                  {members.length === 0 ? 'İlk profili oluştur' : 'Yeni profil oluştur'}
                </button>
              ) : (
                <form onSubmit={handleCreate} className="space-y-3">
                  <p className="font-medium text-gray-700 text-sm mb-3">Yeni Profil</p>
                  <input
                    className="input"
                    placeholder="Ad Soyad *"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    autoFocus
                  />
                  <input
                    className="input"
                    placeholder="Ünvan / Rol (opsiyonel)"
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  />
                  <input
                    className="input"
                    placeholder="E-posta (opsiyonel)"
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                  {/* Renk seçici */}
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Avatar rengi</p>
                    <div className="flex gap-2 flex-wrap">
                      {COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, avatar_color: c }))}
                          className={`w-7 h-7 rounded-full transition-transform ${form.avatar_color === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-105'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="submit" disabled={saving || !form.name.trim()} className="btn-primary flex-1">
                      {saving ? 'Oluşturuluyor...' : 'Oluştur ve Giriş Yap'}
                    </button>
                    <button type="button" onClick={() => setShowNew(false)} className="btn-secondary">
                      İptal
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
