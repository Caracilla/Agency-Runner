import { useNavigate } from 'react-router-dom'
import { Calendar, Users, Layers } from 'lucide-react'
import MemberAvatar from './MemberAvatar'
import PriorityBadge from './PriorityBadge'

export default function TaskCard({ task }) {
  const navigate = useNavigate()
  const progress = task.stage_count > 0 ? Math.round((task.completed_stages / task.stage_count) * 100) : null

  return (
    <div
      onClick={() => navigate(`/tasks/${task.id}`)}
      className="card p-4 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-medium text-gray-900 text-sm group-hover:text-indigo-600 transition-colors line-clamp-2 flex-1">
          {task.title}
        </h3>
        <PriorityBadge priority={task.priority} />
      </div>

      {task.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{task.description}</p>
      )}

      {progress !== null && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Aşama ilerlemesi</span>
            <span>{task.completed_stages}/{task.stage_count}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {task.member_count > 0 && (
            <span className="flex items-center gap-1">
              <Users size={12} /> {task.member_count}
            </span>
          )}
          {task.stage_count > 0 && (
            <span className="flex items-center gap-1">
              <Layers size={12} /> {task.stage_count}
            </span>
          )}
          {task.due_date && (
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {new Date(task.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
        {task.owner_name && (
          <MemberAvatar name={task.owner_name} color={task.owner_color} size="xs" />
        )}
      </div>
    </div>
  )
}
