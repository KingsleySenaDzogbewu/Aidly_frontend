import { useState } from 'react';

// The Aidly mark, for anyone without a school (and the "powered by" line).
function AidlyMark() {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" fill="none" aria-hidden="true">
      <rect y="0" width="16" height="3.4" rx="1.5" fill="currentColor" />
      <rect y="5.3" width="10" height="3.4" rx="1.5" fill="currentColor" opacity="0.65" />
      <rect y="10.6" width="13" height="3.4" rx="1.5" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

// "Kings Driving School" -> "KD"; one word ("KINGSCHOOL") -> "K".
function schoolInitials(name) {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0]?.[0] || '?').toUpperCase();
}

/**
 * The signed-in person's school - its logo (or initials) and name, with
 * "Powered by Aidly" - so the app reads as their school's. Plain Aidly for
 * anyone without a school.
 *  - compact: one line, for the phone top bar
 */
export default function SchoolBrand({ name, logoUrl, compact = false }) {
  const [failedLogo, setFailedLogo] = useState(null);

  if (!name) {
    return (
      <span className="school-brand">
        <span className={`brand-mark ${compact ? 'brand-mark-sm' : ''}`}><AidlyMark /></span>
        <span className={compact ? 'school-brand-name-sm' : 'brand-name'}>Aidly</span>
      </span>
    );
  }

  const showLogo = !!logoUrl && failedLogo !== logoUrl;
  return (
    <span className="school-brand" title={`${name} · Powered by Aidly`}>
      <span className={`brand-mark school-mark ${compact ? 'brand-mark-sm' : ''} ${showLogo ? 'has-logo' : ''}`}>
        {showLogo
          ? <img src={logoUrl} alt="" onError={() => setFailedLogo(logoUrl)} />
          : <span aria-hidden="true">{schoolInitials(name)}</span>}
      </span>
      {compact ? (
        <span className="school-brand-name-sm">{name}</span>
      ) : (
        <span className="school-brand-text">
          <span className="school-brand-name">{name}</span>
          <span className="school-brand-powered">Powered by Aidly</span>
        </span>
      )}
    </span>
  );
}
