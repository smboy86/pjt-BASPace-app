import {
  EQuoteOptionFormType,
  type IQuoteOption,
  type IQuoteOptionProduct,
} from '@/entities/quote-option';
import { getSupabaseClient, type Database } from '@/shared/supabase';

const QUOTE_OPTION_IMAGES_BUCKET = 'quote-option-images';
const SIGNED_URL_SECONDS = 60 * 10;

type TQuoteOptionRow = Database['public']['Tables']['quote_option_masters']['Row'];
type TQuoteOptionProductRow = Database['public']['Tables']['quote_option_products']['Row'];

const createSignedProduct = async (
  product: TQuoteOptionProductRow,
): Promise<IQuoteOptionProduct> => {
  if (!product.image_path) {
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      displayOrder: product.display_order,
      storagePath: '',
      tileSize: product.tile_size ?? undefined,
      url: '',
      createdAt: product.created_at,
    };
  }

  const { data, error } = await getSupabaseClient()
    .storage.from(QUOTE_OPTION_IMAGES_BUCKET)
    .createSignedUrl(product.image_path, SIGNED_URL_SECONDS);

  if (error) throw error;

  return {
    id: product.id,
    name: product.name,
    price: product.price,
    displayOrder: product.display_order,
    storagePath: product.image_path,
    tileSize: product.tile_size ?? undefined,
    url: data.signedUrl,
    createdAt: product.created_at,
  };
};

const mapOption = (option: TQuoteOptionRow, products: IQuoteOptionProduct[]): IQuoteOption => ({
  id: option.id,
  code: option.code,
  name: option.name,
  displayOrder: option.display_order,
  formType:
    option.form_type === EQuoteOptionFormType.ADVANCED
      ? EQuoteOptionFormType.ADVANCED
      : EQuoteOptionFormType.SIMPLE,
  isActive: option.is_active,
  products,
  createdAt: option.created_at,
  updatedAt: option.updated_at,
});

export const fetchCustomerQuoteOptions = async (): Promise<IQuoteOption[]> => {
  const supabase = getSupabaseClient();
  const [{ data: options, error: optionsError }, { data: products, error: productsError }] =
    await Promise.all([
      supabase
        .from('quote_option_masters')
        .select('*')
        .eq('is_active', true)
        .order('display_order')
        .order('name'),
      supabase
        .from('quote_option_products')
        .select('*')
        .order('display_order')
        .order('created_at')
        .order('id'),
    ]);

  if (optionsError) throw optionsError;
  if (productsError) throw productsError;

  const signedProducts = await Promise.all(products.map(createSignedProduct));
  const productsByOption = new Map<string, IQuoteOptionProduct[]>();

  products.forEach((product, index) => {
    const current = productsByOption.get(product.quote_option_id) ?? [];
    current.push(signedProducts[index]);
    productsByOption.set(product.quote_option_id, current);
  });

  return options.map((option) => mapOption(option, productsByOption.get(option.id) ?? []));
};
