import type { ImagePickerAsset } from 'expo-image-picker';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EQuoteOptionFormType } from '@/entities/quote-option';
import { updateQuoteOption } from './quote-option-management.api';

const mocks = vi.hoisted(() => ({
  createSignedUrl: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  queueDelete: vi.fn(),
  queueUpdate: vi.fn(),
  queueUpsert: vi.fn(),
  remove: vi.fn(),
  rpc: vi.fn(),
  upload: vi.fn(),
}));

const quoteOptionTypes = vi.hoisted(() => ({
  EQuoteOptionFormType: {
    ADVANCED: 'advanced',
    SIMPLE: 'simple',
  } as const,
}));

vi.mock('@/entities/quote-option', () => quoteOptionTypes);

vi.mock('@/shared/supabase', () => ({
  getSupabaseClient: () => ({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
    rpc: mocks.rpc,
    storage: {
      from: () => ({
        createSignedUrl: mocks.createSignedUrl,
        remove: mocks.remove,
        upload: mocks.upload,
      }),
    },
  }),
}));

const JPEG_BUFFER = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]).buffer;

const createAsset = (uri: string): ImagePickerAsset => ({
  assetId: null,
  fileName: `${uri}.jpg`,
  fileSize: JPEG_BUFFER.byteLength,
  height: 100,
  mimeType: 'image/jpeg',
  type: 'image',
  uri,
  width: 100,
});

const createInput = (assets: ImagePickerAsset[]) => ({
  optionId: '11111111-1111-1111-1111-111111111111',
  name: '타일',
  displayOrder: 1,
  formType: quoteOptionTypes.EQuoteOptionFormType.ADVANCED as EQuoteOptionFormType,
  products: assets.map((asset, index) => ({
    key: `new-${index}`,
    name: `제품 ${index + 1}`,
    price: 0,
    image: { key: `new-image-${index}`, kind: 'new' as const, asset, uri: asset.uri },
  })),
});

const configureTableQueries = ({
  detailError = null,
  queueUpsertError = null,
}: {
  detailError?: Error | null;
  queueUpsertError?: Error | null;
} = {}): void => {
  mocks.queueUpsert.mockResolvedValue({ error: queueUpsertError });
  mocks.queueDelete.mockResolvedValue({ error: null });
  mocks.queueUpdate.mockResolvedValue({ error: null });

  mocks.from.mockImplementation((table: string) => {
    if (table === 'quote_option_image_cleanup_queue') {
      return {
        delete: () => ({ in: mocks.queueDelete }),
        select: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
        update: () => ({ eq: mocks.queueUpdate }),
        upsert: mocks.queueUpsert,
      };
    }
    if (table === 'quote_option_products') {
      return {
        select: (columns: string) =>
          columns === 'image_path'
            ? { eq: () => Promise.resolve({ data: [], error: null }) }
            : {
                eq: () => ({
                  order: () => Promise.resolve({ data: [], error: null }),
                }),
              },
      };
    }
    if (table === 'quote_option_masters') {
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: null,
                error: detailError,
              }),
          }),
        }),
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
};

describe('updateQuoteOption image compensation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(JPEG_BUFFER),
        ok: true,
      }),
    );
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null });
    mocks.remove.mockResolvedValue({ error: null });
    configureTableQueries();
  });

  it('removes an earlier upload when a later upload fails', async () => {
    mocks.upload
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: new Error('upload failed') });

    await expect(
      updateQuoteOption(createInput([createAsset('first'), createAsset('second')])),
    ).rejects.toMatchObject({ code: 'upload_failed' });

    expect(mocks.remove).toHaveBeenCalledTimes(1);
    expect(mocks.remove).toHaveBeenCalledWith([
      expect.stringContaining('11111111-1111-1111-1111-111111111111/'),
    ]);
    expect(mocks.upload).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/^11111111-1111-1111-1111-111111111111\/[^/]+\.jpg$/),
      JPEG_BUFFER,
      { contentType: 'image/jpeg', upsert: false },
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('keeps uploaded files when the RPC committed but detail refresh fails', async () => {
    configureTableQueries({ detailError: new Error('refresh failed') });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.rpc.mockResolvedValue({ error: null });

    await expect(updateQuoteOption(createInput([createAsset('committed')]))).rejects.toMatchObject({
      code: 'unknown',
    });

    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it('surfaces a cleanup warning when storage removal and queue recording fail', async () => {
    configureTableQueries({ queueUpsertError: new Error('queue unavailable') });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.rpc.mockResolvedValue({ error: new Error('rpc failed') });
    mocks.remove.mockResolvedValue({ error: new Error('remove failed') });

    await expect(updateQuoteOption(createInput([createAsset('cleanup')]))).rejects.toMatchObject({
      code: 'cleanup_pending',
      message:
        '변경사항을 저장하지 못했고 임시 이미지 정리도 지연되고 있어요. 네트워크를 확인한 뒤 다시 저장해 주세요.',
    });

    expect(mocks.remove).toHaveBeenCalledTimes(2);
    expect(mocks.queueUpsert).toHaveBeenCalledOnce();
  });
});
