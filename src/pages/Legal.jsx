import { Link } from 'react-router-dom'

// Privacy Policy + Terms. Plain-content pages, rendered from the same shell.
// NOTE: this is a working draft to satisfy the GDPR/consent requirement for
// launch — have it reviewed by legal counsel before going live with real users.

const UPDATED = '13 June 2026'
const CONTACT = 'kerri@thetalentnetwork.com.au'

export default function Legal({ doc }) {
  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '820px', margin: '32px auto', lineHeight: 1.65 }}>
        <div style={{ padding: '10px 14px', background: '#fefcbf', borderLeft: '4px solid #d69e2e', borderRadius: 'var(--radius)', marginBottom: '24px', fontSize: '13px' }}>
          <strong>Draft for review.</strong> This document is a working template and must be reviewed by legal counsel before launch.
        </div>
        {doc === 'terms' ? <Terms /> : <Privacy />}
        <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '16px', fontSize: '13px' }}>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/">Home</Link>
        </div>
      </div>
    </div>
  )
}

function H({ children }) { return <h3 style={{ margin: '22px 0 6px' }}>{children}</h3> }

function Privacy() {
  return (
    <>
      <h2>Privacy Policy</h2>
      <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Last updated: {UPDATED}</p>

      <p>Surveyors UK ("we", "us") connects councils, landlords and other property owners with qualified surveyors. This policy explains what personal data we collect, why, and your rights under the UK GDPR.</p>

      <H>Data controller</H>
      <p>The Talent Network is the data controller for personal data processed through this platform. For any privacy query or to exercise your rights, contact <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>

      <H>What we collect</H>
      <ul>
        <li><strong>Account data</strong> — name, email, password (stored hashed), role, region and contact details.</li>
        <li><strong>Professional data (surveyors)</strong> — RICS number, qualifications, uploaded certificates, and professional indemnity insurance details.</li>
        <li><strong>Marketplace data</strong> — survey requests, quotes, property records, job status, ratings, reviews and in-app messages.</li>
        <li><strong>Technical data</strong> — basic logs needed to operate and secure the service.</li>
      </ul>

      <H>Lawful basis</H>
      <p>We process your data to <strong>perform our contract</strong> with you (running your account and the marketplace), on the basis of your <strong>consent</strong> (where asked, e.g. marketing), and for our <strong>legitimate interests</strong> in operating, securing and improving the platform, and verifying surveyor credentials.</p>

      <H>Surveyor seed pool</H>
      <p>To make the marketplace useful at launch we may hold a limited set of publicly available professional details (e.g. name, region, RICS number) for surveyors who have not yet registered, so they can claim and verify their profile. If you are listed and wish to be removed, email <a href={`mailto:${CONTACT}`}>{CONTACT}</a> and we will erase your record.</p>

      <H>Sharing</H>
      <p>We share data only as needed to run the marketplace: requesters and surveyors see each other's relevant details once they engage on a request. We use trusted processors (hosting, database and email delivery) under data-processing terms. We do not sell your data.</p>

      <H>Retention</H>
      <p>We keep account and marketplace data for as long as your account is active and as needed for legal, accounting and dispute-resolution purposes, then delete or anonymise it.</p>

      <H>Your rights</H>
      <p>Under the UK GDPR you have the right to access, correct, erase, restrict or object to processing of your data, and to data portability. To exercise any of these, contact <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. You also have the right to complain to the Information Commissioner's Office (ICO).</p>

      <H>Cookies</H>
      <p>We use only the cookies and local storage strictly necessary to keep you signed in and operate the service. We do not use third-party advertising or tracking cookies.</p>
    </>
  )
}

function Terms() {
  return (
    <>
      <h2>Terms of Service</h2>
      <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Last updated: {UPDATED}</p>

      <p>By creating an account you agree to these terms. If you do not agree, do not use the platform.</p>

      <H>The service</H>
      <p>Surveyors UK is a marketplace that lets requesters post survey requirements and surveyors submit quotes. We provide the platform; we are not a party to the contract for surveying work agreed between a requester and a surveyor.</p>

      <H>Accounts &amp; eligibility</H>
      <ul>
        <li>You must provide accurate information and keep your login secure.</li>
        <li>Surveyors must hold the qualifications they claim. We verify credentials before a surveyor can quote, but verification is not a guarantee or endorsement.</li>
        <li>You are responsible for activity under your account.</li>
      </ul>

      <H>Fees</H>
      <p>Use of the platform may be subject to subscription fees and a platform commission on awarded work, as notified to you in the app before they apply. Fee terms will be set out in full before any charge is taken.</p>

      <H>Acceptable use</H>
      <p>You agree not to misuse the platform, post false or unlawful content, circumvent fees, or attempt to access data you are not entitled to. We may suspend or remove accounts that breach these terms.</p>

      <H>Quotes &amp; work</H>
      <p>Quotes, awards and the resulting engagement are between the requester and the surveyor. We are not responsible for the quality, timeliness or outcome of surveying work, though we provide ratings and a dispute contact to help maintain standards.</p>

      <H>Liability</H>
      <p>The platform is provided "as is". To the extent permitted by law, we are not liable for indirect or consequential losses, or for the acts of any user. Nothing in these terms excludes liability that cannot lawfully be excluded.</p>

      <H>Changes</H>
      <p>We may update these terms; material changes will be notified in the app. Continued use after changes means you accept them.</p>

      <H>Contact</H>
      <p>Questions about these terms: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
    </>
  )
}
