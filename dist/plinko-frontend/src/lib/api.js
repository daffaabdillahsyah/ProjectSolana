"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFair = getFair;
exports.getBalance = getBalance;
exports.getStats = getStats;
const API = (process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000').replace(/\/$/, '');
const USER_ID = '1';
async function getFair() {
    const response = await fetch(`${API}/fair/current`);
    if (!response.ok) {
        throw new Error('Failed to fetch fair data');
    }
    return response.json();
}
async function getBalance() {
    const response = await fetch(`${API}/demo/balance`, {
        headers: {
            'x-user-id': USER_ID,
        },
    });
    if (!response.ok) {
        throw new Error('Failed to fetch balance');
    }
    return response.json();
}
async function getStats() {
    const response = await fetch(`${API}/demo/stats`);
    if (!response.ok) {
        throw new Error('Failed to fetch stats');
    }
    return response.json();
}
//# sourceMappingURL=api.js.map