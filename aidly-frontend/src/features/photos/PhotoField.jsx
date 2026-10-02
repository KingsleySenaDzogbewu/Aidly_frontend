import { useEffect, useRef, useState } from 'react';
import { Avatar, Button, useToast } from '../../components/ui';
import { PHOTO_ACCEPT, photoProblem } from './photoUtils';

/**
 * Optional photo on an "add a person" form: picks and previews a file, and
 * the form uploads it once the account exists.
 *  - value: File | null, onChange(File | null)
 */
export default function PhotoField({ value, onChange, name }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!value) { setPreview(null); return undefined; }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const choose = (e) => {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    const problem = photoProblem(picked);
    if (problem) { toast.error(problem); return; }
    onChange(picked);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <Avatar src={preview} name={name || '?'} size={56} />
      <input ref={inputRef} type="file" accept={PHOTO_ACCEPT} onChange={choose} hidden />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>{value ? 'Change photo' : 'Choose photo'}</Button>
        {value && <Button size="sm" variant="ghost" onClick={() => onChange(null)}>Remove</Button>}
      </div>
    </div>
  );
}
