export declare const PAYOUTS: {
    readonly easy: {
        readonly 8: readonly [0.5, 0.8, 1, 1.2, 1.5, 1.2, 1, 0.8, 0.5];
    };
    readonly medium: {
        readonly 8: readonly [0.2, 0.6, 0.9, 1.2, 2.4, 1.2, 0.9, 0.6, 0.2];
    };
    readonly hard: {
        readonly 8: readonly [0.1, 0.3, 0.8, 1.5, 5.6, 1.5, 0.8, 0.3, 0.1];
    };
};
export type RiskLevel = keyof typeof PAYOUTS;
