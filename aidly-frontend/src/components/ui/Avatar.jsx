import { useState } from 'react';
import { initials } from '../../utils/format';

/**
 * A person's round photo, or their initials when there's no photo (or it
 * fails to load).
 *  - src: profileImageUrl
 *  - name: full name, or firstName/lastName, or email for the initials
 */
export default function Avatar({ src, name, firstName, lastName, email, size = 34, className = '', style }) {
  const [failedSrc, setFailedSrc] = useState(null);
  let first = firstName;
  let last = lastName;
  if (!first && !last && name) {
    const [f, ...rest] = String(name).trim().split(/\s+/);
    first = f;
    last = rest.join(' ');
  }
  const showPhoto = !!src && failedSrc !== src;
  const label = name || [firstName, lastName].filter(Boolean).join(' ') || email || '';
  return (
    <span
      className={`avatar ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.36)), overflow: 'hidden', ...style }}
      role={showPhoto ? undefined : 'img'}
      aria-label={showPhoto ? undefined : label || undefined}
    >
      {showPhoto ? (
        <img
          src={src}
          alt={label}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(src)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : initials(first, last, email)}
    </span>
  );
}
