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
export interface CrashRound {
    id: string;
    state: CrashState;
    countdownEndsAt: number;
    startedAt?: number;
    players: Map<number, Player>;
    crashMultiplier: number;
    fair: {
        serverSeedHash: string;
        nonce: number;
    };
    ticker?: NodeJS.Timeout;
}
export interface CrashStats {
    rounds: number;
    totalStake: number;
    totalPayout: number;
    houseProfit: number;
    lastCrashMultiplier?: number;
}
export declare class CrashService {
    private readonly serverSeed;
    private readonly serverSeedHash;
    private readonly balances;
    private currentRound;
    private roundCounter;
    private totalRounds;
    private totalStake;
    private totalPayout;
    private lastCrashMultiplier?;
    private readonly G;
    constructor();
    getBalance(userId: number): number;
    private debit;
    private credit;
    private round2;
    private computeCrashMultiplier;
    private newRound;
    joinOrCreate(userId: number, bet: number, clientSeed: string): {
        roundId: string;
        state: CrashState;
        countdownEndsAt: number;
        error?: string;
    };
    startIfDue(): {
        started: boolean;
        roundId?: string;
        lockedPlayers?: number;
    };
    getCurrentMultiplier(): number;
    shouldCrash(): boolean;
    cashout(userId: number): {
        success: boolean;
        atMultiplier?: number;
        payout?: number;
        balanceAfter?: number;
        error?: string;
    };
    finishRound(): {
        roundId: string;
        crashMultiplier: number;
        durationMs: number;
    } | null;
    getCurrentRound(): CrashRound | null;
    getPublicFair(): {
        serverSeedHash: string;
    };
    getStats(): CrashStats;
}
