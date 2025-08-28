# Plinko Demo API

Minimal NestJS backend for Plinko game logic with provably fair mechanics.

## Quick Start

```bash
npm install
npm run dev
```

Server runs on `http://localhost:3000`

## API Endpoints

### Get Server Seed Hash
```bash
curl http://localhost:3000/fair/current
```

### Get Balance
```bash
curl -H "x-user-id: 1" http://localhost:3000/demo/balance
```

### Place Bet
```bash
curl -X POST http://localhost:3000/bets/plinko \
  -H "Content-Type: application/json" \
  -H "x-user-id: 1" \
  -d '{"bet": 1, "rows": 8, "risk": "hard", "clientSeed": "abc123"}'
```

## Features

- **Provably Fair**: HMAC-SHA256 based RNG with client seed verification
- **In-Memory Storage**: No database required - runs out of the box
- **Risk Levels**: Easy, Medium, Hard with different payout multipliers
- **Demo Limits**: Max bet 10, starting balance 100
- **Mock Auth**: Simple x-user-id header authentication

## Files Structure

- `src/main.ts` - Bootstrap with embedded app module
- `src/bets.controller.ts` - API endpoints
- `src/plinko.service.ts` - Game logic and state management
- `src/payouts.ts` - Payout multiplier tables
