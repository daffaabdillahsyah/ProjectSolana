import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { BetsController } from './bets.controller';
import { PlinkoService } from './plinko.service';
import { PlinkoGateway } from './plinko.gateway';
import { CrashController } from './crash.controller';
import { CrashService } from './crash.service';
import { CrashGateway } from './crash.gateway';

@Module({
  controllers: [BetsController, CrashController],
  providers: [PlinkoService, PlinkoGateway, CrashService, CrashGateway],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend connection
  app.enableCors({
    origin: [
      'http://localhost:3001', 
      'http://127.0.0.1:3001',
      'http://192.168.56.1:3001'
    ],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'x-user-id'],
    credentials: true,
  });
  
  await app.listen(3000);
  console.log('Plinko Demo API running on http://localhost:3000');
}

bootstrap();
