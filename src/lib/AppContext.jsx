import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from './supabase.js'

const AppContext = createContext(null)

// Merge profile + role-specific row into the flat `currentUser` shape pages expect
function flattenProfile(profile, surveyor, council, landlord) {
  if (!profile) return null
  const base = {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    name: profile.name,
    status: profile.status,
  }
  if (profile.role === 'surveyor' && surveyor) {
    return {
      ...base,
      rics: surveyor.rics || '',
      region: surveyor.region || '',
      phone: surveyor.phone || '',
      bio: surveyor.bio || '',
      qualifications: surveyor.qualifications || [],
    }
  }
  if (profile.role === 'council' && council) {
    return {
      ...base,
      councilName: council.council_name || '',
      department: council.department || '',
      region: council.region || '',
      phone: council.phone || '',
      about: council.about || '',
    }
  }
  if (profile.role === 'landlord' && landlord) {
    return {
      ...base,
      businessName: landlord.business_name || '',
      landlordType: landlord.landlord_type || 'individual',
      region: landlord.region || '',
      address: landlord.address || '',
      phone: landlord.phone || '',
      about: landlord.about || '',
    }
  }
  return base
}

// Build the public `users` list pages expect (other surveyors visible to councils, etc.)
function buildUsersList(profiles, surveyors, councils, landlords, documentsBySurveyor, reviewsBySurveyor) {
  const survById = new Map(surveyors.map(s => [s.profile_id, s]))
  const counById = new Map(councils.map(c => [c.profile_id, c]))
  const landById = new Map(landlords.map(l => [l.profile_id, l]))
  return profiles.map(p => {
    if (p.role === 'surveyor') {
      const s = survById.get(p.id)
      const reviews = reviewsBySurveyor[p.id] || []
      return {
        id: p.id, role: 'surveyor', name: p.name, email: p.email,
        rics: s?.rics || '', region: s?.region || '',
        phone: s?.phone || '', bio: s?.bio || '',
        qualifications: s?.qualifications || [],
        documents: documentsBySurveyor[p.id] || [],
        reviews,
        reviewCount: reviews.length,
        rating: reviews.length
          ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
          : null,
      }
    }
    if (p.role === 'council') {
      const c = counById.get(p.id)
      return {
        id: p.id, role: 'council', name: p.name, email: p.email,
        councilName: c?.council_name || '', department: c?.department || '',
        region: c?.region || '', phone: c?.phone || '', about: c?.about || '',
      }
    }
    if (p.role === 'landlord') {
      const l = landById.get(p.id)
      return {
        id: p.id, role: 'landlord', name: p.name, email: p.email,
        businessName: l?.business_name || '', landlordType: l?.landlord_type || '',
        region: l?.region || '', address: l?.address || '',
        phone: l?.phone || '', about: l?.about || '',
      }
    }
    return { id: p.id, role: p.role, name: p.name, email: p.email }
  })
}

function mapRequest(r, quotesByRequest, currentUserId, reviewsByRequest) {
  const quotes = quotesByRequest[r.id] || []
  const myQuote = currentUserId ? quotes.find(q => q.surveyor_id === currentUserId) : null
  return {
    id: r.id,
    councilId: r.council_id,
    title: r.title,
    type: r.type,
    region: r.region,
    address: r.address,
    deadline: r.deadline,
    budget: r.budget,
    description: r.description,
    contact: r.contact,
    status: r.status,
    createdAt: r.created_at,
    awardedQuoteId: r.awarded_quote_id,
    quotes,
    myQuote,
    // The review left on this completed job, if any (one review per request)
    review: reviewsByRequest?.[r.id] || null,
    // Kept for backwards-compat with a few call sites; treat as quote count
    interests: quotes.map(q => q.surveyor_id),
  }
}

export function AppProvider({ children }) {
  const [session, setSession] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [users, setUsers] = useState([])
  const [requests, setRequests] = useState([])
  const [properties, setProperties] = useState([])
  const [notifications, setNotifications] = useState([])
  const [toasts, setToasts] = useState([])
  const [ready, setReady] = useState(false)
  const mountedRef = useRef(true)

  const showToast = useCallback((message, type) => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  // ── Load everything the current session can see ──
  const loadAll = useCallback(async (userId) => {
    if (!userId) {
      setCurrentUser(null); setUsers([]); setRequests([])
      return
    }
    const [
      { data: profile },
      { data: profiles },
      { data: surveyors },
      { data: councils },
      { data: landlords },
      { data: documents },
      { data: rawRequests },
      { data: quotes },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('profiles').select('*'),
      supabase.from('surveyors').select('*'),
      supabase.from('councils').select('*'),
      supabase.from('landlords').select('*'),
      supabase.from('credential_documents').select('*').order('created_at', { ascending: false }),
      supabase.from('survey_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('quotes').select('*').order('created_at', { ascending: true }),
    ])
    const [{ data: propertiesData }, { data: notificationsData }, { data: reviews }] = await Promise.all([
      supabase.from('properties').select('*').order('created_at', { ascending: false }),
      supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      supabase.from('reviews').select('*').order('created_at', { ascending: false }),
    ])

    if (!mountedRef.current) return

    const docsBySurv = {}
    ;(documents || []).forEach(d => {
      const arr = docsBySurv[d.surveyor_id] = docsBySurv[d.surveyor_id] || []
      arr.push({
        id: d.id, type: d.type, title: d.title, date: d.issue_date,
        fileName: d.file_name, filePath: d.file_path, status: d.status,
      })
    })

    const myProfile = profile || (profiles || []).find(p => p.id === userId) || null
    const mySurveyor = (surveyors || []).find(s => s.profile_id === userId) || null
    const myCouncil = (councils || []).find(c => c.profile_id === userId) || null
    const myLandlord = (landlords || []).find(l => l.profile_id === userId) || null
    const me = flattenProfile(myProfile, mySurveyor, myCouncil, myLandlord)
    if (me) me.documents = docsBySurv[me.id] || []

    const quotesByReq = {}
    ;(quotes || []).forEach(q => {
      const arr = quotesByReq[q.request_id] = quotesByReq[q.request_id] || []
      arr.push(q)
    })

    const reviewsBySurv = {}
    const reviewsByReq = {}
    ;(reviews || []).forEach(rv => {
      const arr = reviewsBySurv[rv.surveyor_id] = reviewsBySurv[rv.surveyor_id] || []
      arr.push(rv)
      reviewsByReq[rv.request_id] = rv
    })

    if (me && me.role === 'surveyor') {
      me.reviews = reviewsBySurv[me.id] || []
      me.reviewCount = me.reviews.length
      me.rating = me.reviews.length
        ? Math.round((me.reviews.reduce((sum, rv) => sum + rv.rating, 0) / me.reviews.length) * 10) / 10
        : null
    }

    setCurrentUser(me)
    setUsers(buildUsersList(profiles || [], surveyors || [], councils || [], landlords || [], docsBySurv, reviewsBySurv))
    setRequests((rawRequests || []).map(r => mapRequest(r, quotesByReq, userId, reviewsByReq)))
    setProperties(propertiesData || [])
    setNotifications(notificationsData || [])
  }, [])

  // ── Wire up auth session ──
  useEffect(() => {
    mountedRef.current = true
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      loadAll(data.session?.user?.id).finally(() => setReady(true))
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      loadAll(newSession?.user?.id)
    })
    return () => {
      mountedRef.current = false
      sub.subscription.unsubscribe()
    }
  }, [loadAll])

  // ── Realtime notifications — live bell updates without refocusing the tab ──
  useEffect(() => {
    const userId = currentUser?.id
    if (!userId) return
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          setNotifications(ns =>
            ns.some(n => n.id === payload.new.id) ? ns : [payload.new, ...ns].slice(0, 50)
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          setNotifications(ns => ns.map(n => (n.id === payload.new.id ? payload.new : n)))
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [currentUser?.id])

  // ── Auth ──
  const register = useCallback(async (data) => {
    const metadata = { role: data.role, name: data.name }
    if (data.role === 'surveyor') {
      Object.assign(metadata, {
        rics: data.rics || '',
        region: data.region || '',
        qualifications: data.qualifications || [],
      })
    } else if (data.role === 'council') {
      Object.assign(metadata, {
        council_name: data.councilName || '',
        department: data.department || '',
        region: data.region || '',
      })
    } else if (data.role === 'landlord') {
      Object.assign(metadata, {
        business_name: data.businessName || '',
        landlord_type: data.landlordType || 'individual',
        region: data.region || '',
        address: data.address || '',
      })
    }
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: metadata },
    })
    if (error) {
      showToast(error.message, 'error')
      return false
    }
    showToast(
      data.role === 'surveyor'
        ? 'Account created — pending admin verification before you can express interest.'
        : 'Account created successfully!',
      'success'
    )
    return true
  }, [showToast])

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      showToast('Invalid email or password', 'error')
      return null
    }
    showToast('Welcome back!', 'success')
    // role will land via the auth-state listener -> loadAll
    return data.user
  }, [showToast])

  const demoLogin = useCallback(async (role) => {
    const email = role === 'surveyor' ? 'james@walkersurveys.co.uk' : 'emily@brighton.gov.uk'
    return await login(email, 'demo1234')
  }, [login])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    showToast('Signed out')
  }, [showToast])

  const changePassword = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { showToast(error.message, 'error'); return false }
    showToast('Password updated', 'success')
    return true
  }, [showToast])

  // ── Mutations ──
  const updateCurrentUser = useCallback(async (patch) => {
    if (!currentUser) return
    const profilePatch = {}
    if (patch.name !== undefined) profilePatch.name = patch.name
    if (Object.keys(profilePatch).length) {
      await supabase.from('profiles').update(profilePatch).eq('id', currentUser.id)
    }

    if (currentUser.role === 'surveyor') {
      const survPatch = {}
      if (patch.rics !== undefined) survPatch.rics = patch.rics
      if (patch.region !== undefined) survPatch.region = patch.region
      if (patch.phone !== undefined) survPatch.phone = patch.phone
      if (patch.bio !== undefined) survPatch.bio = patch.bio
      if (patch.qualifications !== undefined) survPatch.qualifications = patch.qualifications
      if (Object.keys(survPatch).length) {
        await supabase.from('surveyors').update(survPatch).eq('profile_id', currentUser.id)
      }
    } else if (currentUser.role === 'council') {
      const counPatch = {}
      if (patch.councilName !== undefined) counPatch.council_name = patch.councilName
      if (patch.department !== undefined) counPatch.department = patch.department
      if (patch.region !== undefined) counPatch.region = patch.region
      if (patch.phone !== undefined) counPatch.phone = patch.phone
      if (patch.about !== undefined) counPatch.about = patch.about
      if (Object.keys(counPatch).length) {
        await supabase.from('councils').update(counPatch).eq('profile_id', currentUser.id)
      }
    } else if (currentUser.role === 'landlord') {
      const landPatch = {}
      if (patch.businessName !== undefined) landPatch.business_name = patch.businessName
      if (patch.landlordType !== undefined) landPatch.landlord_type = patch.landlordType
      if (patch.region !== undefined) landPatch.region = patch.region
      if (patch.address !== undefined) landPatch.address = patch.address
      if (patch.phone !== undefined) landPatch.phone = patch.phone
      if (patch.about !== undefined) landPatch.about = patch.about
      if (Object.keys(landPatch).length) {
        await supabase.from('landlords').update(landPatch).eq('profile_id', currentUser.id)
      }
    }
    await loadAll(currentUser.id)
  }, [currentUser, loadAll])

  const addDocument = useCallback(async (doc) => {
    if (!currentUser) return
    const { error } = await supabase.from('credential_documents').insert({
      surveyor_id: currentUser.id,
      type: doc.type, title: doc.title, issue_date: doc.date,
      file_name: doc.fileName, status: 'pending',
    })
    if (error) { showToast(error.message, 'error'); return }
    await loadAll(currentUser.id)
  }, [currentUser, loadAll, showToast])

  const createRequest = useCallback(async (req) => {
    if (!currentUser) return
    const { error } = await supabase.from('survey_requests').insert({
      council_id: currentUser.id,
      title: req.title, type: req.type, region: req.region,
      address: req.address, deadline: req.deadline, budget: req.budget || null,
      description: req.description, contact: req.contact, status: 'open',
      property_id: req.propertyId || null,
    })
    if (error) { showToast(error.message, 'error'); return }
    showToast('Survey request published!', 'success')
    await loadAll(currentUser.id)
  }, [currentUser, loadAll, showToast])

  const createProperty = useCallback(async (p) => {
    if (!currentUser) return
    const { error } = await supabase.from('properties').insert({
      landlord_id: currentUser.id,
      address: p.address, postcode: p.postcode || null, region: p.region || null,
      type: p.type || 'residential', units: p.units ? Number(p.units) : null,
      notes: p.notes || '',
    })
    if (error) { showToast(error.message, 'error'); return }
    showToast('Property added', 'success')
    await loadAll(currentUser.id)
  }, [currentUser, loadAll, showToast])

  const deleteProperty = useCallback(async (id) => {
    const { error } = await supabase.from('properties').delete().eq('id', id)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Property removed')
    await loadAll(currentUser?.id)
  }, [currentUser, loadAll, showToast])

  const markNotificationRead = useCallback(async (id) => {
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
  }, [])

  const markAllNotificationsRead = useCallback(async () => {
    if (!currentUser) return
    const now = new Date().toISOString()
    setNotifications(ns => ns.map(n => n.read_at ? n : { ...n, read_at: now }))
    await supabase.from('notifications').update({ read_at: now }).eq('user_id', currentUser.id).is('read_at', null)
  }, [currentUser])

  const refreshNotifications = useCallback(async () => {
    if (!currentUser) return
    const { data } = await supabase.from('notifications').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(50)
    setNotifications(data || [])
  }, [currentUser])

  const closeRequest = useCallback(async (reqId) => {
    const { error } = await supabase.from('survey_requests').update({ status: 'closed' }).eq('id', reqId)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Request closed')
    await loadAll(currentUser?.id)
  }, [currentUser, loadAll, showToast])

  const submitQuote = useCallback(async (reqId, { price, days, scopeNotes }) => {
    if (!currentUser) return
    const { error } = await supabase.from('quotes').insert({
      request_id: reqId,
      surveyor_id: currentUser.id,
      price: price ? Number(price) : null,
      days_to_complete: days ? Number(days) : null,
      scope_notes: scopeNotes || '',
    })
    if (error) { showToast(error.message, 'error'); return false }
    showToast('Quote submitted', 'success')
    await loadAll(currentUser.id)
    return true
  }, [currentUser, loadAll, showToast])

  const withdrawQuote = useCallback(async (quoteId) => {
    const { error } = await supabase.from('quotes').delete().eq('id', quoteId)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Quote withdrawn')
    await loadAll(currentUser?.id)
  }, [currentUser, loadAll, showToast])

  const awardQuote = useCallback(async (quote) => {
    // Mark winning quote
    const { error: e1 } = await supabase.from('quotes').update({ status: 'won' }).eq('id', quote.id)
    if (e1) { showToast(e1.message, 'error'); return }
    // Mark sibling quotes as lost
    const { error: e2 } = await supabase
      .from('quotes').update({ status: 'lost' })
      .eq('request_id', quote.request_id).neq('id', quote.id)
    if (e2) { showToast(e2.message, 'error'); return }
    // Update the request
    const { error: e3 } = await supabase.from('survey_requests')
      .update({ status: 'awarded', awarded_quote_id: quote.id })
      .eq('id', quote.request_id)
    if (e3) { showToast(e3.message, 'error'); return }
    showToast('Quote awarded — surveyor will be notified', 'success')
    await loadAll(currentUser?.id)
  }, [currentUser, loadAll, showToast])

  const submitReview = useCallback(async (request, { rating, comment }) => {
    if (!currentUser) return false
    const wonQuote = request.quotes.find(q => q.status === 'won')
    if (!wonQuote) { showToast('No awarded surveyor to review', 'error'); return false }
    const { error } = await supabase.from('reviews').insert({
      request_id: request.id,
      surveyor_id: wonQuote.surveyor_id,
      reviewer_id: currentUser.id,
      rating: Number(rating),
      comment: comment || '',
    })
    if (error) { showToast(error.message, 'error'); return false }
    showToast('Review submitted — thank you', 'success')
    await loadAll(currentUser.id)
    return true
  }, [currentUser, loadAll, showToast])

  const updateRequestStatus = useCallback(async (reqId, status) => {
    const { error } = await supabase.from('survey_requests').update({ status }).eq('id', reqId)
    if (error) { showToast(error.message, 'error'); return }
    showToast(`Request marked ${status.replace('_', ' ')}`, 'success')
    await loadAll(currentUser?.id)
  }, [currentUser, loadAll, showToast])

  // ── Admin ──
  const setSurveyorStatus = useCallback(async (profileId, status) => {
    const { error } = await supabase.from('profiles').update({ status }).eq('id', profileId)
    if (error) { showToast(error.message, 'error'); return }
    showToast(`Surveyor ${status === 'active' ? 'approved' : status === 'rejected' ? 'rejected' : 'updated'}`, 'success')
    await loadAll(currentUser?.id)
  }, [currentUser, loadAll, showToast])

  const setDocumentStatus = useCallback(async (docId, status) => {
    const { error } = await supabase.from('credential_documents').update({ status }).eq('id', docId)
    if (error) { showToast(error.message, 'error'); return }
    showToast(`Document ${status}`, 'success')
    await loadAll(currentUser?.id)
  }, [currentUser, loadAll, showToast])

  const refresh = useCallback(() => loadAll(currentUser?.id), [currentUser, loadAll])

  const value = useMemo(() => ({
    session, currentUser, users, requests, properties, notifications, toasts, ready,
    register, login, demoLogin, logout, changePassword,
    updateCurrentUser, addDocument, createRequest, closeRequest,
    createProperty, deleteProperty,
    submitQuote, withdrawQuote, awardQuote, updateRequestStatus, submitReview,
    setSurveyorStatus, setDocumentStatus,
    markNotificationRead, markAllNotificationsRead, refreshNotifications,
    refresh,
    showToast,
  }), [session, currentUser, users, requests, properties, notifications, toasts, ready,
       register, login, demoLogin, logout, changePassword,
       updateCurrentUser, addDocument, createRequest, closeRequest,
       createProperty, deleteProperty,
       submitQuote, withdrawQuote, awardQuote, updateRequestStatus, submitReview,
       setSurveyorStatus, setDocumentStatus,
       markNotificationRead, markAllNotificationsRead, refreshNotifications,
       refresh, showToast])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
