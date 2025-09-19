import { CrashService } from './crash.service';
export declare class CrashController {
    private readonly crashService;
    constructor(crashService: CrashService);
    getFair(): {
        serverSeedHash: string;
    };
    getStats(): import("./crash.service").CrashStats;
}
