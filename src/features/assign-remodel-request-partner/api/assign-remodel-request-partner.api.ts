import { getSupabaseClient } from '@/shared/supabase';
import type {
  IAssignablePartner,
  IAssignRemodelRequestPartnerInput,
} from '../types';

export const fetchAssignablePartners = async (): Promise<IAssignablePartner[]> => {
  const supabase = getSupabaseClient();
  const { data: partners, error: partnerError } = await supabase
    .from('partners')
    .select('id, company_name, contact_name')
    .eq('approval_status', 'approved')
    .order('company_name')
    .order('id');

  if (partnerError) throw partnerError;
  if (partners.length === 0) return [];

  const { data: accounts, error: accountError } = await supabase
    .from('partner_login_accounts')
    .select('partner_id, login_email')
    .in(
      'partner_id',
      partners.map((partner) => partner.id),
    );

  if (accountError) throw accountError;

  const emailsByPartnerId = new Map(
    accounts.map((account) => [account.partner_id, account.login_email]),
  );

  return partners.flatMap((partner) => {
    const representativeEmail = emailsByPartnerId.get(partner.id);
    if (!representativeEmail) return [];

    return [
      {
        id: partner.id,
        companyName: partner.company_name,
        representativeName: partner.contact_name,
        representativeEmail,
      },
    ];
  });
};

export const assignRemodelRequestPartner = async (
  input: IAssignRemodelRequestPartnerInput,
): Promise<string> => {
  const { data, error } = await getSupabaseClient().rpc('assign_remodel_request_partner', {
    target_partner_id: input.partnerId,
    target_request_id: input.requestId,
  });

  if (error) throw error;
  return data;
};
