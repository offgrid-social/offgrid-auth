export type AuthProof = {
  publicKey: string;
  signature: string;
  challenge: string;
};

export type AuthResult = {
  actorId: string;
  proof: AuthProof;
};
