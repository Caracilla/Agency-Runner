import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Clock, CheckCircle, AlertTriangle, Plus } from 'lucide-react'
import { statsApi, tasksApi, membersApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import TaskCard from '../components/TaskCard'
import MemberAvatar from '../components/MemberAvatar'
import StatusBadge from '../components/StatusBadge'

export default function Dashboard() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [recentTasks, setRecentTasks] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([statsApi.get(), tasksApi.getAll(), membersApi.getAll()])
      .then(([sRes, tRes, mRes]) => {
        setStats(sRes.data)
        setRecentTasks(tRes.data.slice(0, 6))
        setMembers(mRes.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const statCards = stats
    ? [
        { label: 'Toplam Görev', value: stats.total_tasks, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Devam Ediyor', value: stats.in_progress, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Tamamlandı', value: stats.completed, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Acil Görev', value: stats.urgent_tasks, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
      ]
    : []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Merhaba, {currentUser?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 mt-1">İşte ekibinizin genel durumu</p>
        </div>
        <button onClick={() => navigate('/tasks')} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Yeni Görev
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
                <Icon size={20} className={color} />
              </div>
              <span className="text-3xl font-bold text-gray-900">{value}</span>
            </div>
            <p className="text-sm text-gray-500 font-medium">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Son Görevler */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 text-lg">Son Görevler</h2>
            <button onClick={() => navigate('/tasks')} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              Tümünü gör →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {recentTasks.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
          {recentTasks.length === 0 && (
            <div className="card p-10 text-center">
              <p className="text-gray-400 mb-4">Henüz görev yok</p>
              <button onClick={() => navigate('/tasks')} className="btn-primary">
                İlk Görevi Oluştur
              </button>
            </div>
          )}
        </div>

        {/* Ekip */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 text-lg">Ekip</h2>
            <button onClick={() => navigate('/members')} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              Tümünü gör →
            </button>
          </div>
          <div className="space-y-2">
            {members.map(m => (
              <button
                key={m.id}
                onClick={() => navigate(`/members/${m.id}`)}
                className="card w-full flex items-center gap-3 p-3 hover:shadow-md transition-all text-left group"
              >
                <MemberAvatar name={m.name} color={m.avatar_color} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600">
                    {m.name}
                  </p>
                  <p className="text-xs text-gray-500">{m.role || 'Üye'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-700">{m.active_task_count || 0}</p>
                  <p className="text-xs text-gray-400">aktif</p>
                </div>
              </button>
            ))}
            {members.length === 0 && (
              <div className="card p-6 text-center">
                <p className="text-gray-400 text-sm mb-3">Henüz üye yok</p>
                <button onClick={() => navigate('/members')} className="btn-primary text-sm">
                  Üye Ekle
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
