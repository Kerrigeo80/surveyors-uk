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
      propertyTypes: surveyor.property_types || [],
      coverageAreas: surveyor.coverage_areas || [],
      availabilityStatus: surveyor.availability_status || 'available',
      availableFrom: surveyor.available_from || null,
      acceptsEmergency: surveyor.accepts_emergency || false,
      insuranceStatus: surveyor.insurance_status || 'none',
      insuranceExpiry: surveyor.insurance_expiry || null,
      insuranceCoverage: surveyor.insurance_coverage || null,
      // Entity / liability verification
      entityType: surveyor.entity_type || '',
      tradingName: surveyor.trading_name || '',
      companyNumber: surveyor.company_number || '',
      companyName: surveyor.company_name || '',
      companyStatus: surveyor.company_status || '',
      vatNumber: surveyor.vat_number || '',
      feeBand: surveyor.fee_band || 'under_100k',
      entityStatus: surveyor.entity_status || 'pending',
      liabilityDeclaredAt: surveyor.liability_declared_at || null,
      workReady: surveyor.work_ready || false,
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
        propertyTypes: s?.property_types || [],
        coverageAreas: s?.coverage_areas || [],
        availabilityStatus: s?.availability_status || 'available',
        availableFrom: s?.available_from || null,
        acceptsEmergency: s?.accepts_emergency || false,
        insuranceStatus: s?.insurance_status || 'none',
        insuranceExpiry: s?.insurance_expiry || null,
        insuranceCoverage: s?.insurance_coverage || null,
        entityType: s?.entity_type || '',
        tradingName: s?.trading_name || '',
        companyNumber: s?.company_number || '',
        companyName: s?.company_name || '',
        companyStatus: s?.company_status || '',
        feeBand: s?.fee_band || 'under_100k',
        entityStatus: s?.entity_status || 'pending',
        liabilityDeclaredAt: s?.liability_declared_at || null,
        workReady: s?.work_ready || false,
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
    propertyType: r.property_type,
    postcode: r.postcode,
    // Awaab's Law hazard + statutory clock
    awaabsApplies: r.awaabs_applies,
    hazardCategory: r.hazard_category,
    hazardSeverity: r.hazard_severity,
    reportedAt: r.reported_at,
    investigatedAt: r.investigated_at,
    summarySentAt: r.summary_sent_at,
    madeSafeAt: r.made_safe_at,
    investigateBy: r.investigate_by,
    summaryDueBy: r.summary_due_by,
    makeSafeBy: r.make_safe_by,
    residentName: r.resident_name,
    residentContact: r.resident_contact,
    sourceReportId: r.source_report_id,
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
  const [reports, setReports] = useState([])
  const [properties, setProperties] = useState([])
  const [notifications, setNotifications] = useState([])
  const [conversations, setConversations] = useState([])
  const [offers, setOffers] = useState([])
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
      setCurrentUser(null); setUsers([]); setRequests([]); setReports([])
      setNotifications([]); setConversations([]); setOffers([])
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
    const [
      { data: propertiesData }, { data: notificationsData }, { data: reviews },
      { data: myInsurance }, { data: convs }, { data: msgs }, { data: reportsData },
      { data: offersData },
    ] = await Promise.all([
      supabase.from('properties').select('*').order('created_at', { ascending: false }),
      supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      supabase.from('reviews').select('*').order('created_at', { ascending: false }),
      supabase.from('insurance_policies').select('*').eq('surveyor_id', userId).maybeSingle(),
      supabase.from('conversations').select('*').order('created_at', { ascending: false }),
      supabase.from('messages').select('*').order('created_at', { ascending: true }),
      // RLS scopes this to the org's own reports (admin sees all).
      supabase.from('hazard_reports').select('*').order('created_at', { ascending: false }),
      // RLS scopes offers to the surveyor they're for / the council that sent them.
      supabase.from('offers').select('*').order('created_at', { ascending: false }),
    ])

    if (!mountedRef.current) return

    const msgsByConv = {}
    ;(msgs || []).forEach(m => {
      const arr = msgsByConv[m.conversation_id] = msgsByConv[m.conversation_id] || []
      arr.push(m)
    })
    const conversationsData = (convs || []).map(c => ({ ...c, messages: msgsByConv[c.id] || [] }))

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
      me.insurance = myInsurance || null
    }

    setCurrentUser(me)
    setUsers(buildUsersList(profiles || [], surveyors || [], councils || [], landlords || [], docsBySurv, reviewsBySurv))
    setRequests((rawRequests || []).map(r => mapRequest(r, quotesByReq, userId, reviewsByReq)))
    setReports(reportsData || [])
    setProperties(propertiesData || [])
    setNotifications(notificationsData || [])
    setConversations(conversationsData)
    setOffers((offersData || []).map(o => ({
      id: o.id, requestId: o.request_id, surveyorId: o.surveyor_id,
      fee: o.fee, message: o.message, status: o.status,
      createdAt: o.created_at, respondedAt: o.responded_at,
    })))
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
      // Messages: RLS limits delivery to conversations this user is part of.
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const m = payload.new
          setConversations(cs => {
            const known = cs.some(c => c.id === m.conversation_id)
            if (!known) {
              // First message of a conversation the other party just started — pull it in.
              loadAll(userId)
              return cs
            }
            return cs.map(c => {
              if (c.id !== m.conversation_id) return c
              if (c.messages.some(x => x.id === m.id)) return c
              return { ...c, messages: [...c.messages, m] }
            })
          })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [currentUser?.id, loadAll])

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

  // Send a password-reset email. The link returns the user to /reset-password
  // with a recovery session, where they set a new password.
  const requestPasswordReset = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    // Don't reveal whether the address is registered.
    if (error && error.status !== 422) { showToast(error.message, 'error'); return false }
    showToast('If that email is registered, a reset link is on its way.', 'success')
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
      if (patch.propertyTypes !== undefined) survPatch.property_types = patch.propertyTypes
      if (patch.coverageAreas !== undefined) survPatch.coverage_areas = patch.coverageAreas
      if (patch.availabilityStatus !== undefined) survPatch.availability_status = patch.availabilityStatus
      if (patch.availableFrom !== undefined) survPatch.available_from = patch.availableFrom || null
      if (patch.acceptsEmergency !== undefined) survPatch.accepts_emergency = patch.acceptsEmergency
      // Entity / liability (entity_status + company_* are admin-only, enforced by DB trigger)
      if (patch.entityType !== undefined) survPatch.entity_type = patch.entityType || null
      if (patch.tradingName !== undefined) survPatch.trading_name = patch.tradingName || ''
      if (patch.companyNumber !== undefined) survPatch.company_number = patch.companyNumber || null
      if (patch.vatNumber !== undefined) survPatch.vat_number = patch.vatNumber || null
      if (patch.feeBand !== undefined) survPatch.fee_band = patch.feeBand
      if (patch.liabilityDeclaredAt !== undefined) survPatch.liability_declared_at = patch.liabilityDeclaredAt
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

  const submitInsurance = useCallback(async ({ insurer, policyNumber, coverageAmount, expiryDate, file }) => {
    if (!currentUser) return false
    let filePath = currentUser.insurance?.file_path || null
    let fileName = currentUser.insurance?.file_name || null
    if (file) {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
      const path = `${currentUser.id}/insurance-${Date.now()}-${safeName}`
      const { error: upErr } = await supabase.storage.from('credentials').upload(path, file, {
        upsert: false, contentType: file.type || 'application/octet-stream',
      })
      if (upErr) { showToast('Upload failed: ' + upErr.message, 'error'); return false }
      filePath = path
      fileName = file.name
    }
    const { error } = await supabase.from('insurance_policies').upsert({
      surveyor_id: currentUser.id,
      insurer,
      policy_number: policyNumber || '',
      coverage_amount: coverageAmount ? Number(coverageAmount) : null,
      expiry_date: expiryDate || null,
      file_name: fileName,
      file_path: filePath,
      status: 'pending',
    }, { onConflict: 'surveyor_id' })
    if (error) { showToast(error.message, 'error'); return false }
    showToast('Insurance submitted — pending verification', 'success')
    await loadAll(currentUser.id)
    return true
  }, [currentUser, loadAll, showToast])

  const setInsuranceStatus = useCallback(async (surveyorId, status) => {
    const { error } = await supabase.from('insurance_policies').update({ status }).eq('surveyor_id', surveyorId)
    if (error) { showToast(error.message, 'error'); return }
    showToast(`Insurance ${status}`, 'success')
    await loadAll(currentUser?.id)
  }, [currentUser, loadAll, showToast])

  // Admin verifies/rejects a surveyor's trading entity. The DB trigger only lets
  // an admin set this; the work_ready flag then recomputes automatically.
  const setEntityStatus = useCallback(async (surveyorId, status) => {
    const { error } = await supabase.from('surveyors').update({ entity_status: status }).eq('profile_id', surveyorId)
    if (error) { showToast(error.message, 'error'); return }
    showToast(`Entity ${status}`, 'success')
    await loadAll(currentUser?.id)
  }, [currentUser, loadAll, showToast])

  const createRequest = useCallback(async (req) => {
    if (!currentUser) return null
    const awaabs = !!req.awaabsApplies
    const { data, error } = await supabase.from('survey_requests').insert({
      council_id: currentUser.id,
      title: req.title, type: req.type, region: req.region,
      address: req.address, deadline: req.deadline, budget: req.budget || null,
      description: req.description, contact: req.contact, status: 'open',
      property_id: req.propertyId || null,
      property_type: req.propertyType || null,
      postcode: req.postcode || null,
      awaabs_applies: awaabs,
      hazard_category: awaabs ? (req.hazardCategory || null) : null,
      hazard_severity: awaabs ? (req.hazardSeverity || null) : null,
      reported_at: awaabs ? (req.reportedAt || new Date().toISOString()) : null,
      resident_name: req.residentName || null,
      resident_contact: req.residentContact || null,
      source_report_id: req.sourceReportId || null,
    }).select('id').single()
    if (error) { showToast(error.message, 'error'); return null }
    // If this job came from a resident report, mark that report triaged + link it.
    if (req.sourceReportId && data?.id) {
      await supabase.from('hazard_reports')
        .update({ status: 'triaged', request_id: data.id }).eq('id', req.sourceReportId)
    }
    showToast('Survey request published!', 'success')
    await loadAll(currentUser.id)
    return data?.id || null
  }, [currentUser, loadAll, showToast])

  const dismissReport = useCallback(async (reportId) => {
    const { error } = await supabase.from('hazard_reports').update({ status: 'dismissed' }).eq('id', reportId)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Report dismissed')
    await loadAll(currentUser?.id)
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

  // ── Messaging ──
  // Ensure a conversation exists for (request, surveyor) and return its id.
  const ensureConversation = useCallback(async (requestId, surveyorId, requesterId) => {
    const existing = conversations.find(c => c.request_id === requestId && c.surveyor_id === surveyorId)
    if (existing) return existing.id
    const { data, error } = await supabase.from('conversations')
      .insert({ request_id: requestId, requester_id: requesterId, surveyor_id: surveyorId })
      .select('id').single()
    if (error) {
      // Possible race: someone else created it. Re-fetch.
      const { data: found } = await supabase.from('conversations').select('id')
        .eq('request_id', requestId).eq('surveyor_id', surveyorId).maybeSingle()
      if (found) return found.id
      showToast(error.message, 'error')
      return null
    }
    return data.id
  }, [conversations, showToast])

  // body + EITHER an existing conversationId OR (requestId, surveyorId, requesterId) to create one.
  const sendMessage = useCallback(async ({ conversationId, requestId, surveyorId, requesterId, body }) => {
    if (!currentUser || !body.trim()) return false
    let convId = conversationId
    if (!convId) convId = await ensureConversation(requestId, surveyorId, requesterId)
    if (!convId) return false
    const { error } = await supabase.from('messages').insert({
      conversation_id: convId, sender_id: currentUser.id, body: body.trim(),
    })
    if (error) { showToast(error.message, 'error'); return false }
    await loadAll(currentUser.id)
    return true
  }, [currentUser, ensureConversation, loadAll, showToast])

  const markConversationRead = useCallback(async (conversationId) => {
    if (!currentUser) return
    const now = new Date().toISOString()
    setConversations(cs => cs.map(c => c.id !== conversationId ? c : {
      ...c,
      messages: c.messages.map(m => (m.sender_id !== currentUser.id && !m.read_at) ? { ...m, read_at: now } : m),
    }))
    await supabase.from('messages').update({ read_at: now })
      .eq('conversation_id', conversationId).neq('sender_id', currentUser.id).is('read_at', null)
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

  // ── Direct offers (council → surveyor at a set fee) ──
  const createOffer = useCallback(async ({ requestId, surveyorId, fee, message }) => {
    if (!currentUser) return false
    const { error } = await supabase.from('offers').insert({
      request_id: requestId, surveyor_id: surveyorId,
      fee: fee ? Number(fee) : null, message: message || '',
    })
    if (error) { showToast(error.message, 'error'); return false }
    showToast('Offer sent', 'success')
    await loadAll(currentUser.id)
    return true
  }, [currentUser, loadAll, showToast])

  const withdrawOffer = useCallback(async (offerId) => {
    const { error } = await supabase.from('offers').update({ status: 'withdrawn' }).eq('id', offerId)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Offer withdrawn')
    await loadAll(currentUser?.id)
  }, [currentUser, loadAll, showToast])

  const declineOffer = useCallback(async (offerId) => {
    const { error } = await supabase.from('offers').update({ status: 'declined', responded_at: new Date().toISOString() }).eq('id', offerId)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Offer declined')
    await loadAll(currentUser?.id)
  }, [currentUser, loadAll, showToast])

  const acceptOffer = useCallback(async (offerId) => {
    const { error } = await supabase.rpc('accept_offer', { p_offer_id: offerId })
    if (error) { showToast(error.message, 'error'); return false }
    showToast('Offer accepted — the job is yours', 'success')
    await loadAll(currentUser?.id)
    return true
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

  // Mark an Awaab's Law milestone done (sets the *_at timestamp to now).
  // milestone: 'investigated' | 'summary_sent' | 'made_safe'
  const setAwaabsMilestone = useCallback(async (reqId, milestone) => {
    const col = { investigated: 'investigated_at', summary_sent: 'summary_sent_at', made_safe: 'made_safe_at' }[milestone]
    if (!col) return
    const { error } = await supabase.from('survey_requests').update({ [col]: new Date().toISOString() }).eq('id', reqId)
    if (error) { showToast(error.message, 'error'); return }
    const label = { investigated: 'Investigation logged', summary_sent: 'Written summary logged', made_safe: 'Hazard made safe' }[milestone]
    showToast(label, 'success')
    await loadAll(currentUser?.id)
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
    session, currentUser, users, requests, reports, properties, notifications, conversations, offers, toasts, ready,
    register, login, demoLogin, logout, changePassword, requestPasswordReset,
    updateCurrentUser, addDocument, createRequest, closeRequest, dismissReport,
    createProperty, deleteProperty,
    submitQuote, withdrawQuote, awardQuote, updateRequestStatus, submitReview,
    createOffer, withdrawOffer, declineOffer, acceptOffer,
    setAwaabsMilestone,
    submitInsurance, setInsuranceStatus, setEntityStatus,
    sendMessage, markConversationRead,
    setSurveyorStatus, setDocumentStatus,
    markNotificationRead, markAllNotificationsRead, refreshNotifications,
    refresh,
    showToast,
  }), [session, currentUser, users, requests, reports, properties, notifications, conversations, offers, toasts, ready,
       register, login, demoLogin, logout, changePassword, requestPasswordReset,
       updateCurrentUser, addDocument, createRequest, closeRequest, dismissReport,
       createProperty, deleteProperty,
       submitQuote, withdrawQuote, awardQuote, updateRequestStatus, submitReview,
       createOffer, withdrawOffer, declineOffer, acceptOffer,
       setAwaabsMilestone,
       submitInsurance, setInsuranceStatus, setEntityStatus,
       sendMessage, markConversationRead,
       setSurveyorStatus, setDocumentStatus,
       markNotificationRead, markAllNotificationsRead, refreshNotifications,
       refresh, showToast])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
