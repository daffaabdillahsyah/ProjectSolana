'use client';

import { useState, useEffect } from 'react';

interface PlinkoBoardProps {
  rows: number;
  path: number[];
  isAnimating: boolean;
  onAnimationComplete: () => void;
  finalBin?: number;
  risk: 'easy' | 'medium' | 'hard';
}

export default function PlinkoBoard({
  rows,
  path,
  isAnimating,
  onAnimationComplete,
  finalBin,
  risk,
}: PlinkoBoardProps) {
  const [ballPosition, setBallPosition] = useState({ x: 0, y: 0 });
  const [currentStep, setCurrentStep] = useState(0);
  const [showBall, setShowBall] = useState(false);

  // Board dimensions
  const boardWidth = 600;
  const boardHeight = 400;
  const pegSpacing = 36;
  const rowSpacing = 42;

  // Calculate peg positions
  const pegs = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col <= row; col++) {
      const x = boardWidth / 2 + (col - row / 2) * pegSpacing;
      const y = 60 + row * rowSpacing;
      pegs.push({ x, y, row, col });
    }
  }

  // Calculate bin positions (bottom row)
  const bins: Array<{ x: number; y: number; index: number }> = [];
  for (let i = 0; i <= rows; i++) {
    const x = boardWidth / 2 + (i - rows / 2) * pegSpacing;
    const y = 60 + rows * rowSpacing + 30;
    bins.push({ x, y, index: i });
  }

  // Multipliers for each bin based on risk level
  const getMultipliers = (risk: 'easy' | 'medium' | 'hard') => {
    const payouts = {
      easy: [0.5, 0.8, 1.0, 1.2, 1.5, 1.2, 1.0, 0.8, 0.5],
      medium: [0.2, 0.6, 0.9, 1.2, 2.4, 1.2, 0.9, 0.6, 0.2],
      hard: [0.1, 0.3, 0.8, 1.5, 5.6, 1.5, 0.8, 0.3, 0.1]
    };
    return payouts[risk].map(m => `${m}x`);
  };

  const multipliers = getMultipliers(risk);

  // Ball animation effect
  useEffect(() => {
    if (!isAnimating || path.length === 0) {
      setShowBall(false);
      setCurrentStep(0);
      return;
    }

    setShowBall(true);
    setCurrentStep(0);
    
    // Start at the top center
    setBallPosition({ x: boardWidth / 2, y: 20 });

    const animateStep = (step: number) => {
      if (step >= path.length) {
        // Animation complete, move to final bin
        const finalBinX = bins[finalBin || Math.floor(bins.length / 2)].x;
        const finalBinY = bins[finalBin || Math.floor(bins.length / 2)].y;
        setBallPosition({ x: finalBinX, y: finalBinY });
        
        setTimeout(() => {
          setShowBall(false);
          onAnimationComplete();
        }, 500);
        return;
      }

      // Calculate position based on path
      let currentX = boardWidth / 2;
      let currentY = 20;

      for (let i = 0; i <= step; i++) {
        const direction = path[i]; // 0 = left, 1 = right
        const row = i;
        
        if (direction === 0) {
          currentX -= pegSpacing / 2;
        } else {
          currentX += pegSpacing / 2;
        }
        currentY = 60 + (row + 1) * rowSpacing;
      }

      setBallPosition({ x: currentX, y: currentY });
      setCurrentStep(step + 1);

      setTimeout(() => animateStep(step + 1), 180);
    };

    animateStep(0);
  }, [isAnimating, path, finalBin, onAnimationComplete, bins]);

  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 rounded-2xl p-8">
      <div className="relative">
        <svg
          width={boardWidth}
          height={boardHeight}
          className="drop-shadow-lg"
        >
          {/* Background */}
          <defs>
            <linearGradient id="boardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e0e7ff" />
              <stop offset="100%" stopColor="#c7d2fe" />
            </linearGradient>
          </defs>
          
          <rect
            x="50"
            y="20"
            width={boardWidth - 100}
            height={boardHeight - 40}
            fill="url(#boardGradient)"
            rx="20"
            stroke="#6366f1"
            strokeWidth="3"
          />

          {/* Pegs */}
          {pegs.map((peg, index) => (
            <circle
              key={index}
              cx={peg.x}
              cy={peg.y}
              r="6"
              fill="#6366f1"
              className="drop-shadow-sm"
            />
          ))}

          {/* Bins */}
          {bins.map((bin, index) => (
            <g key={index}>
              <rect
                x={bin.x - 15}
                y={bin.y}
                width="30"
                height="40"
                fill={finalBin === index ? "#10b981" : "#374151"}
                rx="4"
                className={finalBin === index ? "animate-pulse" : ""}
              />
              <text
                x={bin.x}
                y={bin.y + 55}
                textAnchor="middle"
                className="text-xs font-semibold"
                fill={finalBin === index ? "#10b981" : "#ffffff"}
              >
                {multipliers[index] || '1x'}
              </text>
            </g>
          ))}

          {/* Ball */}
          {showBall && (
            <circle
              cx={ballPosition.x}
              cy={ballPosition.y}
              r="8"
              fill="#fbbf24"
              className="drop-shadow-lg animate-bounce"
              style={{
                transition: 'cx 0.18s ease-in-out, cy 0.18s ease-in-out',
              }}
            />
          )}

          {/* Entry point */}
          <circle
            cx={boardWidth / 2}
            cy={20}
            r="10"
            fill="#10b981"
            className="opacity-50"
          />
        </svg>
      </div>
    </div>
  );
}
