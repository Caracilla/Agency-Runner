const config = {
  todo:        { label: 'Bekliyor', classes: 'bg-gray-100 text-gray-600 border border-gray-200' },
  in_progress: { label: 'Devam Ediyor', classes: 'bg-indigo-100 text-indigo-700 border border-indigo-200' },
  completed:   { label: 'Tamamlandı', classes: 'bg-green-100 text-green-700 border border-green-200' },
  blocked:     { label: 'Engellendi', classes: 'bg-red-100 text-red-700 border border-red-200' },
}

export default function StatusBadge({ status }) {
  const c = config[status] || config.todo
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.classes}`}>
      {c.label}
    </span>
  )
}
