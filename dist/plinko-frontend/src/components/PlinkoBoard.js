'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PlinkoBoard;
const react_1 = require("react");
function PlinkoBoard({ path, isAnimating, onAnimationComplete, finalBin, roundStatus, }) {
    const [ballPosition, setBallPosition] = (0, react_1.useState)({ x: 0, y: 0 });
    const [showBall, setShowBall] = (0, react_1.useState)(false);
    const boardWidth = 600;
    const boardHeight = 400;
    const dx = 36;
    const dy = 42;
    const rows = 8;
    const pegs = [];
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j <= i; j++) {
            const x = boardWidth / 2 + (j - i / 2) * dx;
            const y = 60 + i * dy;
            pegs.push({ x, y, row: i, col: j });
        }
    }
    const bins = [];
    for (let i = 0; i <= rows; i++) {
        const x = boardWidth / 2 + (i - rows / 2) * dx;
        const y = 60 + rows * dy + 30;
        bins.push({ x, y, index: i });
    }
    const multipliers = ['0x', '0.3x', '0.8x', '1.5x', '5.6x', '1.5x', '0.8x', '0.3x', '0x'];
    (0, react_1.useEffect)(() => {
        if (!isAnimating || path.length === 0) {
            setShowBall(false);
            return;
        }
        setShowBall(true);
        setBallPosition({ x: boardWidth / 2, y: 60 - dy });
        const animateStep = (step) => {
            if (step >= path.length) {
                const finalBinX = bins[finalBin || 4].x;
                const finalBinY = bins[finalBin || 4].y;
                setBallPosition({ x: finalBinX, y: finalBinY });
                setTimeout(() => {
                    setShowBall(false);
                    onAnimationComplete();
                }, 500);
                return;
            }
            let j = 0;
            for (let i = 0; i <= step; i++) {
                const bit = path[i];
                j += bit ? 1 : 0;
            }
            const x = boardWidth / 2 + (j - (step + 1) / 2) * dx;
            const y = 60 + (step + 1) * dy;
            setBallPosition({ x, y });
            setTimeout(() => animateStep(step + 1), 180);
        };
        animateStep(0);
    }, [isAnimating, path, finalBin, onAnimationComplete]);
    return (<div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 rounded-2xl p-8">
      
      <div className="mb-4 text-center">
        <div className="text-white text-lg font-semibold">
          {roundStatus}
        </div>
      </div>

      
      <div className="relative">
        <svg width={boardWidth} height={boardHeight} className="drop-shadow-lg">
          
          <defs>
            <linearGradient id="boardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1f2937"/>
              <stop offset="100%" stopColor="#374151"/>
            </linearGradient>
          </defs>
          
          <rect x="50" y="20" width={boardWidth - 100} height={boardHeight - 40} fill="url(#boardGradient)" rx="20" stroke="#6b7280" strokeWidth="2"/>

          
          {pegs.map((peg, index) => (<circle key={index} cx={peg.x} cy={peg.y} r="6" fill="#9ca3af" className="drop-shadow-sm"/>))}

          
          {bins.map((bin, index) => (<g key={index}>
              <rect x={bin.x - 15} y={bin.y} width="30" height="40" fill={finalBin === index ? "#10b981" : "#4b5563"} rx="4" className={finalBin === index ? "animate-pulse" : ""}/>
              <text x={bin.x} y={bin.y + 55} textAnchor="middle" className="text-xs font-semibold" fill={finalBin === index ? "#10b981" : "#ffffff"}>
                {multipliers[index]}
              </text>
            </g>))}

          
          {showBall && (<circle cx={ballPosition.x} cy={ballPosition.y} r="8" fill="#fbbf24" className="drop-shadow-lg" style={{
                transition: 'cx 0.18s ease-in-out, cy 0.18s ease-in-out',
            }}/>)}

          
          <circle cx={boardWidth / 2} cy={60 - dy} r="10" fill="#10b981" className="opacity-50"/>
        </svg>
      </div>
    </div>);
}
//# sourceMappingURL=PlinkoBoard.js.map