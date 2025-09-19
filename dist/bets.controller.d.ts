import { PlinkoService } from './plinko.service';
import { RiskLevel } from './payouts';
interface PlinkoBetRequest {
    bet: number;
    rows: number;
    risk: RiskLevel;
    clientSeed?: string;
}
export declare class BetsController {
    private readonly plinkoService;
    constructor(plinkoService: PlinkoService);
    getCurrentFair(): {
        serverSeedHash: string;
    };
    getBalance(userIdHeader?: string): {
        balance: number;
    };
    placePlinkoBet(body: PlinkoBetRequest, userIdHeader?: string): {
        betId: string;
        path: number[];
        bin: number;
        multiplier: number;
        payout: number;
        result: "win" | "loss" | "push";
        proof: {
            serverSeedHash: string;
            clientSeed: string;
            nonce: number;
        };
        balanceAfter: number;
        createdAt: string;
    };
    getDemoStats(): {
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
export {};
