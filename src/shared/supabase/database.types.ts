export type TJson =
  | string
  | number
  | boolean
  | null
  | { [key: string]: TJson | undefined }
  | TJson[];

/**
 * Generated schema placeholder. Replace this file with `supabase gen types`
 * output whenever a migration is applied to the linked project.
 */
export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
