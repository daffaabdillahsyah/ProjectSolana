interface PlinkoBoardProps {
    path: number[];
    isAnimating: boolean;
    onAnimationComplete: () => void;
    finalBin?: number;
    roundStatus: string;
}
export default function PlinkoBoard({ path, isAnimating, onAnimationComplete, finalBin, roundStatus, }: PlinkoBoardProps): import("react").JSX.Element;
export {};
