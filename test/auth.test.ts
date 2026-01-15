import crypto from "node:crypto";
import { describe, expect, it } from "vitest";

import { createAuthResult, deriveActorId, verifyProof } from "../src/auth.js";

function createFixture() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const publicKeyDer = publicKey.export({ format: "der", type: "spki" });
  const publicKeyBase64 = Buffer.from(publicKeyDer).toString("base64");
  const challenge = "challenge-" + crypto.randomUUID();
  const signature = crypto.sign(null, Buffer.from(challenge, "utf8"), privateKey);
  const signatureBase64 = Buffer.from(signature).toString("base64");

  return {
    publicKeyBase64,
    privateKey,
    challenge,
    signatureBase64
  };
}

describe("offgrid-auth", () => {
  it("produces deterministic actorId for the same publicKey", () => {
    const fixture = createFixture();
    const first = deriveActorId(fixture.publicKeyBase64);
    const second = deriveActorId(fixture.publicKeyBase64);
    expect(first).toBe(second);
  });

  it("rejects invalid signatures", () => {
    const fixture = createFixture();
    const invalidProof = {
      publicKey: fixture.publicKeyBase64,
      signature: fixture.signatureBase64,
      challenge: "different-" + fixture.challenge
    };
    expect(verifyProof(invalidProof)).toBe(false);
  });

  it("does not include accountLevel or permissions in output", () => {
    const fixture = createFixture();
    const result = createAuthResult({
      publicKey: fixture.publicKeyBase64,
      signature: fixture.signatureBase64,
      challenge: fixture.challenge
    });
    expect(Object.keys(result).sort()).toEqual(["actorId", "proof"]);
    expect(Object.keys(result.proof).sort()).toEqual([
      "challenge",
      "publicKey",
      "signature"
    ]);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/accountLevel/i);
    expect(serialized).not.toMatch(/permission/i);
    expect(serialized).not.toMatch(/role/i);
  });

  it("supports anonymous identities with only a keypair", () => {
    const fixture = createFixture();
    const result = createAuthResult({
      publicKey: fixture.publicKeyBase64,
      signature: fixture.signatureBase64,
      challenge: fixture.challenge
    });
    expect(result.actorId).toHaveLength(64);
    expect(result.proof.publicKey).toBe(fixture.publicKeyBase64);
  });
});
