export interface IPartnerMatchInput {
  requestId: string;
  partnerId: string;
}

export interface IPartnerMatchCandidate {
  partnerId: string;
  score: number;
  reasons: string[];
}
