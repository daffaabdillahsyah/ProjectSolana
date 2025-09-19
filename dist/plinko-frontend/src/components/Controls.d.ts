interface ControlsProps {
    bet: number;
    setBet: (bet: number) => void;
    clientSeed: string;
    setClientSeed: (seed: string) => void;
    onJoinRound: () => void;
    disabled: boolean;
    buttonText: string;
}
export default function Controls({ bet, setBet, clientSeed, setClientSeed, onJoinRound, disabled, buttonText, }: ControlsProps): import("react").JSX.Element;
export {};
