export function Field({ label, hint, error, required, children, className = '', style }) {
  return (
    <div className={`field ${className}`} style={style}>
      {label && (
        <label className="field-label">
          {label}
          {required && <span style={{ color: 'var(--danger)' }}> *</span>}
        </label>
      )}
      {children}
      {hint && !error && <div className="field-hint">{hint}</div>}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

// Shows a text box's length rule up front, with a live count, so people see
// "At least 10 characters (4/10)" before the backend rejects a short answer.
export function LengthHint({ value, min, max }) {
  const len = (value || '').length;
  if (min && len < min) {
    return (
      <span style={{ color: len > 0 ? 'var(--warning)' : undefined }}>
        At least {min} characters{len > 0 ? ` (${len}/${min})` : ''}
      </span>
    );
  }
  return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{max ? `${len} / ${max} characters` : `${len} characters`}</span>;
}

export function Input({ className = '', size, ...rest }) {
  return <input className={`input ${size === 'sm' ? 'input-sm' : ''} ${className}`} {...rest} />;
}

export function Textarea({ className = '', ...rest }) {
  return <textarea className={`textarea ${className}`} rows={rest.rows || 3} {...rest} />;
}

export function Select({ className = '', size, children, ...rest }) {
  return (
    <select className={`select ${size === 'sm' ? 'select-sm' : ''} ${className}`} {...rest}>
      {children}
    </select>
  );
}
