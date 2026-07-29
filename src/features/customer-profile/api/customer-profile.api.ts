import { z } from 'zod';
import { getSupabaseClient, type Database } from '@/shared/supabase';
import type { ICustomerProfile, IUpdateCustomerProfileInput } from '../types';

type TProfileRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'display_name' | 'phone' | 'updated_at'
>;

const UPDATE_PROFILE_SCHEMA = z.object({
  customerId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .regex(/^\d{10,11}$/)
    .nullable()
    .optional(),
});

const mapCustomerProfile = (profile: TProfileRow): ICustomerProfile => ({
  id: profile.id,
  name: profile.display_name.trim(),
  phone: profile.phone,
  updatedAt: profile.updated_at,
});

export const fetchCustomerProfile = async (customerId: string): Promise<ICustomerProfile> => {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('id, display_name, phone, updated_at')
    .eq('id', customerId)
    .single();

  if (error) throw error;
  return mapCustomerProfile(data);
};

export const updateCustomerProfile = async (
  input: IUpdateCustomerProfileInput,
): Promise<ICustomerProfile> => {
  const profile = UPDATE_PROFILE_SCHEMA.parse(input);
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .update({
      display_name: profile.name,
      ...(profile.phone !== undefined ? { phone: profile.phone } : {}),
    })
    .eq('id', profile.customerId)
    .select('id, display_name, phone, updated_at')
    .single();

  if (error) throw error;
  return mapCustomerProfile(data);
};
