import { RiskLevel } from './payouts';
export interface GameResult {
    path: number[];
    bin: number;
    multiplier: number;
    payout: number;
}
export interface UserFair {
    clientSeed: string;
    nonce: number;
}
export interface BetRecord {
    betId: string;
    userId: number;
    bet: number;
    rows: number;
    risk: RiskLevel;
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
export declare class PlinkoService {
    private readonly serverSeed;
    private readonly serverSeedHash;
    private readonly balances;
    private readonly userFair;
    private readonly bets;
    private betCounter;
    private totalBets;
    private totalStake;
    private totalPayout;
    private winCount;
    private lossCount;
    private pushCount;
    constructor();
    getServerSeedHash(): string;
    getBalance(userId: number): number;
    private generateRandomClientSeed;
    private generateBytes;
    private runPlinkoEngine;
    private round2;
    placeBet(userId: number, bet: number, rows: number, risk: RiskLevel, clientSeed?: string): BetRecord;
    getStats(): {
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
    };
}
