export const UK_REGIONS = [
  'East Midlands', 'East of England', 'Greater London', 'North East', 'North West',
  'South East', 'South West', 'West Midlands', 'Yorkshire and the Humber',
  'Scotland', 'Wales', 'Northern Ireland',
]

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

export function qualLabel(id) {
  return QUALIFICATION_TYPES.find(q => q.id === id)?.label || id
}
