'use client';

import { useState, useEffect } from 'react';
import Controls from '@/components/Controls';
import PlinkoBoard from '@/components/PlinkoBoard';
import Sidebar from '@/components/Sidebar';
import { getFair, getBalance, getStats } from '@/lib/api';
import { socket } from '@/lib/socket';
import { FIXED_ROWS, FIXED_RISK } from '@/lib/constants';

type RoundState = 'IDLE' | 'COUNTDOWN' | 'RUNNING';

type BetResult = {
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
};

type RoundUpdate = {
  state: RoundState;
  roundId: string | null;
  players: number;
  timeLeftMs: number;
};

export default function PlinkoPage() {
  // Game state
  const [bet, setBet] = useState(1.0);
  const [clientSeed, setClientSeed] = useState('');
  
  // Round state
  const [roundState, setRoundState] = useState<RoundState>('IDLE');
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [players, setPlayers] = useState(0);
  const [joined, setJoined] = useState(false);
  
  // API data state
  const [balance, setBalance] = useState(0);
  const [houseProfit, setHouseProfit] = useState(0);
  const [serverSeedHash, setServerSeedHash] = useState('');
  const [lastResult, setLastResult] = useState<BetResult | undefined>();
  const [betHistory, setBetHistory] = useState<BetResult[]>([]);
  
  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const [ballPath, setBallPath] = useState<number[]>([]);
  const [finalBin, setFinalBin] = useState<number | undefined>();

  // Generate random client seed on mount
  useEffect(() => {
    if (!clientSeed) {
      const randomSeed = Array.from({ length: 16 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      setClientSeed(randomSeed);
    }
  }, [clientSeed]);

  // Load initial data and setup socket
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [fairData, balanceData, statsData] = await Promise.all([
          getFair(),
          getBalance(),
          getStats(),
        ]);
        
        setBalance(balanceData.balance);
        setHouseProfit(statsData.houseProfit);
        setServerSeedHash(fairData.serverSeedHash);
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };

    loadInitialData();

    // Socket event handlers
    const handleRoundUpdate = (update: RoundUpdate) => {
      setRoundState(update.state);
      setPlayers(update.players);
      setTimeLeftMs(update.timeLeftMs);
      
      if (update.state === 'IDLE') {
        setJoined(false);
      }
    };

    const handleJoined = (response: { roundId: string; userId: number }) => {
      console.log('Joined round:', response);
      setJoined(true);
    };

    const handleRoundStarted = (data: { roundId: string; lockedPlayers: number; startedAt: number }) => {
      console.log('Round started:', data);
      setRoundState('RUNNING');
    };

    const handleYourResult = (result: BetResult & { roundId: string }) => {
      console.log('Your result:', result);
      
      // Update state with result
      setLastResult(result);
      setBetHistory(prev => [...prev, result]);
      setBallPath(result.path);
      setFinalBin(result.bin);
      setBalance(result.balanceAfter);
      setIsAnimating(true);

      // Refresh stats
      refreshBalanceAndStats();
    };

    const handleRoundFinished = (data: { roundId: string; durationMs: number }) => {
      console.log('Round finished:', data);
      setTimeout(() => {
        setJoined(false);
      }, 600);
    };

    // Register socket listeners
    socket.on('round_update', handleRoundUpdate);
    socket.on('joined', handleJoined);
    socket.on('round_started', handleRoundStarted);
    socket.on('your_result', handleYourResult);
    socket.on('round_finished', handleRoundFinished);

    return () => {
      socket.off('round_update', handleRoundUpdate);
      socket.off('joined', handleJoined);
      socket.off('round_started', handleRoundStarted);
      socket.off('your_result', handleYourResult);
      socket.off('round_finished', handleRoundFinished);
    };
  }, []);

  const refreshBalanceAndStats = async () => {
    try {
      const [balanceData, statsData] = await Promise.all([
        getBalance(),
        getStats(),
      ]);
      setBalance(balanceData.balance);
      setHouseProfit(statsData.houseProfit);
    } catch (error) {
      console.error('Failed to refresh balance and stats:', error);
    }
  };

  const handleJoinRound = () => {
    socket.emit('join_round', {
      userId: 1,
      bet,
      risk: FIXED_RISK,
      rows: FIXED_ROWS,
      clientSeed,
    });
  };

  const handleAnimationComplete = () => {
    setIsAnimating(false);
  };

  const getButtonText = () => {
    if (roundState === 'RUNNING') return 'Dropping...';
    if (joined && roundState === 'COUNTDOWN') return 'Joined - Waiting...';
    if (roundState === 'COUNTDOWN') return 'Join Round';
    return 'Start / Join Round';
  };

  const isButtonDisabled = () => {
    return isAnimating || 
           roundState === 'RUNNING' || 
           (joined && roundState === 'COUNTDOWN');
  };

  const getRoundStatus = () => {
    switch (roundState) {
      case 'IDLE':
        return 'Waiting for players...';
      case 'COUNTDOWN':
        const seconds = Math.ceil(timeLeftMs / 1000);
        return `Starting in ${seconds}s • Players: ${players}`;
      case 'RUNNING':
        return 'Dropping...';
      default:
        return 'Waiting for players...';
    }
  };

  return (
    <div className="flex gap-6 p-6 h-[calc(100vh-88px)]">
      {/* Left Panel - Controls */}
      <Controls
        bet={bet}
        setBet={setBet}
        clientSeed={clientSeed}
        setClientSeed={setClientSeed}
        onJoinRound={handleJoinRound}
        disabled={isButtonDisabled()}
        buttonText={getButtonText()}
      />

      {/* Center - Plinko Board */}
      <PlinkoBoard
        path={ballPath}
        isAnimating={isAnimating}
        onAnimationComplete={handleAnimationComplete}
        finalBin={finalBin}
        roundStatus={getRoundStatus()}
      />

      {/* Right Panel - Sidebar */}
      <Sidebar
        balance={balance}
        houseProfit={houseProfit}
        serverSeedHash={serverSeedHash}
        lastResult={lastResult}
        betHistory={betHistory}
      />
    </div>
  );
}
