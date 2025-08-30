'use client';

import { useState, useEffect } from 'react';
import Controls from '@/components/Controls';
import PlinkoBoard from '@/components/PlinkoBoard';
import Sidebar from '@/components/Sidebar';
import { getFair, getBalance, getStats, placeBet, BetResponse } from '@/lib/api';

export default function Home() {
  // Game state
  const [bet, setBet] = useState(1.0);
  const [risk, setRisk] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [rows] = useState(8);
  const [balls] = useState(1);
  const [clientSeed, setClientSeed] = useState('');
  
  // API data state
  const [balance, setBalance] = useState(0);
  const [stats, setStats] = useState({
    totalBets: 0,
    totalStake: 0,
    totalPayout: 0,
    houseProfit: 0,
    winCount: 0,
    lossCount: 0,
    pushCount: 0,
    winRate: '0.0%',
    lossRate: '0.0%',
    serverSeedHash: ''
  });
  const [lastResult, setLastResult] = useState<BetResponse | undefined>();
  const [betHistory, setBetHistory] = useState<BetResponse[]>([]);
  
  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const [ballPath, setBallPath] = useState<number[]>([]);
  const [finalBin, setFinalBin] = useState<number | undefined>();
  
  // Toast state
  const [toast, setToast] = useState<{
    message: string;
    type: 'win' | 'loss' | 'push';
  } | null>(null);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [fairData, balanceData, statsData] = await Promise.all([
          getFair(),
          getBalance(),
          getStats(),
        ]);
        
        setStats(statsData);
        setBalance(balanceData.balance);
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };

    loadInitialData();
  }, []);

  const handleDropBall = async () => {
    if (isAnimating) return;

    try {
      setIsAnimating(true);
      
      const result = await placeBet({
        bet,
        rows,
        risk,
        clientSeed,
      });

      // Update state with result
      setLastResult(result);
      setBetHistory(prev => [...prev, result]);
      setBallPath(result.path);
      setFinalBin(result.bin);
      setBalance(result.balanceAfter);

      // Show toast after animation
      setTimeout(() => {
        setToast({
          message: `${result.result.toUpperCase()}: ${result.multiplier}x - $${result.payout.toFixed(2)}`,
          type: result.result,
        });
        
        // Hide toast after 3 seconds
        setTimeout(() => setToast(null), 3000);
      }, (result.path.length + 1) * 180 + 500);

      // Refresh stats
      const statsData = await getStats();
      setStats(statsData);

    } catch (error) {
      console.error('Failed to place bet:', error);
      setIsAnimating(false);
    }
  };

  const handleAnimationComplete = () => {
    setIsAnimating(false);
  };

  const getToastStyles = (type: string) => {
    switch (type) {
      case 'win':
        return 'bg-green-600 border-green-400';
      case 'loss':
        return 'bg-red-600 border-red-400';
      case 'push':
        return 'bg-gray-600 border-gray-400';
      default:
        return 'bg-gray-600 border-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="flex justify-between items-center p-6 border-b border-gray-800">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-lime-400 rounded-lg flex items-center justify-center">
            <span className="text-black font-bold text-sm">🍀</span>
          </div>
          <h1 className="text-xl font-bold">LUCK.IO</h1>
        </div>
        <nav className="flex items-center space-x-6">
          <button className="text-gray-400 hover:text-white transition-colors">
            🎲 Slots
          </button>
          <button className="text-lime-400 font-semibold">
            🎯 Classics
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <div className="flex gap-6 p-6 h-[calc(100vh-88px)]">
        {/* Left Panel - Controls */}
        <Controls
          bet={bet}
          setBet={setBet}
          risk={risk}
          setRisk={setRisk}
          rows={rows}
          balls={balls}
          clientSeed={clientSeed}
          setClientSeed={setClientSeed}
          onDropBall={handleDropBall}
          isAnimating={isAnimating}
        />

        {/* Center - Plinko Board */}
        <PlinkoBoard
          rows={rows}
          path={ballPath}
          isAnimating={isAnimating}
          onAnimationComplete={handleAnimationComplete}
          finalBin={finalBin}
          risk={risk}
        />

        {/* Right Panel - Sidebar */}
        <Sidebar
          balance={balance}
          stats={stats}
          lastResult={lastResult}
          betHistory={betHistory}
        />
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 px-6 py-4 rounded-xl border-2 text-white font-semibold shadow-lg z-50 animate-slide-in ${getToastStyles(toast.type)}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
