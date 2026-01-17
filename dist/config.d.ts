type Config = {
    port: number;
    databaseUrl: string;
    jwtPrivateKey: string;
    jwtPublicKey: string;
};
export declare function loadConfig(): Config;
export {};
