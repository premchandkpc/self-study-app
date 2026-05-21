const BASE = import.meta.env.VITE_API_URL || '';

export async function apiFetch(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}
