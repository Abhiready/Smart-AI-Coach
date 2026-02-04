// src/api.ts

// If deployed, you set VITE_API_BASE in Vercel
// If local, keep it empty so Vite proxy works
export const apiBase =
  import.meta.env.VITE_API_BASE || "";

// Helper to build full API URL
export function apiUrl(path: string) {
  if (!path.startsWith("/")) path = "/" + path;

  // Local mode → "" + "/api/..." → proxy sends to Flask
  // Deploy mode → "https://render..." + "/api/..." → direct backend
  return `${apiBase}${path}`;
}
