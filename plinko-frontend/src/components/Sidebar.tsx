'use client';

import { BetResponse, StatsData } from '@/lib/api';

interface SidebarProps {
  balance: number;
  stats: StatsData;
  lastResult?: BetResponse;
  betHistory: BetResponse[];
}

export default function Sidebar({
  balance,
  stats,
  lastResult,
  betHistory,
}: SidebarProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'win':
        return 'text-green-400';
      case 'loss':
        return 'text-red-400';
      case 'push':
        return 'text-gray-400';
      default:
        return 'text-white';
    }
  };

  const getResultBg = (result: string) => {
    switch (result) {
      case 'win':
        return 'bg-green-900/20 border-green-400/30';
      case 'loss':
        return 'bg-red-900/20 border-red-400/30';
      case 'push':
        return 'bg-gray-900/20 border-gray-400/30';
      default:
        return 'bg-gray-900/20 border-gray-400/30';
    }
  };

  return (
    <div className="w-80 space-y-6">
      {/* Connect Button */}
      <div className="flex justify-end">
        <button className="bg-lime-400 hover:bg-lime-500 text-black font-semibold px-6 py-2 rounded-xl transition-colors">
          Connect
        </button>
      </div>

      {/* Balance & Stats Card */}
      <div className="bg-gray-900 p-6 rounded-2xl shadow-lg">
        <h3 className="text-white text-lg font-semibold mb-4">Total Bankroll Value</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Balance:</span>
            <span className="text-white font-semibold">{formatCurrency(balance)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">House Profit:</span>
            <span className="text-white font-semibold">{formatCurrency(stats.houseProfit)}</span>
          </div>
        </div>
      </div>

      {/* Verify Section */}
      <div className="bg-gray-900 p-4 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Verify</span>
          <button className="text-lime-400 text-sm hover:text-lime-300 transition-colors">
            View
          </button>
        </div>
        <div className="mt-2">
          <span className="text-xs text-gray-500 font-mono break-all">
            {stats.serverSeedHash.substring(0, 16)}...
          </span>
        </div>
      </div>

      {/* Last Result */}
      {lastResult && (
        <div className={`p-4 rounded-2xl shadow-lg border ${getResultBg(lastResult.result)}`}>
          <h4 className="text-white font-semibold mb-3">Last Result</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Multiplier:</span>
              <span className="text-white font-semibold">{lastResult.multiplier}x</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Payout:</span>
              <span className="text-white font-semibold">{formatCurrency(lastResult.payout)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Result:</span>
              <span className={`font-semibold capitalize ${getResultColor(lastResult.result)}`}>
                {lastResult.result}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Balance After:</span>
              <span className="text-white font-semibold">{formatCurrency(lastResult.balanceAfter)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Gem Collection */}
      <div className="bg-gray-900 p-6 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white font-semibold">Gem Collection</h4>
          <button className="text-lime-400 text-sm hover:text-lime-300 transition-colors">
            View All
          </button>
        </div>
        <div className="text-center py-8">
          <div className="text-gray-500 text-sm">No Gems Yet</div>
          <div className="text-gray-600 text-xs mt-1">
            Play more to collect Gems and exchange them for cash rewards.
          </div>
        </div>
      </div>

      {/* Recent Bets History */}
      {betHistory.length > 0 && (
        <div className="bg-gray-900 p-6 rounded-2xl shadow-lg">
          <h4 className="text-white font-semibold mb-4">Recent Bets</h4>
          <div className="space-y-2">
            {betHistory.slice(-5).reverse().map((bet, index) => (
              <div key={bet.betId} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-b-0">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">#{betHistory.length - index}</span>
                  <span className="text-sm text-white">{bet.multiplier}x</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-white">{formatCurrency(bet.payout)}</span>
                  <span className={`text-xs capitalize ${getResultColor(bet.result)}`}>
                    {bet.result}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
