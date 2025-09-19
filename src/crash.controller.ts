import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { CrashService } from './crash.service';

@Controller('crash')
export class CrashController {
  constructor(private readonly crashService: CrashService) {}

  @Get('fair')
  getFair() {
    return this.crashService.getPublicFair();
  }

  @Get('stats')
  getStats() {
    return this.crashService.getStats();
  }

  // NEW: list raw history (limit optional)
  @Get('history')
  getHistory(@Query('limit') limit?: string) {
    const n = Math.max(1, Math.min(Number(limit) || 30, 50));
    return this.crashService.getHistory(n);
  }

  // NEW: dedup chips (limit optional)
  @Get('history/dedup')
  getHistoryDedup(@Query('limit') limit?: string) {
    const n = Math.max(1, Math.min(Number(limit) || 20, 50));
    return this.crashService.getHistoryDedup(n);
  }

  // NEW: round detail by id (for modal)
  @Get('history/:roundId')
  getHistoryItem(@Param('roundId') roundId: string) {
    const item = this.crashService.getHistory().find(h => h.roundId === roundId);
    if (!item) throw new NotFoundException('Round not found');
    return item;
  }
}
