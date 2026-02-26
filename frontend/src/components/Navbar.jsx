import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, CheckSquare, Users, Zap, LogOut, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import MemberAvatar from './MemberAvatar'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks', icon: CheckSquare, label: 'Görevler' },
  { to: '/members', icon: Users, label: 'Üyeler' },
]

export default function Navbar() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)

  const handleLogout = () => {
    setShowMenu(false)
    logout()
  }

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-sm leading-tight">Agency Runner</h1>
            <p className="text-xs text-gray-500">Görev Takip</p>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">Menü</p>
        <ul className="space-y-1">
          {links.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Kullanıcı profili */}
      {currentUser && (
        <div className="p-4 border-t border-gray-100 relative">
          <button
            onClick={() => setShowMenu(v => !v)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <MemberAvatar name={currentUser.name} color={currentUser.avatar_color} size="sm" />
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{currentUser.name}</p>
              {currentUser.role && <p className="text-xs text-gray-500 truncate">{currentUser.role}</p>}
            </div>
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
          </button>

          {showMenu && (
            <div className="absolute bottom-full left-4 right-4 mb-1 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
              <button
                onClick={() => { navigate(`/members/${currentUser.id}`); setShowMenu(false) }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Users size={15} />
                Profilim
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-50"
              >
                <LogOut size={15} />
                Çıkış Yap
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
