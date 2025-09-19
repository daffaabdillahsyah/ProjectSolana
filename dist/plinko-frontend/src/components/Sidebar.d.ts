interface BetResult {
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
interface SidebarProps {
    balance: number;
    houseProfit: number;
    serverSeedHash: string;
    lastResult?: BetResult;
    betHistory: BetResult[];
}
export default function Sidebar({ balance, houseProfit, serverSeedHash, lastResult, betHistory }: SidebarProps): import("react").JSX.Element;
export {};
