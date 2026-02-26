const config = {
  urgent: { label: 'Acil', classes: 'bg-red-100 text-red-700 border border-red-200', dot: 'bg-red-500' },
  high:   { label: 'Yüksek', classes: 'bg-orange-100 text-orange-700 border border-orange-200', dot: 'bg-orange-500' },
  medium: { label: 'Orta', classes: 'bg-blue-100 text-blue-700 border border-blue-200', dot: 'bg-blue-500' },
  low:    { label: 'Düşük', classes: 'bg-gray-100 text-gray-600 border border-gray-200', dot: 'bg-gray-400' },
}

export default function PriorityBadge({ priority, size = 'sm' }) {
  const c = config[priority] || config.medium
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${c.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}
