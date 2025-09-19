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
exports.PlinkoService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const payouts_1 = require("./payouts");
let PlinkoService = class PlinkoService {
    constructor() {
        this.balances = new Map();
        this.userFair = new Map();
        this.bets = [];
        this.betCounter = 0;
        this.totalBets = 0;
        this.totalStake = 0;
        this.totalPayout = 0;
        this.winCount = 0;
        this.lossCount = 0;
        this.pushCount = 0;
        this.serverSeed = (0, crypto_1.randomBytes)(32).toString('hex');
        this.serverSeedHash = (0, crypto_1.createHash)('sha256').update(this.serverSeed).digest('hex');
    }
    getServerSeedHash() {
        return this.serverSeedHash;
    }
    getBalance(userId) {
        if (!this.balances.has(userId)) {
            this.balances.set(userId, 100.0);
        }
        return this.balances.get(userId);
    }
    generateRandomClientSeed() {
        return (0, crypto_1.randomBytes)(16).toString('hex');
    }
    generateBytes(clientSeed, nonce, counter) {
        const message = `${clientSeed}:${nonce}:${counter}`;
        return (0, crypto_1.createHmac)('sha256', this.serverSeed).update(message).digest();
    }
    runPlinkoEngine(clientSeed, nonce, rows) {
        const path = [];
        let counter = 0;
        for (let i = 0; i < rows; i++) {
            const bytes = this.generateBytes(clientSeed, nonce, counter);
            const bit = bytes[0] & 1;
            path.push(bit);
            counter++;
        }
        const bin = path.reduce((sum, direction) => sum + direction, 0);
        return { path, bin };
    }
    round2(value) {
        return Math.round(value * 100) / 100;
    }
    placeBet(userId, bet, rows, risk, clientSeed) {
        const currentBalance = this.getBalance(userId);
        if (currentBalance < bet) {
            throw new Error('Insufficient balance');
        }
        this.balances.set(userId, currentBalance - bet);
        this.totalBets++;
        this.totalStake += bet;
        if (!this.userFair.has(userId)) {
            this.userFair.set(userId, {
                clientSeed: this.generateRandomClientSeed(),
                nonce: 0
            });
        }
        const userFairData = this.userFair.get(userId);
        if (clientSeed) {
            userFairData.clientSeed = clientSeed;
        }
        const currentNonce = userFairData.nonce;
        userFairData.nonce++;
        const { path, bin } = this.runPlinkoEngine(userFairData.clientSeed, currentNonce, rows);
        let multiplier = payouts_1.PAYOUTS[risk][rows][bin];
        if (risk === 'hard' && rows === 8 && (bin === 0 || bin === rows)) {
            multiplier = 0;
        }
        const payout = this.round2(bet * multiplier);
        const result = payout > bet ? 'win' : payout < bet ? 'loss' : 'push';
        this.totalPayout += payout;
        if (result === 'win') {
            this.winCount++;
        }
        else if (result === 'loss') {
            this.lossCount++;
        }
        else {
            this.pushCount++;
        }
        const newBalance = this.getBalance(userId) + payout;
        this.balances.set(userId, newBalance);
        const betId = `b_${Date.now()}_${++this.betCounter}`;
        const betRecord = {
            betId,
            userId,
            bet,
            rows,
            risk,
            path,
            bin,
            multiplier,
            payout,
            result,
            proof: {
                serverSeedHash: this.serverSeedHash,
                clientSeed: userFairData.clientSeed,
                nonce: currentNonce
            },
            balanceAfter: this.round2(newBalance),
            createdAt: new Date().toISOString()
        };
        this.bets.push(betRecord);
        return betRecord;
    }
    getStats() {
        const winRate = this.totalBets > 0 ? ((this.winCount / this.totalBets) * 100).toFixed(1) : "0.0";
        const lossRate = this.totalBets > 0 ? ((this.lossCount / this.totalBets) * 100).toFixed(1) : "0.0";
        return {
            totalBets: this.totalBets,
            totalStake: this.round2(this.totalStake),
            totalPayout: this.round2(this.totalPayout),
            houseProfit: this.round2(this.totalStake - this.totalPayout),
            winCount: this.winCount,
            lossCount: this.lossCount,
            pushCount: this.pushCount,
            winRate: `${winRate}%`,
            lossRate: `${lossRate}%`,
            serverSeedHash: this.serverSeedHash
        };
    }
};
exports.PlinkoService = PlinkoService;
exports.PlinkoService = PlinkoService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PlinkoService);
//# sourceMappingURL=plinko.service.js.map