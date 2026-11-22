// localStorage helpers. The README always said chats were "saved locally" but
// nothing was ever written anywhere, so a refresh wiped everything.
//
// Every call is wrapped in try/catch: Safari private mode throws on setItem,
// and the quota (~5 MB) runs out quickly if someone pastes huge documents.

const KEY = "aichat:v2";

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.warn("could not persist chats:", err.message);
    return false;
  }
}

export function clearState() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
