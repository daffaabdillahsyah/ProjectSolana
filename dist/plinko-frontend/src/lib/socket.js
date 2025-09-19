"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socket = void 0;
const socket_io_client_1 = require("socket.io-client");
const API = (process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000').replace(/\/$/, '');
exports.socket = (0, socket_io_client_1.io)(`${API}/ws/plinko`, { transports: ['websocket'] });
//# sourceMappingURL=socket.js.map