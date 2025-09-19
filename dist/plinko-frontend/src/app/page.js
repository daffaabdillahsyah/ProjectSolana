'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
const react_1 = require("react");
const Controls_1 = require("@/components/Controls");
const PlinkoBoard_1 = require("@/components/PlinkoBoard");
const Sidebar_1 = require("@/components/Sidebar");
const api_1 = require("@/lib/api");
const socket_1 = require("@/lib/socket");
const constants_1 = require("@/lib/constants");
function Home() {
    const [bet, setBet] = (0, react_1.useState)(1.0);
    const [clientSeed, setClientSeed] = (0, react_1.useState)('');
    const [roundState, setRoundState] = (0, react_1.useState)('IDLE');
    const [timeLeftMs, setTimeLeftMs] = (0, react_1.useState)(0);
    const [players, setPlayers] = (0, react_1.useState)(0);
    const [joined, setJoined] = (0, react_1.useState)(false);
    const [balance, setBalance] = (0, react_1.useState)(0);
    const [houseProfit, setHouseProfit] = (0, react_1.useState)(0);
    const [serverSeedHash, setServerSeedHash] = (0, react_1.useState)('');
    const [lastResult, setLastResult] = (0, react_1.useState)();
    const [betHistory, setBetHistory] = (0, react_1.useState)([]);
    const [isAnimating, setIsAnimating] = (0, react_1.useState)(false);
    const [ballPath, setBallPath] = (0, react_1.useState)([]);
    const [finalBin, setFinalBin] = (0, react_1.useState)();
    (0, react_1.useEffect)(() => {
        if (!clientSeed) {
            const randomSeed = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
            setClientSeed(randomSeed);
        }
    }, [clientSeed]);
    (0, react_1.useEffect)(() => {
        const loadInitialData = async () => {
            try {
                const [fairData, balanceData, statsData] = await Promise.all([
                    (0, api_1.getFair)(),
                    (0, api_1.getBalance)(),
                    (0, api_1.getStats)(),
                ]);
                setBalance(balanceData.balance);
                setHouseProfit(statsData.houseProfit);
                setServerSeedHash(fairData.serverSeedHash);
            }
            catch (error) {
                console.error('Failed to load initial data:', error);
            }
        };
        loadInitialData();
        const handleRoundUpdate = (update) => {
            setRoundState(update.state);
            setPlayers(update.players);
            setTimeLeftMs(update.timeLeftMs);
            if (update.state === 'IDLE') {
                setJoined(false);
            }
        };
        const handleJoined = (response) => {
            console.log('Joined round:', response);
            setJoined(true);
        };
        const handleRoundStarted = (data) => {
            console.log('Round started:', data);
            setRoundState('RUNNING');
        };
        const handleYourResult = (result) => {
            console.log('Your result:', result);
            setLastResult(result);
            setBetHistory(prev => [...prev, result]);
            setBallPath(result.path);
            setFinalBin(result.bin);
            setBalance(result.balanceAfter);
            setIsAnimating(true);
            refreshBalanceAndStats();
        };
        const handleRoundFinished = (data) => {
            console.log('Round finished:', data);
            setTimeout(() => {
                setJoined(false);
            }, 600);
        };
        socket_1.socket.on('round_update', handleRoundUpdate);
        socket_1.socket.on('joined', handleJoined);
        socket_1.socket.on('round_started', handleRoundStarted);
        socket_1.socket.on('your_result', handleYourResult);
        socket_1.socket.on('round_finished', handleRoundFinished);
        return () => {
            socket_1.socket.off('round_update', handleRoundUpdate);
            socket_1.socket.off('joined', handleJoined);
            socket_1.socket.off('round_started', handleRoundStarted);
            socket_1.socket.off('your_result', handleYourResult);
            socket_1.socket.off('round_finished', handleRoundFinished);
        };
    }, []);
    const refreshBalanceAndStats = async () => {
        try {
            const [balanceData, statsData] = await Promise.all([
                (0, api_1.getBalance)(),
                (0, api_1.getStats)(),
            ]);
            setBalance(balanceData.balance);
            setHouseProfit(statsData.houseProfit);
        }
        catch (error) {
            console.error('Failed to refresh balance and stats:', error);
        }
    };
    const handleJoinRound = () => {
        socket_1.socket.emit('join_round', {
            userId: 1,
            bet,
            risk: constants_1.FIXED_RISK,
            rows: constants_1.FIXED_ROWS,
            clientSeed,
        });
    };
    const handleAnimationComplete = () => {
        setIsAnimating(false);
    };
    const getButtonText = () => {
        if (roundState === 'RUNNING')
            return 'Dropping...';
        if (joined && roundState === 'COUNTDOWN')
            return 'Joined - Waiting...';
        if (roundState === 'COUNTDOWN')
            return 'Join Round';
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
    return (<div className="min-h-screen bg-gray-950 text-white">
      
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

      
      <div className="flex gap-6 p-6 h-[calc(100vh-88px)]">
        
        <Controls_1.default bet={bet} setBet={setBet} clientSeed={clientSeed} setClientSeed={setClientSeed} onJoinRound={handleJoinRound} disabled={isButtonDisabled()} buttonText={getButtonText()}/>

        
        <PlinkoBoard_1.default path={ballPath} isAnimating={isAnimating} onAnimationComplete={handleAnimationComplete} finalBin={finalBin} roundStatus={getRoundStatus()}/>

        
        <Sidebar_1.default balance={balance} houseProfit={houseProfit} serverSeedHash={serverSeedHash} lastResult={lastResult} betHistory={betHistory}/>
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map