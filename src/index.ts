export type { AuthProof, AuthResult } from "./types.js";
export {
  createAuthResult,
  deriveActorId,
  generateChallenge,
  verifyProof
} from "./auth.js";
