/**
 * Whether the IIM Calcutta logo prints in the header. Off by default; there
 * is no control for it in the UI. The owner turns it on or off for their own
 * browser by opening the site once with ?__iimc_logo=on (or =off); the choice
 * is remembered in this browser and the parameter is removed from the URL.
 * Hidden or shown, nothing else on the page moves.
 */
const KEY = 'iimc-resume-builder:show-logo';
const PARAM = '__iimc_logo';

/** Apply ?__iimc_logo=on|off if present, then drop it from the address bar. */
export function applyLogoSwitchFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    const v = url.searchParams.get(PARAM);
    if (v === null) return;
    if (v === 'on') localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
    url.searchParams.delete(PARAM);
    window.history.replaceState(null, '', url.toString());
  } catch {
    /* Storage blocked: the logo simply stays off. */
  }
}

export function showLogo(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}
