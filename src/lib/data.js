export const UK_REGIONS = [
  'East Midlands', 'East of England', 'Greater London', 'North East', 'North West',
  'South East', 'South West', 'West Midlands', 'Yorkshire and the Humber',
  'Scotland', 'Wales', 'Northern Ireland',
]

export const PROPERTY_TYPES = [
  { id: 'residential', label: 'Residential' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'mixed', label: 'Mixed use' },
  { id: 'land', label: 'Land / undeveloped' },
]

export const LANDLORD_TYPES = [
  { id: 'individual', label: 'Individual landlord' },
  { id: 'company', label: 'Property company' },
  { id: 'housing_association', label: 'Housing association' },
]

// Unified customer ("organisation") types — councils and social landlords all
// post jobs the same way. Stored on the councils row as org_type.
export const ORG_TYPES = [
  { id: 'council', label: 'Council / Local authority' },
  { id: 'housing_association', label: 'Housing association' },
  { id: 'almo', label: 'ALMO (arms-length management org)' },
  { id: 'managing_agent', label: 'Managing agent' },
  { id: 'property_company', label: 'Property company' },
  { id: 'private_landlord', label: 'Private landlord' },
]

export function orgTypeLabel(id) {
  return ORG_TYPES.find(o => o.id === id)?.label || 'Organisation'
}

// Awaab's Law hazard categories (HHSRS-aligned), tagged by the rollout phase
// in which they become enforceable. Phase 1 live now; 2 in 2026; 3 in 2027.
export const HAZARD_CATEGORIES = [
  { id: 'damp_mould', label: 'Damp & mould', phase: 1 },
  { id: 'excess_cold', label: 'Excess cold', phase: 2 },
  { id: 'excess_heat', label: 'Excess heat', phase: 2 },
  { id: 'falls', label: 'Falls (stairs, levels, baths)', phase: 2 },
  { id: 'structural_collapse', label: 'Structural collapse', phase: 2 },
  { id: 'fire', label: 'Fire', phase: 2 },
  { id: 'electrical', label: 'Electrical hazards', phase: 2 },
  { id: 'explosions', label: 'Explosions', phase: 2 },
  { id: 'hygiene_food_safety', label: 'Hygiene & food safety', phase: 2 },
  { id: 'other', label: 'Other HHSRS hazard', phase: 3 },
]

// Severity drives which statutory clock applies (see the DB deadline trigger).
export const HAZARD_SEVERITIES = [
  { id: 'emergency', label: 'Emergency', desc: 'Significant & imminent risk — investigate and make safe within 24 hours' },
  { id: 'significant', label: 'Significant', desc: 'Investigate within 10 working days; written summary within 3; make safe within 5' },
  { id: 'routine', label: 'Routine', desc: 'Ordinary survey work — no statutory deadline' },
]

export const AVAILABILITY_OPTIONS = [
  { id: 'available', label: 'Available' },
  { id: 'limited', label: 'Limited capacity' },
  { id: 'unavailable', label: 'Unavailable' },
]

// How a surveyor trades — needed so liability sits with their own entity.
export const ENTITY_TYPES = [
  { id: 'sole_trader', label: 'Sole trader' },
  { id: 'limited_company', label: 'Limited company' },
]

// Annual fee income band → RICS minimum PI cover (mirrors private.required_pi_minimum in the DB).
export const FEE_BANDS = [
  { id: 'under_100k', label: 'Under £100k', piMin: 250000 },
  { id: '100k_200k', label: '£100k – £200k', piMin: 500000 },
  { id: 'over_200k', label: 'Over £200k', piMin: 1000000 },
]

export function feeBandPiMin(id) {
  return FEE_BANDS.find(b => b.id === id)?.piMin || 250000
}
export function feeBandLabel(id) {
  return FEE_BANDS.find(b => b.id === id)?.label || id
}
export function entityTypeLabel(id) {
  return ENTITY_TYPES.find(e => e.id === id)?.label || id
}
export function formatGBP(n) {
  if (n == null || n === '') return '—'
  return '£' + Number(n).toLocaleString('en-GB')
}

// The four gates a surveyor must clear before they can take work.
// Returns [{ key, label, done, detail }]. The authoritative gate is `workReady`
// from the DB; this mirrors it for display so the surveyor sees what's outstanding.
export function verificationChecklist(u) {
  if (!u) return []
  const piMin = feeBandPiMin(u.feeBand)
  const cover = Number(u.insurance?.coverage_amount ?? u.insuranceCoverage ?? 0)
  const insExpiryOk = !u.insuranceExpiry || new Date(u.insuranceExpiry) >= new Date(new Date().toDateString())
  const insuranceDone = u.insuranceStatus === 'verified' && insExpiryOk && cover >= piMin
  const entityDone = !!u.entityType && u.entityStatus === 'verified'
  const qualDone = (u.documents || []).some(d => d.status === 'verified')
  const liabilityDone = !!u.liabilityDeclaredAt
  return [
    {
      key: 'entity', label: 'Registered business entity', done: entityDone,
      detail: !u.entityType ? 'Tell us how you trade'
        : u.entityStatus === 'verified' ? `${entityTypeLabel(u.entityType)} — verified`
        : `${entityTypeLabel(u.entityType)} — awaiting verification`,
    },
    {
      key: 'insurance', label: `Professional Indemnity insurance (min ${formatGBP(piMin)})`, done: insuranceDone,
      detail: u.insuranceStatus === 'none' ? 'Not submitted'
        : u.insuranceStatus !== 'verified' ? 'Awaiting verification'
        : !insExpiryOk ? 'Policy expired'
        : cover < piMin ? `Cover ${formatGBP(cover)} is below the ${formatGBP(piMin)} required for your fee band`
        : `Verified — ${formatGBP(cover)} cover`,
    },
    {
      key: 'qualification', label: 'At least one verified qualification', done: qualDone,
      detail: qualDone ? 'Verified' : 'Upload a certificate to be verified',
    },
    {
      key: 'liability', label: 'Liability declaration', done: liabilityDone,
      detail: liabilityDone ? 'Signed' : 'Confirm you carry your own cover and accept liability',
    },
  ]
}

export const QUALIFICATION_TYPES = [
  { id: 'building', label: 'Building Surveying', desc: 'RICS Building Surveyor' },
  { id: 'quantity', label: 'Quantity Surveying', desc: 'Quantity Surveyor / Cost Consultant' },
  { id: 'land', label: 'Land / Geomatics', desc: 'Land Surveyor, Topographical, Geomatics' },
  { id: 'valuation', label: 'Valuation', desc: 'Property Valuation Surveyor' },
  { id: 'boundary', label: 'Boundary Surveying', desc: 'Boundary Dispute & Demarcation' },
  { id: 'environmental', label: 'Environmental', desc: 'Environmental Impact Assessment' },
  { id: 'project_mgmt', label: 'Project Management', desc: 'RICS Project Management' },
  { id: 'party_wall', label: 'Party Wall', desc: 'Party Wall Surveyor' },
  { id: 'measured', label: 'Measured Survey', desc: 'Measured Building / Floor Plans' },
  { id: 'heritage', label: 'Heritage / Conservation', desc: 'Listed Buildings & Conservation' },
]

export const INITIAL_USERS = [
  {
    id: 'demo-surv-1', role: 'surveyor', name: 'James Walker', email: 'james@walkersurveys.co.uk',
    password: 'demo', rics: '7891234', region: 'Greater London', phone: '07700 900123',
    qualifications: ['building', 'land', 'boundary'],
    bio: '15 years experience in residential and commercial surveying across London and the South East. RICS Chartered.',
    documents: [
      { id: 'd1', type: 'building', title: 'RICS Chartered Building Surveyor Certificate', date: '2018-06-15', fileName: 'RICS_Building_Cert.pdf', status: 'verified' },
      { id: 'd2', type: 'land', title: 'BSc Land Surveying — UCL', date: '2010-07-01', fileName: 'BSc_Land_Survey.pdf', status: 'verified' },
    ],
  },
  {
    id: 'demo-surv-2', role: 'surveyor', name: 'Sarah Collins', email: 'sarah@precisionsurveys.co.uk',
    password: 'demo', rics: '6543210', region: 'South East', phone: '07700 900456',
    qualifications: ['quantity', 'valuation', 'project_mgmt'],
    bio: 'Chartered Quantity Surveyor with extensive experience in public sector projects.',
    documents: [
      { id: 'd3', type: 'quantity', title: 'RICS Quantity Surveying Accreditation', date: '2016-03-20', fileName: 'RICS_QS_Cert.pdf', status: 'verified' },
    ],
  },
  {
    id: 'demo-surv-3', role: 'surveyor', name: 'David Murray', email: 'david@murrayenv.co.uk',
    password: 'demo', rics: '', region: 'Scotland', phone: '07700 900789',
    qualifications: ['environmental', 'land', 'heritage'],
    bio: 'Environmental surveyor specialising in Scottish heritage sites and conservation areas.',
    documents: [],
  },
  {
    id: 'demo-council-1', role: 'council', name: 'Emily Richards', email: 'emily@brighton.gov.uk',
    password: 'demo', councilName: 'Brighton & Hove City Council', region: 'South East',
    department: 'Planning & Development', phone: '01273 290000',
    about: 'Planning and development team managing survey procurement for the Brighton & Hove area.',
  },
  {
    id: 'demo-council-2', role: 'council', name: 'Mark Thompson', email: 'mark@camden.gov.uk',
    password: 'demo', councilName: 'London Borough of Camden', region: 'Greater London',
    department: 'Estates & Property', phone: '020 7974 4444',
    about: 'Estates team managing council property surveys and valuations.',
  },
]

export const INITIAL_REQUESTS = [
  {
    id: 'req-1', councilId: 'demo-council-1', title: 'Boundary Survey — 14 Marine Parade',
    type: 'boundary', region: 'South East', address: '14 Marine Parade, Brighton BN2 1TL',
    deadline: '2026-06-30', budget: '£2,000 - £3,500', status: 'open',
    description: 'Full boundary survey required for a residential property adjacent to public land. There is a boundary dispute with the neighbouring property regarding the rear garden boundary. We require an accurate boundary survey with reference to title plans and ordnance survey data.',
    contact: 'procurement@brighton.gov.uk', createdAt: '2026-05-20', interests: [],
  },
  {
    id: 'req-2', councilId: 'demo-council-2', title: 'Building Condition Survey — Council Offices',
    type: 'building', region: 'Greater London', address: '5 Pancras Square, London N1C 4AG',
    deadline: '2026-07-15', budget: '£5,000 - £8,000', status: 'open',
    description: 'Comprehensive building condition survey required for our main council office building (circa 1970, 6 storeys). Survey should cover structure, roof, external fabric, mechanical & electrical services, and provide a planned maintenance schedule with costings over 10 years.',
    contact: 'estates@camden.gov.uk', createdAt: '2026-05-18', interests: ['demo-surv-1'],
  },
  {
    id: 'req-3', councilId: 'demo-council-2', title: 'Quantity Surveying — Library Refurbishment',
    type: 'quantity', region: 'Greater London', address: 'Holborn Library, 32-38 Theobalds Rd, WC1X 8PA',
    deadline: '2026-08-01', budget: '£3,000 - £5,000', status: 'open',
    description: 'Cost consultancy and quantity surveying services required for the refurbishment of Holborn Library. The project includes new heating system, roof repairs, interior modernisation, and accessibility improvements. We require a full cost plan and bill of quantities.',
    contact: 'estates@camden.gov.uk', createdAt: '2026-05-15', interests: [],
  },
  {
    id: 'req-4', councilId: 'demo-council-1', title: 'Environmental Survey — New Housing Site',
    type: 'environmental', region: 'South East', address: 'Land off Falmer Road, Brighton BN1 9PH',
    deadline: '2026-07-20', budget: '£4,000 - £7,000', status: 'open',
    description: 'Phase 1 environmental desk study and Phase 2 ground investigation required for proposed residential development site. Site was previously used as agricultural land. Environmental Impact Assessment needed for planning application.',
    contact: 'planning@brighton.gov.uk', createdAt: '2026-05-22', interests: [],
  },
]

export function getInitials(name) {
  return (name || '').split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2)
}

export function formatDateGB(iso, withYear = true) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}),
  })
}

// ISO timestamp -> 'YYYY-MM-DDTHH:mm' for a datetime-local input (local time).
export function toDatetimeLocal(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function qualLabel(id) {
  return QUALIFICATION_TYPES.find(q => q.id === id)?.label || id
}

export function propertyTypeLabel(id) {
  return PROPERTY_TYPES.find(t => t.id === id)?.label || id
}

// Unread messages in one conversation = messages from the other party not yet read.
export function unreadInConversation(conv, userId) {
  return (conv?.messages || []).filter(m => m.sender_id !== userId && !m.read_at).length
}

// Total unread across all conversations (drives the Messages tab badge).
export function totalUnreadMessages(conversations, userId) {
  return (conversations || []).reduce((sum, c) => sum + unreadInConversation(c, userId), 0)
}

// A surveyor counts as insured only with a verified, non-expired policy.
export function isInsured(s) {
  if (!s || s.insuranceStatus !== 'verified') return false
  if (!s.insuranceExpiry) return true
  return new Date(s.insuranceExpiry) >= new Date(new Date().toDateString())
}

export function hazardCategoryLabel(id) {
  return HAZARD_CATEGORIES.find(h => h.id === id)?.label || id
}

export function severityLabel(id) {
  return HAZARD_SEVERITIES.find(s => s.id === id)?.label || id
}

// 'BN2 1TL' -> 'BN2' (outward code), 'BN' (area). Mirrors the SQL helpers.
export function postcodeOutward(p) {
  if (!p) return ''
  return p.trim().toUpperCase().split(' ')[0]
}
export function postcodeArea(p) {
  return (postcodeOutward(p).match(/^[A-Z]+/) || [''])[0]
}

// ── Matching: does this open job match this surveyor? ──
// Mirrors notify_matching_surveyors() in the DB: vetted + available + holds the
// required skill + covers the area (postcode prefix, or region as fallback).
export function isMatch(job, surveyor) {
  if (!job || !surveyor) return false
  if (surveyor.availabilityStatus === 'unavailable') return false
  const skill = (surveyor.qualifications || []).includes(job.type)
  if (!skill) return false
  const areas = surveyor.coverageAreas || []
  const out = postcodeOutward(job.postcode)
  const areaMatch =
    (job.region && job.region === surveyor.region) ||
    (out && areas.some(ca => out.startsWith(ca.toUpperCase())))
  return !!areaMatch
}

export function matchReasons(job, surveyor) {
  const reasons = []
  if ((surveyor.qualifications || []).includes(job.type)) reasons.push(qualLabel(job.type))
  const out = postcodeOutward(job.postcode)
  if (out && (surveyor.coverageAreas || []).some(ca => out.startsWith(ca.toUpperCase()))) {
    reasons.push(`Covers ${out}`)
  } else if (job.region && job.region === surveyor.region) {
    reasons.push(job.region)
  }
  return reasons
}

// ── Awaab's Law compliance clock ──
// Per-milestone status: 'done' | 'breached' | 'due_soon' (<24h) | 'on_track'.
const DUE_SOON_MS = 24 * 60 * 60 * 1000

function milestoneStatus(dueAt, doneAt, now) {
  if (doneAt) return 'done'
  if (!dueAt) return 'on_track'
  const due = new Date(dueAt).getTime()
  if (now > due) return 'breached'
  if (due - now <= DUE_SOON_MS) return 'due_soon'
  return 'on_track'
}

// Returns { applies, severity, milestones:[{key,label,dueAt,doneAt,status}], overall }
// overall is the worst not-done milestone status, or 'done' / null.
export function awaabsClock(r, now = Date.now()) {
  if (!r?.awaabsApplies || !r.hazardSeverity || r.hazardSeverity === 'routine') {
    return { applies: false, severity: null, milestones: [], overall: null }
  }
  const defs = [
    { key: 'investigate', label: 'Investigate', dueAt: r.investigateBy, doneAt: r.investigatedAt },
    { key: 'summary', label: 'Written summary', dueAt: r.summaryDueBy, doneAt: r.summarySentAt },
    { key: 'make_safe', label: 'Make safe', dueAt: r.makeSafeBy, doneAt: r.madeSafeAt },
  ]
  const milestones = defs.map(d => ({ ...d, status: milestoneStatus(d.dueAt, d.doneAt, now) }))
  const rank = { breached: 3, due_soon: 2, on_track: 1 }
  let overall = 'done'
  for (const m of milestones) {
    if (m.status === 'done') continue
    if (overall === 'done') overall = m.status
    else if (rank[m.status] > rank[overall]) overall = m.status
  }
  return { applies: true, severity: r.hazardSeverity, milestones, overall }
}

// Lower = more urgent. Used to sort matched/job feeds. Breached first, then
// soonest live statutory deadline, then ordinary deadline.
export function urgencyRank(r, now = Date.now()) {
  const clock = awaabsClock(r, now)
  if (clock.applies) {
    const live = clock.milestones.filter(m => m.status !== 'done' && m.dueAt)
    if (clock.overall === 'breached') return -Infinity
    if (live.length) return Math.min(...live.map(m => new Date(m.dueAt).getTime()))
  }
  return r.deadline ? new Date(r.deadline).getTime() : Infinity
}

// Compact "in 3h" / "2d left" / "overdue 1d" label for a deadline timestamp.
export function dueLabel(dueAt, now = Date.now()) {
  if (!dueAt) return ''
  const diff = new Date(dueAt).getTime() - now
  const abs = Math.abs(diff)
  const hrs = Math.round(abs / (60 * 60 * 1000))
  const txt = hrs < 48 ? `${hrs}h` : `${Math.round(hrs / 24)}d`
  return diff < 0 ? `overdue ${txt}` : `${txt} left`
}

export const COMPLIANCE_COLOR = {
  breached: { background: '#fed7d7', color: '#9b2c2c' },
  due_soon: { background: '#feebc8', color: '#9c4221' },
  on_track: { background: '#c6f6d5', color: '#276749' },
  done: { background: '#e9d8fd', color: '#553c9a' },
}
