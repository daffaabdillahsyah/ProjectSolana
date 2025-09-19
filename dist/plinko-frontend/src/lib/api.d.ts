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
export declare function getFair(): Promise<FairData>;
export declare function getBalance(): Promise<BalanceData>;
export declare function getStats(): Promise<StatsData>;
