import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const STORAGE_KEY = 'agency_runner_user'

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = (member) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(member))
    setCurrentUser(member)
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setCurrentUser(null)
  }

  // Üye bilgisi güncellendiğinde (isim, renk vb.) local storage'ı da güncelle
  const refreshUser = (updatedMember) => {
    if (currentUser && currentUser.id === updatedMember.id) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMember))
      setCurrentUser(updatedMember)
    }
  }

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
