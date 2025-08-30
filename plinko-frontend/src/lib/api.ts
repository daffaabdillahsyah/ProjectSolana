const API = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000';
const USER_ID = '1';

export interface FairData {
  serverSeedHash: string;
}

export interface BalanceData {
  balance: number;
}

export interface StatsData {
  totalBets: number;
  totalStake: number;
  totalPayout: number;
  houseProfit: number;
  winCount: number;
  lossCount: number;
  pushCount: number;
  winRate: string;
  lossRate: string;
  serverSeedHash: string;
}

export interface BetRequest {
  bet: number;
  rows: number;
  risk: 'easy' | 'medium' | 'hard';
  clientSeed?: string;
}

export interface BetResponse {
  betId: string;
  path: number[];
  bin: number;
  multiplier: number;
  payout: number;
  result: 'win' | 'loss' | 'push';
  proof: {
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
  };
  balanceAfter: number;
  createdAt: string;
}

export async function getFair(): Promise<FairData> {
  const response = await fetch(`${API}/fair/current`);
  if (!response.ok) {
    throw new Error('Failed to fetch fair data');
  }
  return response.json();
}

export async function getBalance(): Promise<BalanceData> {
  const response = await fetch(`${API}/demo/balance`, {
    headers: {
      'x-user-id': USER_ID,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch balance');
  }
  return response.json();
}

export async function getStats(): Promise<StatsData> {
  const response = await fetch(`${API}/demo/stats`);
  if (!response.ok) {
    throw new Error('Failed to fetch stats');
  }
  return response.json();
}

export async function placeBet(body: BetRequest): Promise<BetResponse> {
  const response = await fetch(`${API}/bets/plinko`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': USER_ID,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error('Failed to place bet');
  }
  return response.json();
}
