import { useEffect, useRef, useState } from 'react';
import { UserApi } from '../../api/endpoints';
import { Avatar, Button, useToast } from '../../components/ui';
import { PHOTO_ACCEPT, photoProblem } from './photoUtils';

/**
 * Change or remove someone's photo, saved straight away.
 *  - userId: 'me' for your own, or another person's User.id
 *  - src: their current profileImageUrl
 *  - onChanged(url | null)
 */
export default function PhotoEditor({ userId, src, name, size = 88, onChanged }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState('');

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const choose = (e) => {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    const problem = photoProblem(picked);
    if (problem) { toast.error(problem); return; }
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  const cancel = () => { setFile(null); setPreview(null); };

  const save = async () => {
    setBusy('save');
    try {
      const res = await UserApi.uploadPhoto(userId, file);
      toast.success('Photo saved');
      cancel();
      onChanged?.(res?.profileImageUrl ?? null);
    } catch (err) { toast.error(err.message); }
    finally { setBusy(''); }
  };

  const remove = async () => {
    if (!window.confirm(userId === 'me' ? 'Remove your photo?' : `Remove ${name || 'this person'}’s photo?`)) return;
    setBusy('remove');
    try {
      await UserApi.removePhoto(userId);
      toast.success('Photo removed');
      onChanged?.(null);
    } catch (err) { toast.error(err.message); }
    finally { setBusy(''); }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <Avatar src={preview || src} name={name} size={size} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input ref={inputRef} type="file" accept={PHOTO_ACCEPT} onChange={choose} hidden />
        {file ? (
          <>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Preview - save to use it.</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button size="sm" loading={busy === 'save'} onClick={save}>Save photo</Button>
              <Button size="sm" variant="ghost" onClick={cancel} disabled={!!busy}>Cancel</Button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={!!busy}>
                {src ? 'Change photo' : 'Upload photo'}
              </Button>
              {src && <Button size="sm" variant="ghost" loading={busy === 'remove'} onClick={remove}>Remove</Button>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>JPEG, PNG or WebP, up to 5 MB.</div>
          </>
        )}
      </div>
    </div>
  );
}
