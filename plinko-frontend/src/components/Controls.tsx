'use client';

import { useState, useEffect } from 'react';

interface ControlsProps {
  bet: number;
  setBet: (bet: number) => void;
  risk: 'easy' | 'medium' | 'hard';
  setRisk: (risk: 'easy' | 'medium' | 'hard') => void;
  rows: number;
  balls: number;
  clientSeed: string;
  setClientSeed: (seed: string) => void;
  onDropBall: () => void;
  isAnimating: boolean;
}

export default function Controls({
  bet,
  setBet,
  risk,
  setRisk,
  rows,
  balls,
  clientSeed,
  setClientSeed,
  onDropBall,
  isAnimating,
}: ControlsProps) {
  // Generate random hex seed on mount
  useEffect(() => {
    if (!clientSeed) {
      const randomSeed = Array.from({ length: 16 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      setClientSeed(randomSeed);
    }
  }, [clientSeed, setClientSeed]);

  const handleBetChange = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setBet(numValue);
    }
  };

  const halveBet = () => setBet(Math.max(0.01, bet / 2));
  const doubleBet = () => setBet(bet * 2);

  return (
    <div className="w-80 bg-gray-900 p-6 rounded-2xl shadow-lg space-y-6">
      <h2 className="text-white text-xl font-semibold mb-4">Bet Amount</h2>
      
      {/* Bet Amount */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <input
            type="number"
            value={bet}
            onChange={(e) => handleBetChange(e.target.value)}
            className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-lime-400 focus:outline-none"
            step="0.01"
            min="0.01"
            disabled={isAnimating}
          />
        </div>
        <div className="flex space-x-2">
          <button
            onClick={halveBet}
            disabled={isAnimating}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded-xl border border-gray-700 disabled:opacity-50"
          >
            ÷2
          </button>
          <button
            onClick={doubleBet}
            disabled={isAnimating}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded-xl border border-gray-700 disabled:opacity-50"
          >
            2×
          </button>
        </div>
      </div>

      {/* Risk Level */}
      <div className="space-y-3">
        <label className="text-white text-sm font-medium">Risk</label>
        <div className="flex space-x-1">
          {(['easy', 'medium', 'hard'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setRisk(level)}
              disabled={isAnimating}
              className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium capitalize transition-colors ${
                risk === level
                  ? 'bg-lime-400 text-black'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              } disabled:opacity-50`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Rows Slider */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-white text-sm font-medium">Rows</label>
          <span className="text-lime-400 text-sm font-semibold">{rows}</span>
        </div>
        <div className="relative">
          <input
            type="range"
            min="8"
            max="8"
            value={rows}
            disabled
            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-not-allowed"
          />
          <div className="absolute top-1/2 left-0 w-full h-2 bg-lime-400 rounded-lg transform -translate-y-1/2 pointer-events-none"></div>
        </div>
      </div>

      {/* Balls Slider */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-white text-sm font-medium">Balls</label>
          <span className="text-lime-400 text-sm font-semibold">{balls}</span>
        </div>
        <div className="relative">
          <input
            type="range"
            min="1"
            max="1"
            value={balls}
            disabled
            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-not-allowed"
          />
          <div className="absolute top-1/2 left-0 w-full h-2 bg-lime-400 rounded-lg transform -translate-y-1/2 pointer-events-none"></div>
        </div>
      </div>

      {/* Client Seed */}
      <div className="space-y-3">
        <label className="text-white text-sm font-medium">Client Seed</label>
        <input
          type="text"
          value={clientSeed}
          onChange={(e) => setClientSeed(e.target.value)}
          className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-lime-400 focus:outline-none text-sm font-mono"
          disabled={isAnimating}
        />
      </div>

      {/* Drop Ball Button */}
      <button
        onClick={onDropBall}
        disabled={isAnimating}
        className="w-full bg-lime-400 hover:bg-lime-500 text-black font-semibold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isAnimating ? 'Dropping...' : 'Drop 1 Ball'}
      </button>
    </div>
  );
}
