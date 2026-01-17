import "dotenv/config";
import fastify from "fastify";
import { createAuthResult, generateChallenge } from "./auth.js";
import { loadConfig } from "./config.js";
const config = loadConfig();
const app = fastify({
    logger: true
});
app.get("/health", async () => ({ status: "ok" }));
app.get("/challenge", async () => ({ challenge: generateChallenge() }));
app.post("/verify", async (request, reply) => {
    const proof = request.body;
    if (!isAuthProof(proof)) {
        return reply.status(400).send({ error: "Invalid proof" });
    }
    try {
        return createAuthResult(proof);
    }
    catch (error) {
        request.log.warn({ error }, "Invalid auth proof");
        return reply.status(401).send({ error: "Invalid signature" });
    }
});
function isAuthProof(value) {
    return Boolean(value &&
        typeof value.publicKey === "string" &&
        typeof value.signature === "string" &&
        typeof value.challenge === "string");
}
try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
}
catch (error) {
    app.log.error({ error }, "Failed to start server");
    process.exit(1);
}
//# sourceMappingURL=server.js.map