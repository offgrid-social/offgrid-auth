function requireEnv(name) {
    const value = process.env[name];
    if (!value || value.trim() === "") {
        throw new Error(`Missing required env var: ${name}`);
    }
    return value;
}
function parsePort(value) {
    const port = Number.parseInt(value, 10);
    if (!Number.isFinite(port) || port <= 0) {
        throw new Error(`Invalid PORT: ${value}`);
    }
    return port;
}
export function loadConfig() {
    return {
        port: parsePort(process.env.PORT ?? "4000"),
        databaseUrl: requireEnv("DATABASE_URL"),
        jwtPrivateKey: requireEnv("JWT_PRIVATE_KEY"),
        jwtPublicKey: requireEnv("JWT_PUBLIC_KEY")
    };
}
//# sourceMappingURL=config.js.map