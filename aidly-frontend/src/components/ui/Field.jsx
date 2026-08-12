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
