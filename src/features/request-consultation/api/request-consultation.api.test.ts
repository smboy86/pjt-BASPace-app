import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchRequestConsultationMessages,
  postRequestConsultationMessage,
} from './request-consultation.api';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  insert: vi.fn(),
}));

vi.mock('@/shared/supabase', () => ({
  getSupabaseClient: () => ({
    from: mocks.from,
  }),
}));

const MESSAGE_ROW = {
  assignment_id: null,
  author_id: 'customer-1',
  body: '세면대 제품을 다시 확인해 주세요.',
  created_at: '2026-07-29T03:00:00.000Z',
  id: 'message-1',
  message_type: 'change_request',
  quote_id: null,
  request_id: 'request-1',
} as const;

describe('request consultation api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads request messages in creation order and maps nullable relationships', async () => {
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => ({
            order: () => Promise.resolve({ data: [MESSAGE_ROW], error: null }),
          }),
        }),
      }),
    });

    await expect(fetchRequestConsultationMessages('request-1')).resolves.toEqual([
      {
        authorId: 'customer-1',
        body: '세면대 제품을 다시 확인해 주세요.',
        createdAt: '2026-07-29T03:00:00.000Z',
        id: 'message-1',
        messageType: 'revision_request',
        requestId: 'request-1',
      },
    ]);
  });

  it('stores a customer comment as a request-level change request', async () => {
    const single = vi.fn().mockResolvedValue({ data: MESSAGE_ROW, error: null });
    const select = vi.fn().mockReturnValue({ single });
    mocks.insert.mockReturnValue({ select });
    mocks.from.mockReturnValue({ insert: mocks.insert });

    await expect(
      postRequestConsultationMessage({
        authorId: 'customer-1',
        body: '세면대 제품을 다시 확인해 주세요.',
        requestId: 'request-1',
      }),
    ).resolves.toMatchObject({
      id: 'message-1',
      messageType: 'revision_request',
    });

    expect(mocks.insert).toHaveBeenCalledWith({
      assignment_id: null,
      author_id: 'customer-1',
      body: '세면대 제품을 다시 확인해 주세요.',
      message_type: 'change_request',
      request_id: 'request-1',
    });
  });

  it('propagates database errors without clearing the customer input', async () => {
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => ({
            order: () =>
              Promise.resolve({
                data: null,
                error: { code: '42501', message: 'permission denied' },
              }),
          }),
        }),
      }),
    });

    await expect(fetchRequestConsultationMessages('request-1')).rejects.toMatchObject({
      code: '42501',
    });
  });
});
