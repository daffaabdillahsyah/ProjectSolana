'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Controls;
const constants_1 = require("../lib/constants");
function Controls({ bet, setBet, clientSeed, setClientSeed, onJoinRound, disabled, buttonText, }) {
    const handleBetChange = (value) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue >= 0) {
            setBet(numValue);
        }
    };
    const halveBet = () => setBet(Math.max(0.01, bet / 2));
    const doubleBet = () => setBet(bet * 2);
    const randomizeSeed = () => {
        const randomSeed = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        setClientSeed(randomSeed);
    };
    return (<div className="w-80 bg-gray-900 p-6 rounded-2xl shadow-lg space-y-6">
      <h2 className="text-white text-xl font-semibold">Controls</h2>
      
      
      <div className="space-y-3">
        <label className="text-white text-sm font-medium">Bet Amount</label>
        <div className="flex items-center space-x-2">
          <input type="number" value={bet} onChange={(e) => handleBetChange(e.target.value)} className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-lime-400 focus:outline-none" step="0.01" min="0.01" max="10" disabled={disabled}/>
        </div>
        <div className="flex space-x-2">
          <button onClick={halveBet} disabled={disabled} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded-xl border border-gray-700 disabled:opacity-50 transition-colors">
            ÷2
          </button>
          <button onClick={doubleBet} disabled={disabled} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded-xl border border-gray-700 disabled:opacity-50 transition-colors">
            2×
          </button>
        </div>
      </div>

      
      <div className="space-y-3">
        <label className="text-white text-sm font-medium">Client Seed</label>
        <div className="flex space-x-2">
          <input type="text" value={clientSeed} onChange={(e) => setClientSeed(e.target.value)} className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-lime-400 focus:outline-none text-sm font-mono" disabled={disabled}/>
          <button onClick={randomizeSeed} disabled={disabled} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-xl border border-gray-700 disabled:opacity-50 transition-colors">
            🎲
          </button>
        </div>
      </div>

      
      <button onClick={onJoinRound} disabled={disabled} className="w-full bg-lime-400 hover:bg-lime-500 text-black font-semibold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
        {buttonText}
      </button>

      
      <div className="text-gray-400 text-xs text-center">
        Fixed: rows = {constants_1.FIXED_ROWS}, risk = {constants_1.FIXED_RISK}
      </div>
    </div>);
}
//# sourceMappingURL=Controls.js.map