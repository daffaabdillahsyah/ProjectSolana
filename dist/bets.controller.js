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
exports.BetsController = void 0;
const common_1 = require("@nestjs/common");
const plinko_service_1 = require("./plinko.service");
let BetsController = class BetsController {
    constructor(plinkoService) {
        this.plinkoService = plinkoService;
    }
    getCurrentFair() {
        return {
            serverSeedHash: this.plinkoService.getServerSeedHash()
        };
    }
    getBalance(userIdHeader) {
        const userId = userIdHeader ? parseInt(userIdHeader, 10) : 1;
        if (isNaN(userId)) {
            throw new common_1.HttpException('Invalid user ID', common_1.HttpStatus.BAD_REQUEST);
        }
        return {
            balance: this.plinkoService.getBalance(userId)
        };
    }
    placePlinkoBet(body, userIdHeader) {
        const userId = userIdHeader ? parseInt(userIdHeader, 10) : 1;
        if (isNaN(userId)) {
            throw new common_1.HttpException('Invalid user ID', common_1.HttpStatus.BAD_REQUEST);
        }
        if (!body.bet || body.bet <= 0) {
            throw new common_1.HttpException('Bet must be greater than 0', common_1.HttpStatus.BAD_REQUEST);
        }
        if (body.bet > 10) {
            throw new common_1.HttpException('Demo bet limit is 10', common_1.HttpStatus.BAD_REQUEST);
        }
        if (body.rows !== 8) {
            throw new common_1.HttpException('Only 8 rows supported', common_1.HttpStatus.BAD_REQUEST);
        }
        if (!['easy', 'medium', 'hard'].includes(body.risk)) {
            throw new common_1.HttpException('Risk must be easy, medium, or hard', common_1.HttpStatus.BAD_REQUEST);
        }
        try {
            const result = this.plinkoService.placeBet(userId, body.bet, body.rows, body.risk, body.clientSeed);
            return {
                betId: result.betId,
                path: result.path,
                bin: result.bin,
                multiplier: result.multiplier,
                payout: result.payout,
                result: result.result,
                proof: result.proof,
                balanceAfter: result.balanceAfter,
                createdAt: result.createdAt
            };
        }
        catch (error) {
            if (error.message === 'Insufficient balance') {
                throw new common_1.HttpException('Insufficient balance', common_1.HttpStatus.PAYMENT_REQUIRED);
            }
            throw new common_1.HttpException('Internal server error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    getDemoStats() {
        return this.plinkoService.getStats();
    }
};
exports.BetsController = BetsController;
__decorate([
    (0, common_1.Get)('fair/current'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BetsController.prototype, "getCurrentFair", null);
__decorate([
    (0, common_1.Get)('demo/balance'),
    __param(0, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BetsController.prototype, "getBalance", null);
__decorate([
    (0, common_1.Post)('bets/plinko'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BetsController.prototype, "placePlinkoBet", null);
__decorate([
    (0, common_1.Get)('demo/stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BetsController.prototype, "getDemoStats", null);
exports.BetsController = BetsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [plinko_service_1.PlinkoService])
], BetsController);
//# sourceMappingURL=bets.controller.js.map