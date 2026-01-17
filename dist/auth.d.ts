import type { AuthProof, AuthResult } from "./types.js";
export declare function deriveActorId(publicKey: string): string;
export declare function verifyProof(proof: AuthProof): boolean;
export declare function createAuthResult(proof: AuthProof): AuthResult;
export declare function generateChallenge(byteLength?: number): string;
