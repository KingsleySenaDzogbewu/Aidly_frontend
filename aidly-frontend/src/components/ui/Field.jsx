import { Children, cloneElement, isValidElement, useId } from 'react';

const isControl = (el) => isValidElement(el)
  && (el.type === Input || el.type === Select || el.type === Textarea
    || el.type === 'input' || el.type === 'select' || el.type === 'textarea');

// Gives the field's control an id (unless it has one) and points it at the
// hint/error text. Also looks one level into a wrapper, e.g. a password box
// wrapped in a div with a show/hide button.
function linkControl(children, controlProps) {
  let linked = false;
  const link = (el) => {
    if (linked || !isControl(el)) return el;
    linked = true;
    return cloneElement(el, { id: el.props.id || controlProps.id, ...controlProps.extra });
  };
  const out = Children.map(children, (child) => {
    if (isControl(child)) return link(child);
    if (isValidElement(child) && child.props.children) {
      return cloneElement(child, {}, Children.map(child.props.children, link));
    }
    return child;
  });
  return { out, linked };
}

// A label + control + hint/error. The label is linked to the control
// (htmlFor/id), so tapping it focuses the box and screen readers announce the
// field's name; the hint/error is announced as the box's description.
export function Field({ label, hint, error, required, children, className = '', style }) {
  const baseId = useId();
  const controlId = `${baseId}-control`;
  const describedBy = error ? `${baseId}-error` : hint ? `${baseId}-hint` : undefined;
  const { out, linked } = linkControl(children, {
    id: controlId,
    extra: { 'aria-describedby': describedBy, ...(error ? { 'aria-invalid': true } : {}) },
  });
  // If the control already had its own id, point the label at that.
  const firstControl = (() => {
    let found = null;
    Children.forEach(children, (c) => {
      if (found) return;
      if (isControl(c)) found = c;
      else if (isValidElement(c)) Children.forEach(c.props.children, (cc) => { if (!found && isControl(cc)) found = cc; });
    });
    return found;
  })();
  const labelFor = linked ? (firstControl?.props.id || controlId) : undefined;

  return (
    <div className={`field ${className}`} style={style}>
      {label && (
        <label className="field-label" htmlFor={labelFor}>
          {label}
          {required && <span style={{ color: 'var(--danger)' }} aria-hidden="true"> *</span>}
        </label>
      )}
      {out}
      {hint && !error && <div className="field-hint" id={`${baseId}-hint`}>{hint}</div>}
      {error && <div className="field-error" id={`${baseId}-error`}>{error}</div>}
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
