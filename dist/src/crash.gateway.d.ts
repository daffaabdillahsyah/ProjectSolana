import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CrashService } from './crash.service';
interface JoinRoundPayload {
    userId: number;
    bet: number;
    clientSeed: string;
}
interface CashoutPayload {
    userId: number;
}
export declare class CrashGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly crashService;
    server: Server;
    private countdownTimer;
    private updateTimer;
    private runningTicker;
    constructor(crashService: CrashService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinRound(payload: JoinRoundPayload, client: Socket): Promise<void>;
    handleCashout(payload: CashoutPayload, client: Socket): Promise<void>;
    private startCountdown;
    private startRoundExecution;
    private tickRunning;
    private handleCrash;
    private resetToIdle;
    private clearCountdownTimers;
    private clearRunningTicker;
    private clearAllTimers;
    private sendRoundUpdate;
    onModuleDestroy(): void;
}
export {};
