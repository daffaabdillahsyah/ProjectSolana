import { io } from 'socket.io-client';

const API = (process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000').replace(/\/$/, '');

export const socket = io(`${API}/ws/plinko`, { transports: ['websocket'] });
