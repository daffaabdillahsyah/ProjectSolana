'use client';

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

export default function Sidebar({ 
  balance, 
  houseProfit, 
  serverSeedHash, 
  lastResult, 
  betHistory 
}: SidebarProps) {
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString();
  };

  const getResultColor = (result: 'win' | 'loss' | 'push') => {
    switch (result) {
      case 'win':
        return 'text-green-400';
      case 'loss':
        return 'text-red-400';
      case 'push':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="w-80 space-y-6">
      {/* Total Bankroll Value Card */}
      <div className="bg-gray-900 p-6 rounded-2xl shadow-lg">
        <h3 className="text-white text-lg font-semibold mb-4">Total Bankroll Value</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">Balance</span>
            <span className="text-lime-400 text-xl font-bold">${balance.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">House Profit</span>
            <span className="text-white text-sm font-medium">${houseProfit.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Verify Card */}
      <div className="bg-gray-900 p-6 rounded-2xl shadow-lg">
        <h3 className="text-white text-lg font-semibold mb-4">Verify</h3>
        <div className="space-y-2">
          <span className="text-gray-400 text-xs">Server Seed Hash</span>
          <div className="bg-gray-800 p-3 rounded-lg">
            <span className="text-white text-xs font-mono break-all">
              {serverSeedHash}
            </span>
          </div>
        </div>
      </div>

      {/* Last Result Card */}
      {lastResult && (
        <div className="bg-gray-900 p-6 rounded-2xl shadow-lg">
          <h3 className="text-white text-lg font-semibold mb-4">Last Result</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Multiplier</span>
              <span className="text-white text-lg font-bold">{lastResult.multiplier}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Payout</span>
              <span className="text-white text-sm font-medium">${lastResult.payout.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Result</span>
              <span className={`text-sm font-medium capitalize ${getResultColor(lastResult.result)}`}>
                {lastResult.result}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Balance After</span>
              <span className="text-white text-sm font-medium">${lastResult.balanceAfter.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Time</span>
              <span className="text-white text-sm font-medium">{formatTime(lastResult.createdAt)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Mini History (last 5 results) */}
      {betHistory.length > 0 && (
        <div className="bg-gray-900 p-6 rounded-2xl shadow-lg">
          <h3 className="text-white text-lg font-semibold mb-4">Recent History</h3>
          <div className="space-y-2">
            {betHistory.slice(-5).reverse().map((bet) => (
              <div key={bet.betId} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-b-0">
                <div className="flex flex-col">
                  <span className={`text-sm font-medium ${getResultColor(bet.result)}`}>
                    {bet.multiplier}x
                  </span>
                  <span className="text-xs text-gray-500">{formatTime(bet.createdAt)}</span>
                </div>
                <div className="text-right">
                  <div className="text-white text-sm font-medium">${bet.payout.toFixed(2)}</div>
                  <div className={`text-xs capitalize ${getResultColor(bet.result)}`}>
                    {bet.result}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
