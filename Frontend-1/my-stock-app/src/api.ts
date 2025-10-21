// src/api.ts
export const apiBase = import.meta.env.VITE_API_BASE || '';
export function apiUrl(path: string) {
  // ensure leading slash
  if (!path.startsWith('/')) path = '/' + path;
  return `${apiBase}${path}`;
}
