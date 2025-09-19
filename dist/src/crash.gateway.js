"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrashGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const crash_service_1 = require("./crash.service");
let CrashGateway = class CrashGateway {
    constructor(crashService) {
        this.crashService = crashService;
        this.countdownTimer = null;
        this.updateTimer = null;
        this.runningTicker = null;
    }
    handleConnection(client) {
        console.log(`Crash client connected: ${client.id}`);
        this.sendRoundUpdate();
    }
    handleDisconnect(client) {
        console.log(`Crash client disconnected: ${client.id}`);
    }
    async handleJoinRound(payload, client) {
        try {
            if (!payload.userId || !payload.bet || !payload.clientSeed) {
                client.emit('error', { code: 'INVALID_PAYLOAD', message: 'Missing required fields' });
                return;
            }
            if (payload.bet <= 0 || payload.bet > 10) {
                client.emit('error', { code: 'INVALID_BET', message: 'Bet must be between 0.01 and 10' });
                return;
            }
            const result = this.crashService.joinOrCreate(payload.userId, payload.bet, payload.clientSeed);
            if (result.error) {
                client.emit('error', { code: 'JOIN_FAILED', message: result.error });
                return;
            }
            const currentRound = this.crashService.getCurrentRound();
            if (currentRound && currentRound.state === 'COUNTDOWN' && !this.countdownTimer) {
                this.startCountdown();
            }
            client.emit('joined', {
                roundId: result.roundId,
                userId: payload.userId,
            });
            this.sendRoundUpdate();
        }
        catch (error) {
            console.error('Error in crash join_round:', error);
            client.emit('error', { code: 'INTERNAL_ERROR', message: 'Internal server error' });
        }
    }
    async handleCashout(payload, client) {
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
            const currentRound = this.crashService.getCurrentRound();
            this.server.emit('cashed_out', {
                roundId: currentRound?.id,
                userId: payload.userId,
                atMultiplier: result.atMultiplier,
                payout: result.payout,
                balanceAfter: result.balanceAfter,
                createdAt: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('Error in crash cashout:', error);
            client.emit('error', { code: 'INTERNAL_ERROR', message: 'Internal server error' });
        }
    }
    startCountdown() {
        const currentRound = this.crashService.getCurrentRound();
        if (!currentRound)
            return;
        console.log(`Started countdown for crash round: ${currentRound.id}`);
        this.countdownTimer = setTimeout(() => {
            this.startRoundExecution();
        }, 10000);
        this.updateTimer = setInterval(() => {
            this.sendRoundUpdate();
        }, 250);
        this.sendRoundUpdate();
    }
    async startRoundExecution() {
        const startResult = this.crashService.startIfDue();
        if (!startResult.started) {
            this.resetToIdle();
            return;
        }
        this.clearCountdownTimers();
        const currentRound = this.crashService.getCurrentRound();
        if (!currentRound) {
            this.resetToIdle();
            return;
        }
        if (startResult.lockedPlayers === 0) {
            this.resetToIdle();
            return;
        }
        this.server.emit('round_started', {
            roundId: startResult.roundId,
            lockedPlayers: startResult.lockedPlayers,
            startedAt: Date.now(),
            fair: this.crashService.getPublicFair()
        });
        console.log(`Crash round ${startResult.roundId} started with ${startResult.lockedPlayers} players`);
        this.runningTicker = setInterval(() => {
            this.tickRunning();
        }, 100);
    }
    tickRunning() {
        const currentRound = this.crashService.getCurrentRound();
        if (!currentRound || currentRound.state !== 'RUNNING') {
            this.clearRunningTicker();
            return;
        }
        if (this.crashService.shouldCrash()) {
            this.handleCrash();
            return;
        }
        const multiplier = this.crashService.getCurrentMultiplier();
        this.server.emit('round_update', {
            state: 'RUNNING',
            roundId: currentRound.id,
            players: currentRound.players.size,
            multiplier
        });
    }
    async handleCrash() {
        const currentRound = this.crashService.getCurrentRound();
        if (!currentRound)
            return;
        this.clearRunningTicker();
        this.server.emit('crashed', {
            roundId: currentRound.id,
            crashMultiplier: currentRound.crashMultiplier
        });
        console.log(`Crash round ${currentRound.id} crashed at ${currentRound.crashMultiplier}x`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        const finishResult = this.crashService.finishRound();
        if (finishResult) {
            this.server.emit('round_finished', {
                roundId: finishResult.roundId,
                durationMs: finishResult.durationMs
            });
        }
        setTimeout(() => {
            this.resetToIdle();
        }, 1000);
    }
    resetToIdle() {
        this.clearAllTimers();
        this.sendRoundUpdate();
        console.log('Crash round reset to IDLE');
    }
    clearCountdownTimers() {
        if (this.countdownTimer) {
            clearTimeout(this.countdownTimer);
            this.countdownTimer = null;
        }
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }
    clearRunningTicker() {
        if (this.runningTicker) {
            clearInterval(this.runningTicker);
            this.runningTicker = null;
        }
    }
    clearAllTimers() {
        this.clearCountdownTimers();
        this.clearRunningTicker();
    }
    sendRoundUpdate() {
        const now = Date.now();
        const currentRound = this.crashService.getCurrentRound();
        let roundUpdate;
        if (!currentRound) {
            roundUpdate = {
                state: 'IDLE',
                roundId: null,
                players: 0,
                timeLeftMs: 0,
            };
        }
        else {
            const timeLeftMs = Math.max(0, currentRound.countdownEndsAt - now);
            if (currentRound.state === 'COUNTDOWN') {
                roundUpdate = {
                    state: currentRound.state,
                    roundId: currentRound.id,
                    players: currentRound.players.size,
                    timeLeftMs,
                };
            }
            else if (currentRound.state === 'RUNNING') {
                roundUpdate = {
                    state: currentRound.state,
                    roundId: currentRound.id,
                    players: currentRound.players.size,
                    multiplier: this.crashService.getCurrentMultiplier(),
                };
            }
            else {
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
    onModuleDestroy() {
        this.clearAllTimers();
    }
};
exports.CrashGateway = CrashGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], CrashGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_round'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], CrashGateway.prototype, "handleJoinRound", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('cashout'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], CrashGateway.prototype, "handleCashout", null);
exports.CrashGateway = CrashGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: '/ws/crash',
        cors: { origin: '*' }
    }),
    __metadata("design:paramtypes", [crash_service_1.CrashService])
], CrashGateway);
//# sourceMappingURL=crash.gateway.js.map