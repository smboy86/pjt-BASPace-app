import { EQuoteStatus, IQuote, TCreateQuoteInput, useQuoteStore } from '@entities/quote';
import { ERemodelRequestStatus, useRemodelRequestStore } from '@entities/remodel-request';
import { useRequestConsultationStore } from '../store';
import { EConsultationMessageType, ICreateConsultationMessageInput } from '../types';

// 견적의 생성과 상태 전환은 각각 quote, remodel-request 엔티티가 소유한다.
export const useRequestConsultation = () => {
  const addMessage = useRequestConsultationStore((state) => state.addMessage);
  const createQuote = useQuoteStore((state) => state.createQuote);
  const sendQuote = useQuoteStore((state) => state.sendQuote);
  const confirmQuote = useQuoteStore((state) => state.confirmQuote);
  const setRequestStatus = useRemodelRequestStore((state) => state.setStatus);

  const postMessage = (input: ICreateConsultationMessageInput) => {
    const message = addMessage(input);
    setRequestStatus(input.requestId, ERemodelRequestStatus.IN_CONSULTATION);
    return message;
  };

  const createQuoteDraft = (input: TCreateQuoteInput) => createQuote(input);

  const sendQuoteVersion = (quote: IQuote, authorId: string, isFinal: boolean) => {
    sendQuote(quote.id, isFinal);
    addMessage({
      requestId: quote.requestId,
      authorId,
      messageType: isFinal
        ? EConsultationMessageType.FINAL_QUOTE_SENT
        : EConsultationMessageType.QUOTE_SENT,
      body: isFinal ? '최종 견적서를 보냈습니다.' : `견적서 v${quote.version}을 보냈습니다.`,
      quoteId: quote.id,
    });
    setRequestStatus(
      quote.requestId,
      isFinal ? ERemodelRequestStatus.FINAL_QUOTE_SENT : ERemodelRequestStatus.IN_CONSULTATION,
    );
  };

  const confirmFinalQuote = (quote: IQuote, customerId: string) => {
    if (quote.status !== EQuoteStatus.FINAL) return false;

    confirmQuote(quote.id);
    addMessage({
      requestId: quote.requestId,
      authorId: customerId,
      messageType: EConsultationMessageType.FINAL_CONFIRMED,
      body: '최종 견적을 확인했습니다.',
      quoteId: quote.id,
    });
    setRequestStatus(quote.requestId, ERemodelRequestStatus.CONFIRMED);
    return true;
  };

  return { postMessage, createQuoteDraft, sendQuoteVersion, confirmFinalQuote };
};
