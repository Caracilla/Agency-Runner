export default function MemberAvatar({ name, color, size = 'md', showName = false, className = '' }) {
  const sizes = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' }
  const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 ring-2 ring-white`}
        style={{ backgroundColor: color || '#6366f1' }}
        title={name}
      >
        {initials}
      </div>
      {showName && <span className="text-sm font-medium text-gray-700">{name}</span>}
    </div>
  )
}
