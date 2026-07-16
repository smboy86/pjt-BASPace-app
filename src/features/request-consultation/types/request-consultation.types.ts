export enum EConsultationMessageType {
  GENERAL = 'general',
  QUESTION = 'question',
  REVISION_REQUEST = 'revision_request',
  QUOTE_SENT = 'quote_sent',
  FINAL_QUOTE_SENT = 'final_quote_sent',
  FINAL_CONFIRMED = 'final_confirmed',
}

export interface IConsultationMessage {
  id: string;
  requestId: string;
  authorId: string;
  messageType: EConsultationMessageType;
  body: string;
  quoteId?: string;
  createdAt: string;
}

export interface ICreateConsultationMessageInput {
  requestId: string;
  authorId: string;
  messageType: EConsultationMessageType;
  body: string;
  quoteId?: string;
}
