import crypto from "node:crypto";

import type { AuthProof, AuthResult } from "./types.js";

const HASH_ALGORITHM = "sha256";

export function deriveActorId(publicKey: string): string {
  const publicKeyBytes = Buffer.from(publicKey, "base64");
  return crypto.createHash(HASH_ALGORITHM).update(publicKeyBytes).digest("hex");
}

export function verifyProof(proof: AuthProof): boolean {
  try {
    const publicKeyBytes = Buffer.from(proof.publicKey, "base64");
    const signatureBytes = Buffer.from(proof.signature, "base64");
    const challengeBytes = Buffer.from(proof.challenge, "utf8");
    const key = crypto.createPublicKey({
      key: publicKeyBytes,
      format: "der",
      type: "spki"
    });
    return crypto.verify(null, challengeBytes, key, signatureBytes);
  } catch {
    return false;
  }
}

export function createAuthResult(proof: AuthProof): AuthResult {
  if (!verifyProof(proof)) {
    throw new Error("Invalid signature");
  }

  return {
    actorId: deriveActorId(proof.publicKey),
    proof: {
      publicKey: proof.publicKey,
      signature: proof.signature,
      challenge: proof.challenge
    }
  };
}

export function generateChallenge(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString("base64");
}
