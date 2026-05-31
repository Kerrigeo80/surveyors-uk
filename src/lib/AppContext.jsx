import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { INITIAL_USERS, INITIAL_REQUESTS } from './data.js'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [users, setUsers] = useState(INITIAL_USERS)
  const [requests, setRequests] = useState(INITIAL_REQUESTS)
  const [currentUser, setCurrentUser] = useState(null)
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type) => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  const register = useCallback((data) => {
    if (users.find(u => u.email === data.email)) {
      showToast('An account with that email already exists', 'error')
      return false
    }
    const newUser = { id: 'user-' + Date.now(), ...data }
    setUsers(u => [...u, newUser])
    setCurrentUser(newUser)
    showToast('Account created successfully!', 'success')
    return true
  }, [users, showToast])

  const login = useCallback((email, password) => {
    const user = users.find(u => u.email === email && u.password === password)
    if (!user) {
      showToast('Invalid email or password', 'error')
      return null
    }
    setCurrentUser(user)
    showToast('Welcome back, ' + user.name + '!', 'success')
    return user
  }, [users, showToast])

  const demoLogin = useCallback((role) => {
    const user = role === 'surveyor' ? users[0] : users[3]
    setCurrentUser(user)
    showToast('Signed in as ' + user.name, 'success')
    return user
  }, [users, showToast])

  const logout = useCallback(() => {
    setCurrentUser(null)
    showToast('Signed out')
  }, [showToast])

  const updateCurrentUser = useCallback((patch) => {
    setCurrentUser(u => {
      if (!u) return u
      const updated = { ...u, ...patch }
      setUsers(list => list.map(x => x.id === u.id ? updated : x))
      return updated
    })
  }, [])

  const addDocument = useCallback((doc) => {
    setCurrentUser(u => {
      if (!u) return u
      const docs = [...(u.documents || []), doc]
      const updated = { ...u, documents: docs }
      setUsers(list => list.map(x => x.id === u.id ? updated : x))
      return updated
    })
  }, [])

  const createRequest = useCallback((req) => {
    setRequests(r => [...r, req])
    showToast('Survey request published!', 'success')
  }, [showToast])

  const closeRequest = useCallback((reqId) => {
    setRequests(r => r.map(x => x.id === reqId ? { ...x, status: 'closed' } : x))
    showToast('Request closed')
  }, [showToast])

  const toggleInterest = useCallback((reqId) => {
    if (!currentUser) return
    setRequests(r => r.map(x => {
      if (x.id !== reqId) return x
      const has = x.interests.includes(currentUser.id)
      return {
        ...x,
        interests: has ? x.interests.filter(i => i !== currentUser.id) : [...x.interests, currentUser.id],
      }
    }))
    const wasInterested = requests.find(r => r.id === reqId)?.interests.includes(currentUser.id)
    showToast(
      wasInterested ? 'Interest withdrawn' : 'Interest expressed! The council will be notified.',
      wasInterested ? undefined : 'success'
    )
  }, [currentUser, requests, showToast])

  const value = useMemo(() => ({
    users, requests, currentUser, toasts,
    register, login, demoLogin, logout, updateCurrentUser,
    addDocument, createRequest, closeRequest, toggleInterest,
    showToast,
  }), [users, requests, currentUser, toasts, register, login, demoLogin, logout, updateCurrentUser, addDocument, createRequest, closeRequest, toggleInterest, showToast])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
