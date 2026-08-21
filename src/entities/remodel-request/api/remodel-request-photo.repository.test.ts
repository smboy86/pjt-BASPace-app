import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveRequestPhotos } from './remodel-request-photo.repository';

const mocks = vi.hoisted(() => ({
  createSignedUrl: vi.fn(),
}));

vi.mock('@/shared/supabase', () => ({
  getSupabaseClient: () => ({
    storage: {
      from: () => ({ createSignedUrl: mocks.createSignedUrl }),
    },
  }),
}));

describe('request photo repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.example/signed-photo' },
      error: null,
    });
  });

  it('maps a private storage object to a signed display URI', async () => {
    await expect(
      resolveRequestPhotos([
        {
          category: 'bathroom',
          created_at: '2026-08-21T00:00:00.000Z',
          id: 'photo-1',
          mime_type: 'image/jpeg',
          request_id: 'request-1',
          size_bytes: 1234,
          sort_order: 0,
          storage_path: 'customer-1/photo-1.jpg',
        },
      ]),
    ).resolves.toEqual([
      {
        category: 'bathroom',
        createdAt: '2026-08-21T00:00:00.000Z',
        displayUri: 'https://storage.example/signed-photo',
        id: 'photo-1',
        mimeType: 'image/jpeg',
        sizeBytes: 1234,
        sortOrder: 0,
        storagePath: 'customer-1/photo-1.jpg',
      },
    ]);
    expect(mocks.createSignedUrl).toHaveBeenCalledWith('customer-1/photo-1.jpg', 3600);
  });

  it('rejects when a signed URL cannot be created', async () => {
    mocks.createSignedUrl.mockResolvedValueOnce({
      data: null,
      error: new Error('forbidden'),
    });

    await expect(
      resolveRequestPhotos([
        {
          category: 'bathroom',
          created_at: '2026-08-21T00:00:00.000Z',
          id: 'photo-1',
          mime_type: 'image/jpeg',
          request_id: 'request-1',
          size_bytes: 1234,
          sort_order: 0,
          storage_path: 'customer-1/photo-1.jpg',
        },
      ]),
    ).rejects.toThrow('forbidden');
  });
});
