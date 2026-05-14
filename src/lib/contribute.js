// Contribute flow — sends user-measured spool weights to the Apps Script Web App
// that fronts the Google Sheet at:
//   https://docs.google.com/spreadsheets/d/1idl558M-zNY70qAzq89uUnyKYhOy0rJzmWw5GexVQiY
//
// To wire your real endpoint:
//   1. Follow docs/apps-script.gs to deploy the receiver.
//   2. Replace ENDPOINT below with the deployed Web app URL.
//
// Until then the form shows "service not configured yet".

export const ENDPOINT = 'https://script.google.com/macros/s/AKfycbzJbqQmLRmmUnbyeYP3pc_87n1I_B2w9Q0Xx3nKePKrT3uO04fEbu1esjTEgA7Ze9C69g/exec';

export function isConfigured() {
  return !ENDPOINT.includes('REPLACE_ME');
}

// Read a File as base64 dataURL.
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

// Compress an image to ~1024px on the long side, JPEG ~0.8.
async function compressImage(file) {
  if (!file || !/^image\//.test(file.type)) return '';
  const dataUrl = await fileToDataUrl(file);
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  const MAX = 1024;
  const ratio = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * ratio);
  const h = Math.round(img.naturalHeight * ratio);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  return c.toDataURL('image/jpeg', 0.82);
}

export async function submitContribution(filament, { weight, comment, nick, photoFile }) {
  if (!isConfigured()) {
    throw new Error('not_configured');
  }
  const photoDataUrl = await compressImage(photoFile);
  const payload = {
    filamentId: filament.id,
    brandMaterial: `${filament.manufacturer} ${filament.material} ${filament.netWeight}г`,
    spoolWeight: Number(weight),
    comment: comment || '',
    nick: nick || '',
    photoDataUrl,
  };
  const resp = await fetch(ENDPOINT, {
    method: 'POST',
    // Apps Script accepts text/plain to avoid CORS preflight troubles
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  // Apps Script wraps under 200 even on error; parse JSON
  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('bad_response'); }
  if (!data.ok) throw new Error(data.error || 'failed');
  return data;
}
