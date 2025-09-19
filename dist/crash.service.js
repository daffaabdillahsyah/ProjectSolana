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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrashService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
let CrashService = class CrashService {
    constructor() {
        this.balances = new Map();
        this.currentRound = null;
        this.roundCounter = 0;
        this.totalRounds = 0;
        this.totalStake = 0;
        this.totalPayout = 0;
        this.G = Math.log(2) / 5;
        this.serverSeed = (0, crypto_1.randomBytes)(32).toString('hex');
        this.serverSeedHash = (0, crypto_1.createHash)('sha256').update(this.serverSeed).digest('hex');
    }
    getBalance(userId) {
        if (!this.balances.has(userId)) {
            this.balances.set(userId, 100.0);
        }
        return this.balances.get(userId);
    }
    debit(userId, amount) {
        const currentBalance = this.getBalance(userId);
        this.balances.set(userId, currentBalance - amount);
    }
    credit(userId, amount) {
        const currentBalance = this.getBalance(userId);
        this.balances.set(userId, currentBalance + amount);
    }
    round2(value) {
        return Math.round(value * 100) / 100;
    }
    computeCrashMultiplier(roundId) {
        const roundIdHex = Buffer.from(roundId, 'utf8').toString('hex');
        const h = (0, crypto_1.createHmac)('sha256', this.serverSeed).update(roundIdHex).digest();
        const r52 = h.readUIntBE(0, 6) & 0xFFFFFFFFFFFFF;
        const u = (r52 + 1) / Math.pow(2, 52);
        const raw = 1 / (1 - u);
        const crash = Math.max(1.00, Math.min(raw, 100));
        return this.round2(crash);
    }
    newRound() {
        const roundId = `cr_${Date.now()}_${++this.roundCounter}`;
        const crashMultiplier = this.computeCrashMultiplier(roundId);
        return {
            id: roundId,
            state: 'COUNTDOWN',
            countdownEndsAt: Date.now() + 10000,
            players: new Map(),
            crashMultiplier,
            fair: {
                serverSeedHash: this.serverSeedHash,
                nonce: this.roundCounter
            }
        };
    }
    joinOrCreate(userId, bet, clientSeed) {
        if (bet <= 0 || bet > 10) {
            return { roundId: '', state: 'IDLE', countdownEndsAt: 0, error: 'Invalid bet amount. Must be between 0.01 and 10.' };
        }
        const balance = this.getBalance(userId);
        if (balance < bet) {
            return { roundId: '', state: 'IDLE', countdownEndsAt: 0, error: 'Insufficient balance' };
        }
        if (!this.currentRound || this.currentRound.state !== 'COUNTDOWN') {
            this.currentRound = this.newRound();
        }
        if (Date.now() >= this.currentRound.countdownEndsAt) {
            return { roundId: '', state: 'IDLE', countdownEndsAt: 0, error: 'Round already started' };
        }
        const player = { userId, bet, clientSeed };
        this.currentRound.players.set(userId, player);
        return {
            roundId: this.currentRound.id,
            state: this.currentRound.state,
            countdownEndsAt: this.currentRound.countdownEndsAt
        };
    }
    startIfDue() {
        if (!this.currentRound || this.currentRound.state !== 'COUNTDOWN') {
            return { started: false };
        }
        if (Date.now() < this.currentRound.countdownEndsAt) {
            return { started: false };
        }
        this.currentRound.state = 'RUNNING';
        this.currentRound.startedAt = Date.now();
        for (const [userId, player] of this.currentRound.players) {
            this.debit(userId, player.bet);
            this.totalStake += player.bet;
        }
        this.totalRounds++;
        return {
            started: true,
            roundId: this.currentRound.id,
            lockedPlayers: this.currentRound.players.size
        };
    }
    getCurrentMultiplier() {
        if (!this.currentRound || !this.currentRound.startedAt || this.currentRound.state !== 'RUNNING') {
            return 1.00;
        }
        const elapsedSeconds = (Date.now() - this.currentRound.startedAt) / 1000;
        const multiplier = Math.exp(this.G * elapsedSeconds);
        return this.round2(multiplier);
    }
    shouldCrash() {
        if (!this.currentRound || this.currentRound.state !== 'RUNNING') {
            return false;
        }
        return this.getCurrentMultiplier() >= this.currentRound.crashMultiplier;
    }
    cashout(userId) {
        if (!this.currentRound || this.currentRound.state !== 'RUNNING') {
            return { success: false, error: 'No active round or round not running' };
        }
        const player = this.currentRound.players.get(userId);
        if (!player) {
            return { success: false, error: 'Player not in current round' };
        }
        if (player.cashedOut) {
            return { success: false, error: 'Already cashed out' };
        }
        if (this.shouldCrash()) {
            return { success: false, error: 'Round already crashed' };
        }
        const currentMultiplier = this.getCurrentMultiplier();
        const payout = this.round2(player.bet * currentMultiplier);
        player.cashedOut = {
            atMultiplier: currentMultiplier,
            payout,
            atMs: Date.now()
        };
        this.credit(userId, payout);
        this.totalPayout += payout;
        return {
            success: true,
            atMultiplier: currentMultiplier,
            payout,
            balanceAfter: this.round2(this.getBalance(userId))
        };
    }
    finishRound() {
        if (!this.currentRound || !this.currentRound.startedAt) {
            return null;
        }
        const roundId = this.currentRound.id;
        const crashMultiplier = this.currentRound.crashMultiplier;
        const durationMs = Date.now() - this.currentRound.startedAt;
        this.lastCrashMultiplier = crashMultiplier;
        if (this.currentRound.ticker) {
            clearInterval(this.currentRound.ticker);
        }
        this.currentRound = null;
        return { roundId, crashMultiplier, durationMs };
    }
    getCurrentRound() {
        return this.currentRound;
    }
    getPublicFair() {
        return { serverSeedHash: this.serverSeedHash };
    }
    getStats() {
        return {
            rounds: this.totalRounds,
            totalStake: this.round2(this.totalStake),
            totalPayout: this.round2(this.totalPayout),
            houseProfit: this.round2(this.totalStake - this.totalPayout),
            lastCrashMultiplier: this.lastCrashMultiplier
        };
    }
};
exports.CrashService = CrashService;
exports.CrashService = CrashService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], CrashService);
//# sourceMappingURL=crash.service.js.map