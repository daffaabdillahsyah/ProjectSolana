const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000';

export const getCrashFair = () => fetch(`${BASE}/crash/fair`).then(r => r.json());
export const getCrashStats = () => fetch(`${BASE}/crash/stats`).then(r => r.json());

export async function getCrashHistoryDedup(limit = 20) {
  const res = await fetch(`${BASE}/crash/history/dedup?limit=${limit}`, { cache: 'no-store' });
  return res.json();
}

export async function getCrashHistory(limit = 30) {
  const res = await fetch(`${BASE}/crash/history?limit=${limit}`, { cache: 'no-store' });
  return res.json();
}

export async function getCrashRoundDetail(id: string) {
  const res = await fetch(`${BASE}/crash/history/${id}`, { cache: 'no-store' });
  return res.json();
}
