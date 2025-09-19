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
exports.PlinkoGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const plinko_service_1 = require("./plinko.service");
let PlinkoGateway = class PlinkoGateway {
    constructor(plinkoService) {
        this.plinkoService = plinkoService;
        this.currentRound = null;
        this.countdownTimer = null;
        this.updateTimer = null;
    }
    handleConnection(client) {
        console.log(`Client connected: ${client.id}`);
        this.sendRoundUpdate();
    }
    handleDisconnect(client) {
        console.log(`Client disconnected: ${client.id}`);
    }
    async handleJoinRound(payload, client) {
        try {
            if (!payload.userId || !payload.bet || !payload.risk || !payload.clientSeed) {
                client.emit('error', { code: 'INVALID_PAYLOAD', message: 'Missing required fields' });
                return;
            }
            if (payload.bet <= 0 || payload.bet > 10) {
                client.emit('error', { code: 'INVALID_BET', message: 'Bet must be between 0 and 10' });
                return;
            }
            if (!['easy', 'medium', 'hard'].includes(payload.risk)) {
                client.emit('error', { code: 'INVALID_RISK', message: 'Risk must be easy, medium, or hard' });
                return;
            }
            const balance = this.plinkoService.getBalance(payload.userId);
            if (balance < payload.bet) {
                client.emit('error', { code: 'INSUFFICIENT_BALANCE', message: 'Insufficient balance' });
                return;
            }
            if (this.currentRound?.state === 'RUNNING') {
                client.emit('error', { code: 'ROUND_LOCKED', message: 'Round is already running' });
                return;
            }
            if (!this.currentRound || this.currentRound.state === 'IDLE') {
                this.startNewRound();
            }
            if (this.currentRound && this.currentRound.state === 'COUNTDOWN') {
                this.currentRound.players.set(payload.userId, {
                    userId: payload.userId,
                    bet: payload.bet,
                    risk: payload.risk,
                    rows: 8,
                    clientSeed: payload.clientSeed,
                });
                client.emit('joined', {
                    roundId: this.currentRound.id,
                    userId: payload.userId,
                });
                this.sendRoundUpdate();
            }
        }
        catch (error) {
            console.error('Error in join_round:', error);
            client.emit('error', { code: 'INTERNAL_ERROR', message: 'Internal server error' });
        }
    }
    startNewRound() {
        this.clearTimers();
        this.currentRound = {
            id: `round_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            state: 'COUNTDOWN',
            countdownEndsAt: Date.now() + 10000,
            players: new Map(),
        };
        console.log(`Started new round: ${this.currentRound.id}`);
        this.countdownTimer = setTimeout(() => {
            this.startRoundExecution();
        }, 10000);
        this.updateTimer = setInterval(() => {
            this.sendRoundUpdate();
        }, 250);
        this.sendRoundUpdate();
    }
    async startRoundExecution() {
        if (!this.currentRound || this.currentRound.state !== 'COUNTDOWN') {
            return;
        }
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
        if (this.currentRound.players.size === 0) {
            this.resetToIdle();
            return;
        }
        this.currentRound.state = 'RUNNING';
        const lockedPlayers = Array.from(this.currentRound.players.values());
        const startedAt = Date.now();
        this.server.emit('round_started', {
            roundId: this.currentRound.id,
            lockedPlayers: lockedPlayers.length,
            startedAt,
        });
        console.log(`Round ${this.currentRound.id} started with ${lockedPlayers.length} players`);
        const results = [];
        try {
            for (const player of lockedPlayers) {
                try {
                    const result = this.plinkoService.placeBet(player.userId, player.bet, player.rows, player.risk, player.clientSeed);
                    const resultWithRound = {
                        ...result,
                        roundId: this.currentRound.id,
                    };
                    results.push(resultWithRound);
                    this.server.emit('your_result', resultWithRound);
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                catch (error) {
                    console.error(`Error processing bet for user ${player.userId}:`, error);
                }
            }
            await new Promise(resolve => setTimeout(resolve, 500));
            const durationMs = Date.now() - startedAt;
            this.server.emit('round_finished', {
                roundId: this.currentRound.id,
                durationMs,
            });
            console.log(`Round ${this.currentRound.id} finished in ${durationMs}ms`);
            setTimeout(() => {
                this.resetToIdle();
            }, 1000);
        }
        catch (error) {
            console.error('Error during round execution:', error);
            this.resetToIdle();
        }
    }
    resetToIdle() {
        this.clearTimers();
        this.currentRound = null;
        this.sendRoundUpdate();
        console.log('Round reset to IDLE');
    }
    clearTimers() {
        if (this.countdownTimer) {
            clearTimeout(this.countdownTimer);
            this.countdownTimer = null;
        }
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }
    sendRoundUpdate() {
        const now = Date.now();
        let roundUpdate;
        if (!this.currentRound) {
            roundUpdate = {
                state: 'IDLE',
                roundId: null,
                players: 0,
                timeLeftMs: 0,
            };
        }
        else {
            const timeLeftMs = Math.max(0, this.currentRound.countdownEndsAt - now);
            roundUpdate = {
                state: this.currentRound.state,
                roundId: this.currentRound.id,
                players: this.currentRound.players.size,
                timeLeftMs: this.currentRound.state === 'COUNTDOWN' ? timeLeftMs : 0,
            };
        }
        this.server.emit('round_update', roundUpdate);
    }
    onModuleDestroy() {
        this.clearTimers();
    }
};
exports.PlinkoGateway = PlinkoGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], PlinkoGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_round'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], PlinkoGateway.prototype, "handleJoinRound", null);
exports.PlinkoGateway = PlinkoGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: '/ws/plinko',
        cors: { origin: '*' }
    }),
    __metadata("design:paramtypes", [plinko_service_1.PlinkoService])
], PlinkoGateway);
//# sourceMappingURL=plinko.gateway.js.map