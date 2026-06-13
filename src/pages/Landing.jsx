import { Link, useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()
  const startRegister = (role) => navigate('/register', { state: { role } })

  return (
    <div className="container">
      <div className="hero">
        <h1>Connect Councils with<br />Qualified Surveyors</h1>
        <p>The UK's platform for local councils to find verified surveyors, and for surveyors to access council work — matched by location and qualification.</p>
        <div className="hero-buttons">
          <button className="btn btn-primary btn-lg" onClick={() => startRegister('surveyor')}>
            Register as Surveyor
          </button>
          <button
            className="btn btn-lg"
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
            onClick={() => startRegister('council')}
          >
            Register as Council
          </button>
          <button
            className="btn btn-lg"
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
            onClick={() => startRegister('landlord')}
          >
            Register as Landlord
          </button>
        </div>
      </div>

      <div className="features">
        <div className="feature-card">
          <div className="feature-icon">🏛</div>
          <h3>For Local Councils</h3>
          <p>Post survey requirements and receive quotes from qualified, verified surveyors in your region. Streamline your procurement process.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📋</div>
          <h3>For Surveyors</h3>
          <p>Showcase your qualifications, find council work matched to your expertise and location. Upload RICS credentials and certificates.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">✅</div>
          <h3>Verified & Trusted</h3>
          <p>All surveyor qualifications are reviewed and verified. Councils can be confident they're working with properly accredited professionals.</p>
        </div>
      </div>

      <footer style={{ textAlign: 'center', padding: '32px 0 16px', color: 'var(--text-light)', fontSize: '13px', display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <span>© {new Date().getFullYear()} Surveyors UK</span>
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/terms">Terms of Service</Link>
      </footer>
    </div>
  )
}
