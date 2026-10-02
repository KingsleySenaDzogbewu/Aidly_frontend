// Same rules as the backend, checked first so a wrong file fails instantly.
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PHOTO_ACCEPT = PHOTO_TYPES.join(',');
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export function photoProblem(file) {
  if (!file) return 'Choose a photo.';
  if (!PHOTO_TYPES.includes(file.type)) return 'Use a JPEG, PNG or WebP picture.';
  if (file.size > MAX_PHOTO_BYTES) return `That picture is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.`;
  return '';
}
