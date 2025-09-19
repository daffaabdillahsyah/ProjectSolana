"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const bets_controller_1 = require("./bets.controller");
const plinko_service_1 = require("./plinko.service");
const plinko_gateway_1 = require("./plinko.gateway");
const crash_controller_1 = require("./crash.controller");
const crash_service_1 = require("./crash.service");
const crash_gateway_1 = require("./crash.gateway");
let AppModule = class AppModule {
};
AppModule = __decorate([
    (0, common_1.Module)({
        controllers: [bets_controller_1.BetsController, crash_controller_1.CrashController],
        providers: [plinko_service_1.PlinkoService, plinko_gateway_1.PlinkoGateway, crash_service_1.CrashService, crash_gateway_1.CrashGateway],
    })
], AppModule);
async function bootstrap() {
    const app = await core_1.NestFactory.create(AppModule);
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
//# sourceMappingURL=main.js.map