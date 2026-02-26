import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Layers, Link2, Loader2 } from 'lucide-react'
import { membersApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import MemberAvatar from '../components/MemberAvatar'
import TaskCard from '../components/TaskCard'
import PriorityBadge from '../components/PriorityBadge'
import StatusBadge from '../components/StatusBadge'

export default function MemberDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    membersApi.getById(id)
      .then(r => setMember(r.data))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-indigo-400" size={32} /></div>
  if (!member) return <div className="p-8 text-gray-500">Üye bulunamadı.</div>

  const isMe = currentUser?.id === member.id
  const tabs = ['Görevler', 'Aşamalar', 'İş Arkadaşları']

  const stageStatusConfig = {
    pending: { label: 'Bekliyor', cls: 'bg-gray-100 text-gray-600' },
    active: { label: 'Aktif', cls: 'bg-indigo-100 text-indigo-700' },
    completed: { label: 'Tamamlandı', cls: 'bg-green-100 text-green-700' },
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Başlık */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors">
        <ArrowLeft size={18} /> Geri
      </button>

      <div className="card p-6 mb-6">
        <div className="flex items-start gap-5">
          <MemberAvatar name={member.name} color={member.avatar_color} size="lg" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{member.name}</h1>
              {isMe && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Ben</span>}
            </div>
            {member.role && <p className="text-gray-500 mt-0.5">{member.role}</p>}
            {member.email && <p className="text-sm text-gray-400 mt-1">{member.email}</p>}
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{member.tasks?.length || 0}</p>
              <p className="text-xs text-gray-400 mt-0.5">Görev</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-600">{member.stages?.filter(s => s.status === 'active').length || 0}</p>
              <p className="text-xs text-gray-400 mt-0.5">Aktif Aşama</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{member.collaborators?.length || 0}</p>
              <p className="text-xs text-gray-400 mt-0.5">İş Arkadaşı</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 gap-1">
        {tabs.map((tab, i) => (
          <button key={tab} onClick={() => setActiveTab(i)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === i ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Görevler */}
      {activeTab === 0 && (
        <div>
          {member.tasks?.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {member.tasks.map(t => <TaskCard key={t.id} task={t} />)}
            </div>
          ) : (
            <div className="card p-10 text-center text-gray-400">
              <p>Atanmış görev yok</p>
            </div>
          )}
        </div>
      )}

      {/* Aşamalar */}
      {activeTab === 1 && (
        <div className="space-y-3">
          {member.stages?.length > 0 ? member.stages.map(s => {
            const sc = stageStatusConfig[s.status]
            return (
              <button key={s.id} onClick={() => navigate(`/tasks/${s.task_id}`)}
                className="card w-full p-4 flex items-center gap-4 hover:shadow-md transition-all text-left">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0`}
                  style={{ backgroundColor: s.status === 'completed' ? '#22c55e' : s.status === 'active' ? '#6366f1' : '#e5e7eb' }}>
                  <Layers size={14} className={s.status === 'pending' ? 'text-gray-500' : 'text-white'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{s.title}</p>
                  <p className="text-xs text-gray-500 truncate">{s.task_title}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${sc.cls}`}>
                  {sc.label}
                </span>
              </button>
            )
          }) : (
            <div className="card p-10 text-center text-gray-400">
              <p>Atanmış aşama yok</p>
            </div>
          )}
        </div>
      )}

      {/* İş Arkadaşları */}
      {activeTab === 2 && (
        <div className="space-y-3">
          {member.collaborators?.length > 0 ? member.collaborators.map(c => (
            <button key={c.id} onClick={() => navigate(`/members/${c.id}`)}
              className="card w-full flex items-center gap-4 p-4 hover:shadow-md transition-all text-left">
              <MemberAvatar name={c.name} color={c.avatar_color} size="md" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{c.name}</p>
                {c.role && <p className="text-xs text-gray-500">{c.role}</p>}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">
                <Link2 size={13} />
                <span className="font-semibold">{c.shared_task_count}</span>
                <span className="text-xs text-indigo-500">ortak</span>
              </div>
            </button>
          )) : (
            <div className="card p-10 text-center text-gray-400">
              <p>Ortak görev paylaşılan kişi yok</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
