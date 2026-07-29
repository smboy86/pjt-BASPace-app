export interface IAssignablePartner {
  id: string;
  companyName: string;
  representativeName: string;
  representativeEmail: string;
}

export interface IAssignRemodelRequestPartnerInput {
  requestId: string;
  partnerId: string;
}
