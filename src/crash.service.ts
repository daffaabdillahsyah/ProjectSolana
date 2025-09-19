import { Injectable } from '@nestjs/common';
import { createHmac, createHash, randomBytes } from 'crypto';

export type CrashState = 'IDLE' | 'COUNTDOWN' | 'RUNNING';

export interface JoinPayload {
  userId: number;
  bet: number;
  clientSeed: string;
}

export interface Player extends JoinPayload {
  cashedOut?: {
    atMultiplier: number;
    payout: number;
    atMs: number;
  };
}

export interface PlayerResult {
  userId: number;
  bet: number;
  cashedOut?: { atMultiplier: number; payout: number; atMs: number };
}

export interface CrashHistoryItem {
  roundId: string;
  resultMultiplier: number;     // display (2dp)
  resultMultiplierRaw: number;  // raw
  startedAt: number;
  finishedAt: number;
  serverSeedHash: string;
  publicSeed: string;
  players: PlayerResult[];
}

export interface CrashHistoryGroup {
  multiplier: number;           // 2dp
  count: number;
  rounds: string[];
  losers: { userId: number; bet: number }[];
}

export interface CrashRound {
  id: string;
  state: CrashState;
  countdownEndsAt: number;
  startedAt?: number;
  players: Map<number, Player>;
  // RAW utk komparasi, DISPLAY utk UI:
  crashAt: number;
  crashDisplay: number;
  publicSeed: string;
  fair: { serverSeedHash: string; nonce: number };
  ticker?: NodeJS.Timeout;
}

export interface CrashStats {
  rounds: number;
  totalStake: number;
  totalPayout: number;
  houseProfit: number;
  lastCrashMultiplier?: number;
}

@Injectable()
export class CrashService {
  private readonly serverSeed: string;
  private readonly serverSeedHash: string;
  private readonly balances = new Map<number, number>();
  private currentRound: CrashRound | null = null;
  private roundCounter = 0;
  private totalRounds = 0;
  private totalStake = 0;
  private totalPayout = 0;
  private lastCrashMultiplier?: number;
  private history: CrashHistoryItem[] = [];
  private readonly HISTORY_LIMIT = 50;

  // TUNING
  private readonly G = Math.log(2) / 10; // ~2x dalam ±10 detik
  private readonly MIN_CRASH = 1.03;     // boleh dinaikkan ke 1.05/1.08 sesuai selera

  constructor() {
    this.serverSeed = randomBytes(32).toString('hex');
    this.serverSeedHash = createHash('sha256').update(this.serverSeed).digest('hex');
  }

  getBalance(userId: number): number {
    if (!this.balances.has(userId)) {
      this.balances.set(userId, 100.0);
    }
    return this.balances.get(userId)!;
  }

  private debit(userId: number, amount: number): void {
    const currentBalance = this.getBalance(userId);
    this.balances.set(userId, currentBalance - amount);
  }

  private credit(userId: number, amount: number): void {
    const currentBalance = this.getBalance(userId);
    this.balances.set(userId, currentBalance + amount);
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private computeCrashRaw(roundId: string): number {
    // HMAC(serverSeed, roundId) → buffer 32 byte
    const h = createHmac('sha256', this.serverSeed).update(roundId).digest();

    // Ambil 64-bit pertama lalu potong jadi 52-bit MSB dengan BigInt
    let r52: number;
    try {
      const r64 = h.readBigUInt64BE(0);
      r52 = Number(r64 >> 12n);      // buang 12 LSB → 52 bit
    } catch {
      // Fallback kalau environment tidak support readBigUInt64BE
      const r52n =
        (BigInt(h[0]) << 44n) |
        (BigInt(h[1]) << 36n) |
        (BigInt(h[2]) << 28n) |
        (BigInt(h[3]) << 20n) |
        (BigInt(h[4]) << 12n) |
        (BigInt(h[5]) << 4n)  |
        (BigInt(h[6]) >> 4n);
      r52 = Number(r52n);
    }
    
    const u = (r52 + 1) / 2 ** 52;       // uniform (0,1]
    const houseEdge = 0.99;              // ~1% edge demo
    const raw = houseEdge / (1 - u);     // heavy-tail >1.0
    // RAW untuk perbandingan; jangan dibulatkan
    return Math.max(this.MIN_CRASH, Math.min(Number(raw), 1000));
  }

  private newRound(): CrashRound {
    const roundId = `cr_${Date.now()}_${++this.roundCounter}`;
    const raw = this.computeCrashRaw(roundId);
    const display = this.round2(Math.min(raw, 100));     // dibatasi 100x untuk UI
    const publicSeed = randomBytes(16).toString('hex');  // demo

    return {
      id: roundId,
      state: 'COUNTDOWN',
      countdownEndsAt: Date.now() + 10000,
      players: new Map(),
      crashAt: raw,                 // RAW dipakai logic
      crashDisplay: display,        // 2dp untuk UI/history
      publicSeed,
      fair: { serverSeedHash: this.serverSeedHash, nonce: this.roundCounter }
    };
  }

  joinOrCreate(userId: number, bet: number, clientSeed: string): { 
    roundId: string; 
    state: CrashState; 
    countdownEndsAt: number;
    error?: string;
  } {
    // Validate bet amount
    if (bet <= 0 || bet > 10) {
      return { roundId: '', state: 'IDLE', countdownEndsAt: 0, error: 'Invalid bet amount. Must be between 0.01 and 10.' };
    }

    // Check balance
    const balance = this.getBalance(userId);
    if (balance < bet) {
      return { roundId: '', state: 'IDLE', countdownEndsAt: 0, error: 'Insufficient balance' };
    }

    // Create new round if none exists or current is not in COUNTDOWN
    if (!this.currentRound || this.currentRound.state !== 'COUNTDOWN') {
      this.currentRound = this.newRound();
    }

    // Check if round is still in countdown
    if (Date.now() >= this.currentRound.countdownEndsAt) {
      return { roundId: '', state: 'IDLE', countdownEndsAt: 0, error: 'Round already started' };
    }

    // Add or update player
    const player: Player = { userId, bet, clientSeed };
    this.currentRound.players.set(userId, player);

    return {
      roundId: this.currentRound.id,
      state: this.currentRound.state,
      countdownEndsAt: this.currentRound.countdownEndsAt
    };
  }

  startIfDue(): { started: boolean; roundId?: string; lockedPlayers?: number } {
    if (!this.currentRound || this.currentRound.state !== 'COUNTDOWN') {
      return { started: false };
    }

    if (Date.now() < this.currentRound.countdownEndsAt) {
      return { started: false };
    }

    // Start the round
    this.currentRound.state = 'RUNNING';
    this.currentRound.startedAt = Date.now();

    // Debit all player stakes
    for (const [userId, player] of this.currentRound.players) {
      this.debit(userId, player.bet);
      this.totalStake += player.bet;
    }

    this.totalRounds++;

    return {
      started: true,
      roundId: this.currentRound.id,
      lockedPlayers: this.currentRound.players.size
    };
  }

  getCurrentMultiplier(): number {
    if (!this.currentRound || !this.currentRound.startedAt || this.currentRound.state !== 'RUNNING') {
      return 1.00;
    }

    const elapsedSeconds = (Date.now() - this.currentRound.startedAt) / 1000;
    const multiplier = Math.exp(this.G * elapsedSeconds);
    return this.round2(multiplier);
  }

  shouldCrash(): boolean {
    if (!this.currentRound || this.currentRound.state !== 'RUNNING') return false;
    return this.getCurrentMultiplier() >= this.currentRound.crashAt; // bandingkan ke RAW
  }

  cashout(userId: number): {
    success: boolean;
    atMultiplier?: number;
    payout?: number;
    balanceAfter?: number;
    error?: string;
  } {
    if (!this.currentRound || this.currentRound.state !== 'RUNNING') {
      return { success: false, error: 'No active round or round not running' };
    }

    const player = this.currentRound.players.get(userId);
    if (!player) {
      return { success: false, error: 'Player not in current round' };
    }

    if (player.cashedOut) {
      return { success: false, error: 'Already cashed out' };
    }

    // Check if crash already happened
    if (this.shouldCrash()) {
      return { success: false, error: 'Round already crashed' };
    }

    const currentMultiplier = this.getCurrentMultiplier();
    const payout = this.round2(player.bet * currentMultiplier);

    // Mark player as cashed out
    player.cashedOut = {
      atMultiplier: currentMultiplier,
      payout,
      atMs: Date.now()
    };

    // Credit payout
    this.credit(userId, payout);
    this.totalPayout += payout;

    return {
      success: true,
      atMultiplier: currentMultiplier,
      payout,
      balanceAfter: this.round2(this.getBalance(userId))
    };
  }

  finishRound(): { roundId: string; crashMultiplier: number; durationMs: number } | null {
    if (!this.currentRound || !this.currentRound.startedAt) return null;

    const r = this.currentRound;
    const roundId = r.id;
    const durationMs = Date.now() - r.startedAt;

    // Untuk UI/stats terakhir
    this.lastCrashMultiplier = r.crashDisplay;

    // simpan history dengan nilai display
    const item: CrashHistoryItem = {
      roundId,
      resultMultiplier: r.crashDisplay,
      resultMultiplierRaw: r.crashAt,
      startedAt: r.startedAt,
      finishedAt: Date.now(),
      serverSeedHash: r.fair.serverSeedHash,
      publicSeed: r.publicSeed,
      players: Array.from(r.players.values()).map(p => ({
        userId: p.userId, bet: p.bet, cashedOut: p.cashedOut ? { ...p.cashedOut } : undefined
      })),
    };

    this.history.unshift(item);
    if (this.history.length > this.HISTORY_LIMIT) this.history.pop();

    if (r.ticker) clearInterval(r.ticker);
    this.currentRound = null;

    return { roundId, crashMultiplier: this.lastCrashMultiplier, durationMs };
  }

  getHistory(limit = 30): CrashHistoryItem[] {
    return this.history.slice(0, Math.max(1, Math.min(limit, this.HISTORY_LIMIT)));
  }

  // history versi dedup per multiplier (chip unik + count + losers)
  getHistoryDedup(limit = 20): CrashHistoryGroup[] {
    const groups = new Map<number, CrashHistoryGroup>();

    for (const h of this.history) {
      const key = Number(h.resultMultiplier.toFixed(2)); // 2dp
      if (!groups.has(key)) {
        groups.set(key, { multiplier: key, count: 0, rounds: [], losers: [] });
      }
      const g = groups.get(key)!;
      g.count += 1;
      g.rounds.push(h.roundId);

      // losers = yang tidak cashout pada round itu
      for (const p of h.players) {
        if (!p.cashedOut) g.losers.push({ userId: p.userId, bet: p.bet });
      }
    }

    // urut paling baru (sesuai urutan muncul di history)
    const ordered: CrashHistoryGroup[] = [];
    const seen = new Set<number>();
    for (const h of this.history) {
      const key = Number(h.resultMultiplier.toFixed(2));
      if (!seen.has(key)) {
        ordered.push(groups.get(key)!);
        seen.add(key);
        if (ordered.length >= limit) break;
      }
    }
    return ordered;
  }

  getCurrentRound(): CrashRound | null { 
    return this.currentRound; 
  }

  getPublicFair(): { serverSeedHash: string } { 
    return { serverSeedHash: this.serverSeedHash }; 
  }

  getStats(): CrashStats {
    return {
      rounds: this.totalRounds,
      totalStake: this.round2(this.totalStake),
      totalPayout: this.round2(this.totalPayout),
      houseProfit: this.round2(this.totalStake - this.totalPayout),
      lastCrashMultiplier: this.lastCrashMultiplier
    };
  }
}
