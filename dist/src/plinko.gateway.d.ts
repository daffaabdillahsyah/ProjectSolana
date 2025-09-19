import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PlinkoService } from './plinko.service';
interface JoinRoundPayload {
    userId: number;
    bet: number;
    risk: 'easy' | 'medium' | 'hard';
    rows: 8;
    clientSeed: string;
}
export declare class PlinkoGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly plinkoService;
    server: Server;
    private currentRound;
    private countdownTimer;
    private updateTimer;
    constructor(plinkoService: PlinkoService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinRound(payload: JoinRoundPayload, client: Socket): Promise<void>;
    private startNewRound;
    private startRoundExecution;
    private resetToIdle;
    private clearTimers;
    private sendRoundUpdate;
    onModuleDestroy(): void;
}
export {};
