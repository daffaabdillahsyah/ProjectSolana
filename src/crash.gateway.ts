import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CrashService, CrashState } from './crash.service';

interface JoinRoundPayload {
  userId: number;
  bet: number;
  clientSeed: string;
}

interface CashoutPayload {
  userId: number;
}

@WebSocketGateway({
  namespace: '/ws/crash',
  cors: { origin: '*' }
})
export class CrashGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private countdownTimer: NodeJS.Timeout | null = null;
  private updateTimer: NodeJS.Timeout | null = null;
  private runningTicker: NodeJS.Timeout | null = null;

  constructor(private readonly crashService: CrashService) {}

  handleConnection(client: Socket) {
    console.log(`Crash client connected: ${client.id}`);
    this.sendRoundUpdate();

    // NEW: send current chips right away
    this.server.emit('history_update', {
      latest: this.crashService.getHistory(1)[0] ?? null,
      chips: this.crashService.getHistoryDedup(20),
    });
  }

  handleDisconnect(client: Socket) {
    console.log(`Crash client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_round')
  async handleJoinRound(
    @MessageBody() payload: JoinRoundPayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Validate payload
      if (!payload.userId || !payload.bet || !payload.clientSeed) {
        client.emit('error', { code: 'INVALID_PAYLOAD', message: 'Missing required fields' });
        return;
      }

      if (payload.bet <= 0 || payload.bet > 10) {
        client.emit('error', { code: 'INVALID_BET', message: 'Bet must be between 0.01 and 10' });
        return;
      }

      // Try to join or create round
      const result = this.crashService.joinOrCreate(payload.userId, payload.bet, payload.clientSeed);
      
      if (result.error) {
        client.emit('error', { code: 'JOIN_FAILED', message: result.error });
        return;
      }

      // If this is the first player and we just created a round, start countdown
      const currentRound = this.crashService.getCurrentRound();
      if (currentRound && currentRound.state === 'COUNTDOWN' && !this.countdownTimer) {
        this.startCountdown();
      }

      // Acknowledge the join
      client.emit('joined', {
        roundId: result.roundId,
        userId: payload.userId,
      });

      this.sendRoundUpdate();
    } catch (error) {
      console.error('Error in crash join_round:', error);
      client.emit('error', { code: 'INTERNAL_ERROR', message: 'Internal server error' });
    }
  }

  @SubscribeMessage('cashout')
  async handleCashout(
    @MessageBody() payload: CashoutPayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (!payload.userId) {
        client.emit('error', { code: 'INVALID_PAYLOAD', message: 'Missing userId' });
        return;
      }

      const result = this.crashService.cashout(payload.userId);
      
      if (!result.success) {
        client.emit('error', { code: 'CASHOUT_FAILED', message: result.error });
        return;
      }

      // Broadcast successful cashout
      const currentRound = this.crashService.getCurrentRound();
      this.server.emit('cashed_out', {
        roundId: currentRound?.id,
        userId: payload.userId,
        atMultiplier: result.atMultiplier,
        payout: result.payout,
        balanceAfter: result.balanceAfter,
        createdAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in crash cashout:', error);
      client.emit('error', { code: 'INTERNAL_ERROR', message: 'Internal server error' });
    }
  }

  private startCountdown() {
    const currentRound = this.crashService.getCurrentRound();
    if (!currentRound) return;

    console.log(`Started countdown for crash round: ${currentRound.id}`);

    // Start countdown timer
    this.countdownTimer = setTimeout(() => {
      this.startRoundExecution();
    }, 10000);

    // Start update timer for broadcasting round state during countdown
    this.updateTimer = setInterval(() => {
      this.sendRoundUpdate();
    }, 250);

    this.sendRoundUpdate();
  }

  private async startRoundExecution() {
    const startResult = this.crashService.startIfDue();
    
    if (!startResult.started) {
      this.resetToIdle();
      return;
    }

    // Clear countdown timers
    this.clearCountdownTimers();

    const currentRound = this.crashService.getCurrentRound();
    if (!currentRound) {
      this.resetToIdle();
      return;
    }

    // Check if we have players
    if (startResult.lockedPlayers === 0) {
      this.resetToIdle();
      return;
    }

    // Broadcast round started
    this.server.emit('round_started', {
      roundId: startResult.roundId,
      lockedPlayers: startResult.lockedPlayers,
      startedAt: Date.now(),
      fair: this.crashService.getPublicFair()
    });

    console.log(`Crash round ${startResult.roundId} started with ${startResult.lockedPlayers} players`);

    // Start the running ticker (100ms intervals)
    this.runningTicker = setInterval(() => {
      this.tickRunning();
    }, 100);
  }

  private tickRunning() {
    const currentRound = this.crashService.getCurrentRound();
    if (!currentRound || currentRound.state !== 'RUNNING') {
      this.clearRunningTicker();
      return;
    }

    // Check if we should crash
    if (this.crashService.shouldCrash()) {
      this.handleCrash();
      return;
    }

    // Send multiplier update
    const multiplier = this.crashService.getCurrentMultiplier();
    this.server.emit('round_update', {
      state: 'RUNNING' as CrashState,
      roundId: currentRound.id,
      players: currentRound.players.size,
      multiplier
    });
  }

  private async handleCrash() {
    const currentRound = this.crashService.getCurrentRound();
    if (!currentRound) return;

    this.clearRunningTicker();

    // Broadcast crash event
    this.server.emit('crashed', {
      roundId: currentRound.id,
      crashMultiplier: currentRound.crashDisplay
    });

    console.log(`Crash round ${currentRound.id} crashed at ${currentRound.crashDisplay}x`);

    // Wait a bit for crash animation
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Finish the round
    const finishResult = this.crashService.finishRound();
    if (finishResult) {
      this.server.emit('round_finished', {
        roundId: finishResult.roundId,
        durationMs: finishResult.durationMs
      });
      
      // NEW: broadcast refreshed history
      this.server.emit('history_update', {
        latest: this.crashService.getHistory(1)[0],
        chips: this.crashService.getHistoryDedup(20),
      });
    }

    // Reset to idle after a short delay
    setTimeout(() => {
      this.resetToIdle();
    }, 1000);
  }

  private resetToIdle() {
    this.clearAllTimers();
    this.sendRoundUpdate();
    console.log('Crash round reset to IDLE');
  }

  private clearCountdownTimers() {
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  private clearRunningTicker() {
    if (this.runningTicker) {
      clearInterval(this.runningTicker);
      this.runningTicker = null;
    }
  }

  private clearAllTimers() {
    this.clearCountdownTimers();
    this.clearRunningTicker();
  }

  private sendRoundUpdate() {
    const now = Date.now();
    const currentRound = this.crashService.getCurrentRound();
    let roundUpdate;

    if (!currentRound) {
      roundUpdate = {
        state: 'IDLE' as CrashState,
        roundId: null,
        players: 0,
        timeLeftMs: 0,
      };
    } else {
      const timeLeftMs = Math.max(0, currentRound.countdownEndsAt - now);
      
      if (currentRound.state === 'COUNTDOWN') {
        roundUpdate = {
          state: currentRound.state,
          roundId: currentRound.id,
          players: currentRound.players.size,
          timeLeftMs,
        };
      } else if (currentRound.state === 'RUNNING') {
        roundUpdate = {
          state: currentRound.state,
          roundId: currentRound.id,
          players: currentRound.players.size,
          multiplier: this.crashService.getCurrentMultiplier(),
        };
      } else {
        roundUpdate = {
          state: currentRound.state,
          roundId: currentRound.id,
          players: currentRound.players.size,
          timeLeftMs: 0,
        };
      }
    }

    this.server.emit('round_update', roundUpdate);
  }

  // Cleanup on module destroy
  onModuleDestroy() {
    this.clearAllTimers();
  }
}
