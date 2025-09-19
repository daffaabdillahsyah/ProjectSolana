'use client';

import { useState, useEffect } from 'react';
import { crashSocket } from '@/lib/crashSocket';
import { getCrashFair, getCrashStats, getCrashHistoryDedup, getCrashRoundDetail } from '@/lib/crashApi';

type CrashState = 'IDLE' | 'COUNTDOWN' | 'RUNNING';

type Chip = { multiplier: number; count: number; rounds: string[]; losers: { userId:number; bet:number }[] };

interface HistoryItemFull {
  roundId: string;
  resultMultiplier: number;
  resultMultiplierRaw: number;
  startedAt: number;
  finishedAt: number;
  serverSeedHash: string;
  publicSeed: string;
  players: {
    userId: number;
    bet: number;
    cashedOut?: { atMultiplier: number; payout: number; atMs: number };
  }[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

function randomHex16() {
  return [...crypto.getRandomValues(new Uint8Array(8))]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function CrashPage() {
  // Game state
  const [bet, setBet] = useState(1);
  const [auto, setAuto] = useState<number | ''>('');
  const [clientSeed, setClientSeed] = useState('');
  const [state, setState] = useState<CrashState>('IDLE');
  const [players, setPlayers] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [multiplier, setMultiplier] = useState(1.00);
  const [joined, setJoined] = useState(false);
  const [cashed, setCashed] = useState(false);

  // Stats state
  const [serverSeedHash, setServerSeedHash] = useState('');
  const [lastCrashMultiplier, setLastCrashMultiplier] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [houseProfit, setHouseProfit] = useState(0);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // History state
  const [chips, setChips] = useState<Chip[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [roundDetail, setRoundDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Initialize client seed and load data
  useEffect(() => {
    setClientSeed(randomHex16());
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [fairData, statsData] = await Promise.all([
        getCrashFair(),
        getCrashStats()
      ]);
      
      setServerSeedHash(fairData.serverSeedHash);
      setRounds(statsData.rounds);
      setHouseProfit(statsData.houseProfit);
      setLastCrashMultiplier(statsData.lastCrashMultiplier);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  // Socket event handlers
  useEffect(() => {
    const handleRoundUpdate = (update: any) => {
      setState(update.state);
      if (update.state === 'COUNTDOWN') {
        setPlayers(update.players);
        setTimeLeftMs(update.timeLeftMs);
      }
      if (update.state === 'RUNNING') {
        setPlayers(update.players);
        setMultiplier(update.multiplier);
      }
      if (update.state === 'IDLE') {
        setMultiplier(1.00);
      }
    };

    const handleJoined = () => {
      setJoined(true);
      showToast('Joined round successfully!', 'success');
    };

    const handleRoundStarted = () => {
      setState('RUNNING');
      setCashed(false);
    };

    const handleCashedOut = (data: any) => {
      if (data.userId === 1) {
        setCashed(true);
        showToast(`Cashed out at ${data.atMultiplier.toFixed(2)}×!`, 'success');
      }
    };

    const handleCrashed = (data: any) => {
      setMultiplier(data.crashMultiplier);
      setLastCrashMultiplier(data.crashMultiplier);
      showToast(`CRASHED at ${data.crashMultiplier.toFixed(2)}×`, 'error');
    };

    const handleRoundFinished = () => {
      setTimeout(() => {
        setState('IDLE');
        setJoined(false);
        setMultiplier(1.00);
        loadInitialData(); // Refresh stats
      }, 600);
    };

    const handleError = (error: any) => {
      showToast(error.message || 'An error occurred', 'error');
    };

    const handleHistoryUpdate = (payload: any) => {
      if (payload?.chips) setChips(payload.chips);
    };

    // Register socket listeners
    crashSocket.on('round_update', handleRoundUpdate);
    crashSocket.on('joined', handleJoined);
    crashSocket.on('round_started', handleRoundStarted);
    crashSocket.on('cashed_out', handleCashedOut);
    crashSocket.on('crashed', handleCrashed);
    crashSocket.on('round_finished', handleRoundFinished);
    crashSocket.on('error', handleError);
    crashSocket.on('history_update', handleHistoryUpdate);

    return () => {
      crashSocket.off('round_update', handleRoundUpdate);
      crashSocket.off('joined', handleJoined);
      crashSocket.off('round_started', handleRoundStarted);
      crashSocket.off('cashed_out', handleCashedOut);
      crashSocket.off('crashed', handleCrashed);
      crashSocket.off('round_finished', handleRoundFinished);
      crashSocket.off('error', handleError);
      crashSocket.off('history_update', handleHistoryUpdate);
    };
  }, []);

  // Auto cashout logic
  useEffect(() => {
    if (auto && state === 'RUNNING' && !cashed && multiplier >= auto) {
      handleCashout();
    }
  }, [auto, state, cashed, multiplier]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleJoinRound = () => {
    crashSocket.emit('join_round', {
      userId: 1,
      bet,
      clientSeed,
    });
  };

  const handleCashout = () => {
    crashSocket.emit('cashout', { userId: 1 });
  };

  const getHudMessage = () => {
    switch (state) {
      case 'IDLE':
        return 'Waiting for players...';
      case 'COUNTDOWN':
        const seconds = Math.ceil(timeLeftMs / 1000);
        return `Starting in ${seconds}s • Players: ${players}`;
      case 'RUNNING':
        return 'In-Play';
      default:
        return 'Waiting for players...';
    }
  };

  const getRocketPosition = () => {
    // Move rocket right as multiplier increases, max at 80% of container width
    const progress = Math.min((multiplier - 1) * 20, 80);
    return `${progress}%`;
  };


  return (
    <div className="flex gap-6 p-6 h-[calc(100vh-88px)]">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-6 z-50 px-4 py-2 rounded-lg text-white font-semibold ${
          toast.type === 'success' ? 'bg-green-600' : 
          toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Left Panel */}
      <div className="w-80 space-y-4">
        <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-4">
          <h3 className="text-lg font-semibold mb-4">Bet Amount</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lime-400">$</span>
              <input
                type="number"
                value={bet}
                onChange={(e) => setBet(Number(e.target.value))}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                min="0.01"
                step="0.01"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setBet(bet / 2)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg py-2 text-sm"
              >
                ÷2
              </button>
              <button
                onClick={() => setBet(bet * 2)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg py-2 text-sm"
              >
                2×
              </button>
              <button
                onClick={() => setBet(10)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg py-2 text-sm"
              >
                MAX
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-4">
          <h3 className="text-lg font-semibold mb-4">Auto Cashout</h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={auto}
              onChange={(e) => setAuto(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="X.xx"
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
              min="1.01"
              step="0.01"
            />
            <span className="text-zinc-400">×</span>
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-4">
          <h3 className="text-lg font-semibold mb-4">Client Seed</h3>
          <input
            type="text"
            value={clientSeed}
            onChange={(e) => setClientSeed(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm font-mono"
          />
        </div>

        <div className="space-y-2">
          <button
            onClick={handleJoinRound}
            disabled={state === 'RUNNING' || joined}
            className="w-full bg-lime-400 hover:bg-lime-500 disabled:bg-zinc-600 disabled:cursor-not-allowed text-black font-semibold rounded-xl py-3 transition-colors"
          >
            {state === 'RUNNING' ? 'Round In Progress' : joined ? 'Joined - Waiting...' : 'Start / Join Round'}
          </button>
          
          <button
            onClick={handleCashout}
            disabled={state !== 'RUNNING' || !joined || cashed}
            className="w-full bg-red-500 hover:bg-red-600 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 transition-colors"
          >
            {cashed ? 'Cashed Out' : 'Cashout'}
          </button>
        </div>
      </div>

      {/* Center Stage */}
      <div className="flex-1 rounded-2xl bg-zinc-900/70 border border-zinc-800 p-6 relative overflow-hidden">
        {/* History Chips */}
        <div className="absolute top-6 left-6 right-6">
          <div className="flex gap-2 overflow-x-auto pb-2 -mt-2">
            {chips.map((c) => {
              const color = c.multiplier <= 1.10 ? 'bg-red-600' : c.multiplier <= 2 ? 'bg-yellow-600' : 'bg-green-600';
              return (
                <button
                  key={c.multiplier}
                  onClick={() => setSelectedRoundId(c.rounds[0])}
                  className={`relative px-3 py-1 rounded-full text-white text-sm ${color}`}
                  title={`Rounds: ${c.rounds.length}`}
                >
                  {c.multiplier.toFixed(2)}×
                  {c.count > 1 && (
                    <span className="absolute -top-2 -right-2 bg-black/80 rounded-full text-xs px-1.5 py-0.5 border border-white/20">
                      {c.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* HUD Bar */}
        <div className="absolute top-16 left-6 right-6 text-center">
          <div className="text-zinc-400 font-medium">{getHudMessage()}</div>
        </div>

        {/* Current Payout */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="text-6xl font-bold text-white mb-2">
            {multiplier.toFixed(2)}×
          </div>
          <div className="text-zinc-400">CURRENT PAYOUT</div>
        </div>

        {/* Grid Background */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />

        {/* Rocket Animation */}
        <div className="absolute bottom-20 left-4 right-4 h-20">
          <div 
            className="absolute bottom-0 transition-all duration-100 ease-out"
            style={{ left: getRocketPosition() }}
          >
            <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50">
              🚀
            </div>
            {state === 'RUNNING' && (
              <div className="absolute -left-8 top-1/2 transform -translate-y-1/2 w-16 h-2 bg-gradient-to-r from-transparent via-blue-400 to-purple-500 opacity-70 blur-sm"></div>
            )}
          </div>
        </div>

        {/* Scale Marks */}
        <div className="absolute right-6 top-20 bottom-20 flex flex-col justify-between text-zinc-500 text-sm">
          {[10, 5, 3, 2, 1.5, 1].map(mark => (
            <div key={mark} className="flex items-center">
              <div className="w-2 h-px bg-zinc-600 mr-2"></div>
              <span>{mark}×</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-80 space-y-4">
        <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-4">
          <h3 className="text-lg font-semibold mb-4">Game Stats</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Last Crash:</span>
              <span className="text-red-400 font-mono">
                {lastCrashMultiplier ? `${lastCrashMultiplier.toFixed(2)}×` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Total Rounds:</span>
              <span className="text-white font-mono">{rounds.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">House Profit:</span>
              <span className="text-lime-400 font-mono">${houseProfit.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-4">
          <h3 className="text-lg font-semibold mb-4">Provably Fair</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-zinc-400 block">Server Seed Hash:</span>
              <span className="text-white font-mono text-xs break-all">
                {serverSeedHash || 'Loading...'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Round Detail Modal */}
      {selectedRoundId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="w-[520px] max-h-[80vh] overflow-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xl font-bold">
                {roundDetail ? `${roundDetail.resultMultiplier.toFixed(2)}×` : 'Loading...'}
              </h3>
              <button onClick={() => { setSelectedRoundId(null); setRoundDetail(null); }} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            {loadingDetail && <div className="text-zinc-400">Loading...</div>}

            {roundDetail && (
              <>
                <div className="text-sm text-zinc-400 space-y-1 mb-4">
                  <div><span className="text-zinc-500">Game ID:</span> <span className="font-mono">{roundDetail.roundId}</span></div>
                  <div><span className="text-zinc-500">Server Seed Hash:</span> <span className="font-mono break-all">{roundDetail.serverSeedHash}</span></div>
                  <div><span className="text-zinc-500">Public Seed:</span> <span className="font-mono break-all">{roundDetail.publicSeed}</span></div>
                </div>

                <div className="border-t border-zinc-800 pt-3">
                  <div className="text-sm font-semibold mb-2">Players</div>
                  <div className="space-y-2">
                    {roundDetail.players.map((p: any) => {
                      const busted = !p.cashedOut;
                      return (
                        <div key={p.userId} className="flex items-center justify-between bg-zinc-800/40 rounded-lg px-3 py-2">
                          <div className="text-sm text-white">User #{p.userId}</div>
                          <div className="text-sm font-mono text-zinc-300">${p.bet.toFixed(2)}</div>
                          <div className={`text-sm font-semibold ${busted ? 'text-red-400' : 'text-green-400'}`}>
                            {busted ? 'BUSTED' : `${p.cashedOut.atMultiplier.toFixed(2)}×`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
