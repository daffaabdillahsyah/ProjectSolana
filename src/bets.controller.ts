/*
 * Plinko Demo API - NestJS Backend
 * 
 * Sample usage:
 * curl -X POST http://localhost:3000/bets/plinko \
 *   -H "Content-Type: application/json" \
 *   -H "x-user-id: 1" \
 *   -d '{ "bet": 1, "rows": 8, "risk": "hard", "clientSeed": "abc123" }'
 * 
 * curl -X GET http://localhost:3000/demo/balance -H "x-user-id: 1"
 * curl -X GET http://localhost:3000/fair/current
 */

import { Controller, Get, Post, Body, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { PlinkoService } from './plinko.service';
import { RiskLevel } from './payouts';

interface PlinkoBetRequest {
  bet: number;
  rows: number;
  risk: RiskLevel;
  clientSeed?: string;
}

@Controller()
export class BetsController {
  constructor(private readonly plinkoService: PlinkoService) {}

  @Get('fair/current')
  getCurrentFair() {
    return {
      serverSeedHash: this.plinkoService.getServerSeedHash()
    };
  }

  @Get('demo/balance')
  getBalance(@Headers('x-user-id') userIdHeader?: string) {
    const userId = userIdHeader ? parseInt(userIdHeader, 10) : 1;
    if (isNaN(userId)) {
      throw new HttpException('Invalid user ID', HttpStatus.BAD_REQUEST);
    }

    return {
      balance: this.plinkoService.getBalance(userId)
    };
  }

  @Post('bets/plinko')
  placePlinkoBet(
    @Body() body: PlinkoBetRequest,
    @Headers('x-user-id') userIdHeader?: string
  ) {
    const userId = userIdHeader ? parseInt(userIdHeader, 10) : 1;
    if (isNaN(userId)) {
      throw new HttpException('Invalid user ID', HttpStatus.BAD_REQUEST);
    }

    // Validate request
    if (!body.bet || body.bet <= 0) {
      throw new HttpException('Bet must be greater than 0', HttpStatus.BAD_REQUEST);
    }

    if (body.bet > 10) {
      throw new HttpException('Demo bet limit is 10', HttpStatus.BAD_REQUEST);
    }

    if (body.rows !== 8) {
      throw new HttpException('Only 8 rows supported', HttpStatus.BAD_REQUEST);
    }

    if (!['easy', 'medium', 'hard'].includes(body.risk)) {
      throw new HttpException('Risk must be easy, medium, or hard', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = this.plinkoService.placeBet(
        userId,
        body.bet,
        body.rows,
        body.risk,
        body.clientSeed
      );

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
    } catch (error) {
      if (error.message === 'Insufficient balance') {
        throw new HttpException('Insufficient balance', HttpStatus.PAYMENT_REQUIRED);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('demo/stats')
  getDemoStats() {
    return this.plinkoService.getStats();
  }
}
