import { getSupabaseClient, type Database } from '@/shared/supabase';
import { mapRequestPhoto } from '../model';
import type { IRequestPhoto } from '../types';

const REQUEST_PHOTOS_BUCKET = 'request-photos';
const SIGNED_URL_SECONDS = 60 * 60;

type TRequestPhotoRow = Database['public']['Tables']['request_photos']['Row'];

export const resolveRequestPhotos = async (
  rows: TRequestPhotoRow[],
): Promise<IRequestPhoto[]> => {
  const storage = getSupabaseClient().storage.from(REQUEST_PHOTOS_BUCKET);

  return Promise.all(
    rows.map(async (row) => {
      const { data, error } = await storage.createSignedUrl(
        row.storage_path,
        SIGNED_URL_SECONDS,
      );
      if (error) throw error;
      return mapRequestPhoto(row, data.signedUrl);
    }),
  );
};
