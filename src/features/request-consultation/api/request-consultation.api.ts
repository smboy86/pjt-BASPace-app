import { getSupabaseClient, type Database } from '@/shared/supabase';
import {
  EConsultationMessageType,
  type IConsultationMessage,
  type IPostRequestConsultationMessageInput,
} from '../types';

type TConsultationMessageRow = Pick<
  Database['public']['Tables']['consultation_messages']['Row'],
  | 'id'
  | 'request_id'
  | 'assignment_id'
  | 'author_id'
  | 'message_type'
  | 'body'
  | 'quote_id'
  | 'created_at'
>;

const MESSAGE_SELECT =
  'id, request_id, assignment_id, author_id, message_type, body, quote_id, created_at';

const mapMessageType = (
  messageType: TConsultationMessageRow['message_type'],
): EConsultationMessageType => {
  switch (messageType) {
    case 'message':
    case 'system':
      return EConsultationMessageType.GENERAL;
    case 'question':
      return EConsultationMessageType.QUESTION;
    case 'change_request':
      return EConsultationMessageType.REVISION_REQUEST;
    case 'quote_sent':
      return EConsultationMessageType.QUOTE_SENT;
    case 'quote_confirmed':
      return EConsultationMessageType.FINAL_CONFIRMED;
  }
};

const mapConsultationMessage = (row: TConsultationMessageRow): IConsultationMessage => ({
  id: row.id,
  requestId: row.request_id,
  assignmentId: row.assignment_id ?? undefined,
  authorId: row.author_id,
  messageType: mapMessageType(row.message_type),
  body: row.body,
  quoteId: row.quote_id ?? undefined,
  createdAt: row.created_at,
});

export const fetchRequestConsultationMessages = async (
  requestId: string,
): Promise<IConsultationMessage[]> => {
  if (!requestId) return [];

  const { data, error } = await getSupabaseClient()
    .from('consultation_messages')
    .select(MESSAGE_SELECT)
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw error;
  return data.map(mapConsultationMessage);
};

export const postRequestConsultationMessage = async (
  input: IPostRequestConsultationMessageInput,
): Promise<IConsultationMessage> => {
  const { data, error } = await getSupabaseClient()
    .from('consultation_messages')
    .insert({
      request_id: input.requestId,
      assignment_id: null,
      author_id: input.authorId,
      message_type: 'change_request',
      body: input.body,
    })
    .select(MESSAGE_SELECT)
    .single();

  if (error) throw error;
  return mapConsultationMessage(data);
};
