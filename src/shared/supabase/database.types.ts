export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      catalog_items: {
        Row: {
          base_price: number | null;
          brand: string | null;
          category: string;
          created_at: string;
          description: string | null;
          id: string;
          image_path: string | null;
          is_active: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          base_price?: number | null;
          brand?: string | null;
          category: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          base_price?: number | null;
          brand?: string | null;
          category?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      catalog_options: {
        Row: {
          catalog_item_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          price_delta: number;
          updated_at: string;
        };
        Insert: {
          catalog_item_id: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          price_delta?: number;
          updated_at?: string;
        };
        Update: {
          catalog_item_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          price_delta?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'catalog_options_catalog_item_id_fkey';
            columns: ['catalog_item_id'];
            isOneToOne: false;
            referencedRelation: 'catalog_items';
            referencedColumns: ['id'];
          },
        ];
      };
      catalog_price_history: {
        Row: {
          catalog_item_id: string;
          changed_at: string;
          changed_by: string;
          id: string;
          new_price: number | null;
          previous_price: number | null;
        };
        Insert: {
          catalog_item_id: string;
          changed_at?: string;
          changed_by: string;
          id?: string;
          new_price?: number | null;
          previous_price?: number | null;
        };
        Update: {
          catalog_item_id?: string;
          changed_at?: string;
          changed_by?: string;
          id?: string;
          new_price?: number | null;
          previous_price?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'catalog_price_history_catalog_item_id_fkey';
            columns: ['catalog_item_id'];
            isOneToOne: false;
            referencedRelation: 'catalog_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'catalog_price_history_changed_by_fkey';
            columns: ['changed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      construction_type_cost_settings: {
        Row: {
          amount_manwon: number;
          code: string;
          created_at: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          amount_manwon?: number;
          code: string;
          created_at?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          amount_manwon?: number;
          code?: string;
          created_at?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'construction_type_cost_settings_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      consultation_messages: {
        Row: {
          assignment_id: string | null;
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          message_type: Database['public']['Enums']['message_type'];
          quote_id: string | null;
          request_id: string;
        };
        Insert: {
          assignment_id?: string | null;
          author_id: string;
          body?: string;
          created_at?: string;
          id?: string;
          message_type?: Database['public']['Enums']['message_type'];
          quote_id?: string | null;
          request_id: string;
        };
        Update: {
          assignment_id?: string | null;
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          message_type?: Database['public']['Enums']['message_type'];
          quote_id?: string | null;
          request_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'consultation_messages_assignment_id_fkey';
            columns: ['assignment_id'];
            isOneToOne: false;
            referencedRelation: 'request_assignments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'consultation_messages_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'consultation_messages_quote_id_fkey';
            columns: ['quote_id'];
            isOneToOne: false;
            referencedRelation: 'quotes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'consultation_messages_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'remodel_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      design_packages: {
        Row: {
          cover_image_path: string | null;
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          cover_image_path?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          cover_image_path?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      partner_login_accounts: {
        Row: {
          created_at: string;
          login_email: string;
          partner_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          login_email: string;
          partner_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          login_email?: string;
          partner_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'partner_login_accounts_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: true;
            referencedRelation: 'partners';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'partner_login_accounts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      partner_members: {
        Row: {
          created_at: string;
          id: string;
          is_manager: boolean;
          partner_id: string;
          status: Database['public']['Enums']['partner_member_status'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_manager?: boolean;
          partner_id: string;
          status?: Database['public']['Enums']['partner_member_status'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_manager?: boolean;
          partner_id?: string;
          status?: Database['public']['Enums']['partner_member_status'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'partner_members_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partners';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'partner_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      partners: {
        Row: {
          approval_status: Database['public']['Enums']['partner_approval_status'];
          business_number: string;
          business_number_normalized: string | null;
          business_registration_image_path: string | null;
          company_name: string;
          contact_name: string;
          contact_phone: string;
          created_at: string;
          id: string;
          note: string | null;
          service_regions: string[];
          service_types: string[];
          updated_at: string;
        };
        Insert: {
          approval_status?: Database['public']['Enums']['partner_approval_status'];
          business_number: string;
          business_number_normalized?: string | null;
          business_registration_image_path?: string | null;
          company_name: string;
          contact_name: string;
          contact_phone: string;
          created_at?: string;
          id?: string;
          note?: string | null;
          service_regions?: string[];
          service_types?: string[];
          updated_at?: string;
        };
        Update: {
          approval_status?: Database['public']['Enums']['partner_approval_status'];
          business_number?: string;
          business_number_normalized?: string | null;
          business_registration_image_path?: string | null;
          company_name?: string;
          contact_name?: string;
          contact_phone?: string;
          created_at?: string;
          id?: string;
          note?: string | null;
          service_regions?: string[];
          service_types?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          phone: string | null;
          role: Database['public']['Enums']['app_role'];
          status: Database['public']['Enums']['profile_status'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string;
          id: string;
          phone?: string | null;
          role?: Database['public']['Enums']['app_role'];
          status?: Database['public']['Enums']['profile_status'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          phone?: string | null;
          role?: Database['public']['Enums']['app_role'];
          status?: Database['public']['Enums']['profile_status'];
          updated_at?: string;
        };
        Relationships: [];
      };
      quote_line_items: {
        Row: {
          amount: number;
          category: string;
          created_at: string;
          id: string;
          name: string;
          note: string | null;
          quantity: number;
          quote_id: string;
          sort_order: number;
          unit_price: number;
        };
        Insert: {
          amount: number;
          category: string;
          created_at?: string;
          id?: string;
          name: string;
          note?: string | null;
          quantity: number;
          quote_id: string;
          sort_order?: number;
          unit_price: number;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string;
          id?: string;
          name?: string;
          note?: string | null;
          quantity?: number;
          quote_id?: string;
          sort_order?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'quote_line_items_quote_id_fkey';
            columns: ['quote_id'];
            isOneToOne: false;
            referencedRelation: 'quotes';
            referencedColumns: ['id'];
          },
        ];
      };
      quote_option_image_cleanup_queue: {
        Row: {
          attempts: number;
          created_at: string;
          last_attempt_at: string | null;
          storage_path: string;
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          last_attempt_at?: string | null;
          storage_path: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          last_attempt_at?: string | null;
          storage_path?: string;
        };
        Relationships: [];
      };
      quote_option_images: {
        Row: {
          created_at: string;
          display_order: number;
          id: string;
          quote_option_id: string;
          storage_path: string;
        };
        Insert: {
          created_at?: string;
          display_order: number;
          id?: string;
          quote_option_id: string;
          storage_path: string;
        };
        Update: {
          created_at?: string;
          display_order?: number;
          id?: string;
          quote_option_id?: string;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quote_option_images_quote_option_id_fkey';
            columns: ['quote_option_id'];
            isOneToOne: false;
            referencedRelation: 'quote_option_masters';
            referencedColumns: ['id'];
          },
        ];
      };
      quote_option_masters: {
        Row: {
          code: string;
          created_at: string;
          display_order: number;
          form_type: Database['public']['Enums']['quote_option_form_type'];
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          display_order: number;
          form_type?: Database['public']['Enums']['quote_option_form_type'];
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          display_order?: number;
          form_type?: Database['public']['Enums']['quote_option_form_type'];
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      quote_option_products: {
        Row: {
          created_at: string;
          display_order: number;
          id: string;
          image_path: string | null;
          name: string;
          price: number;
          quote_option_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_order?: number;
          id?: string;
          image_path?: string | null;
          name: string;
          price: number;
          quote_option_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_order?: number;
          id?: string;
          image_path?: string | null;
          name?: string;
          price?: number;
          quote_option_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quote_option_products_quote_option_id_fkey';
            columns: ['quote_option_id'];
            isOneToOne: false;
            referencedRelation: 'quote_option_masters';
            referencedColumns: ['id'];
          },
        ];
      };
      quotes: {
        Row: {
          assignment_id: string;
          author_id: string;
          created_at: string;
          discount: number;
          id: string;
          note: string | null;
          request_id: string;
          sent_at: string | null;
          status: Database['public']['Enums']['quote_status'];
          subtotal: number;
          tax: number;
          tax_included: boolean;
          total: number;
          updated_at: string;
          valid_until: string | null;
          version: number;
        };
        Insert: {
          assignment_id: string;
          author_id: string;
          created_at?: string;
          discount?: number;
          id?: string;
          note?: string | null;
          request_id: string;
          sent_at?: string | null;
          status?: Database['public']['Enums']['quote_status'];
          subtotal?: number;
          tax?: number;
          tax_included?: boolean;
          total?: number;
          updated_at?: string;
          valid_until?: string | null;
          version: number;
        };
        Update: {
          assignment_id?: string;
          author_id?: string;
          created_at?: string;
          discount?: number;
          id?: string;
          note?: string | null;
          request_id?: string;
          sent_at?: string | null;
          status?: Database['public']['Enums']['quote_status'];
          subtotal?: number;
          tax?: number;
          tax_included?: boolean;
          total?: number;
          updated_at?: string;
          valid_until?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'quotes_assignment_id_fkey';
            columns: ['assignment_id'];
            isOneToOne: false;
            referencedRelation: 'request_assignments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quotes_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quotes_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'remodel_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      remodel_request_schedule_changes: {
        Row: {
          changed_at: string;
          changed_by: string;
          id: string;
          new_schedule: string;
          previous_schedule: string;
          request_id: string;
        };
        Insert: {
          changed_at?: string;
          changed_by: string;
          id?: string;
          new_schedule: string;
          previous_schedule: string;
          request_id: string;
        };
        Update: {
          changed_at?: string;
          changed_by?: string;
          id?: string;
          new_schedule?: string;
          previous_schedule?: string;
          request_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'remodel_request_schedule_changes_changed_by_fkey';
            columns: ['changed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'remodel_request_schedule_changes_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'remodel_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      remodel_requests: {
        Row: {
          address_detail: string;
          adjusted_at: string | null;
          adjusted_by: string | null;
          adjusted_estimate_amount: number | null;
          adjustment_confirmed_at: string | null;
          bathroom_type: string;
          budget_range: string;
          created_at: string;
          customer_id: string;
          demolition_cost_snapshot_manwon: number | null;
          desired_schedule: string;
          estimated_size: string | null;
          has_bathtub: boolean | null;
          housing_type: string;
          id: string;
          notes: string;
          priorities: string[];
          region: string;
          requires_demolition: boolean | null;
          scope: Database['public']['Enums']['remodel_scope'];
          special_structure_note: string | null;
          status: Database['public']['Enums']['remodel_request_status'];
          submitted_at: string | null;
          updated_at: string;
        };
        Insert: {
          address_detail?: string;
          adjusted_at?: string | null;
          adjusted_by?: string | null;
          adjusted_estimate_amount?: number | null;
          adjustment_confirmed_at?: string | null;
          bathroom_type: string;
          budget_range: string;
          created_at?: string;
          customer_id: string;
          demolition_cost_snapshot_manwon?: number | null;
          desired_schedule: string;
          estimated_size?: string | null;
          has_bathtub?: boolean | null;
          housing_type: string;
          id?: string;
          notes?: string;
          priorities?: string[];
          region: string;
          requires_demolition?: boolean | null;
          scope: Database['public']['Enums']['remodel_scope'];
          special_structure_note?: string | null;
          status?: Database['public']['Enums']['remodel_request_status'];
          submitted_at?: string | null;
          updated_at?: string;
        };
        Update: {
          address_detail?: string;
          adjusted_at?: string | null;
          adjusted_by?: string | null;
          adjusted_estimate_amount?: number | null;
          adjustment_confirmed_at?: string | null;
          bathroom_type?: string;
          budget_range?: string;
          created_at?: string;
          customer_id?: string;
          demolition_cost_snapshot_manwon?: number | null;
          desired_schedule?: string;
          estimated_size?: string | null;
          has_bathtub?: boolean | null;
          housing_type?: string;
          id?: string;
          notes?: string;
          priorities?: string[];
          region?: string;
          requires_demolition?: boolean | null;
          scope?: Database['public']['Enums']['remodel_scope'];
          special_structure_note?: string | null;
          status?: Database['public']['Enums']['remodel_request_status'];
          submitted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'remodel_requests_adjusted_by_fkey';
            columns: ['adjusted_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'remodel_requests_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      request_assignments: {
        Row: {
          assigned_at: string;
          assigned_staff_id: string | null;
          created_at: string;
          id: string;
          partner_id: string;
          request_id: string;
          responded_at: string | null;
          response_note: string | null;
          status: Database['public']['Enums']['assignment_status'];
          updated_at: string;
        };
        Insert: {
          assigned_at?: string;
          assigned_staff_id?: string | null;
          created_at?: string;
          id?: string;
          partner_id: string;
          request_id: string;
          responded_at?: string | null;
          response_note?: string | null;
          status?: Database['public']['Enums']['assignment_status'];
          updated_at?: string;
        };
        Update: {
          assigned_at?: string;
          assigned_staff_id?: string | null;
          created_at?: string;
          id?: string;
          partner_id?: string;
          request_id?: string;
          responded_at?: string | null;
          response_note?: string | null;
          status?: Database['public']['Enums']['assignment_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'request_assignments_assigned_staff_id_fkey';
            columns: ['assigned_staff_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'request_assignments_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partners';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'request_assignments_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'remodel_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      request_photos: {
        Row: {
          category: string;
          created_at: string;
          id: string;
          mime_type: string | null;
          request_id: string;
          size_bytes: number | null;
          sort_order: number;
          storage_path: string;
        };
        Insert: {
          category?: string;
          created_at?: string;
          id?: string;
          mime_type?: string | null;
          request_id: string;
          size_bytes?: number | null;
          sort_order?: number;
          storage_path: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          id?: string;
          mime_type?: string | null;
          request_id?: string;
          size_bytes?: number | null;
          sort_order?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'request_photos_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'remodel_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      selection_snapshots: {
        Row: {
          base_price_snapshot: number | null;
          catalog_item_id: string | null;
          category: string;
          created_at: string;
          decision_status: Database['public']['Enums']['selection_decision'];
          id: string;
          item_name: string | null;
          request_id: string;
          selected_options: Json;
        };
        Insert: {
          base_price_snapshot?: number | null;
          catalog_item_id?: string | null;
          category: string;
          created_at?: string;
          decision_status: Database['public']['Enums']['selection_decision'];
          id?: string;
          item_name?: string | null;
          request_id: string;
          selected_options?: Json;
        };
        Update: {
          base_price_snapshot?: number | null;
          catalog_item_id?: string | null;
          category?: string;
          created_at?: string;
          decision_status?: Database['public']['Enums']['selection_decision'];
          id?: string;
          item_name?: string | null;
          request_id?: string;
          selected_options?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'selection_snapshots_catalog_item_id_fkey';
            columns: ['catalog_item_id'];
            isOneToOne: false;
            referencedRelation: 'catalog_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'selection_snapshots_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'remodel_requests';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      adjust_customer_request_quote: {
        Args: { target_amount: number; target_request_id: string };
        Returns: undefined;
      };
      assign_remodel_request_partner: {
        Args: { target_partner_id: string; target_request_id: string };
        Returns: string;
      };
      confirm_adjusted_request_quote: {
        Args: { target_request_id: string };
        Returns: undefined;
      };
      confirm_final_quote: {
        Args: { target_quote_id: string };
        Returns: undefined;
      };
      get_partner_assigned_remodel_request: {
        Args: { target_request_id: string };
        Returns: {
          address_detail: string;
          adjusted_at: string | null;
          adjusted_by: string | null;
          adjusted_estimate_amount: number | null;
          adjustment_confirmed_at: string | null;
          assignment_id: string;
          assignment_status: Database['public']['Enums']['assignment_status'];
          bathroom_type: string;
          budget_range: string;
          created_at: string;
          customer_id: string;
          customer_name: string;
          demolition_cost_snapshot_manwon: number | null;
          desired_schedule: string;
          estimated_size: string | null;
          has_bathtub: boolean | null;
          housing_type: string;
          id: string;
          notes: string;
          priorities: string[];
          region: string;
          request_status: Database['public']['Enums']['remodel_request_status'];
          requires_demolition: boolean | null;
          scope: Database['public']['Enums']['remodel_scope'];
          selection_rows: Json;
          special_structure_note: string | null;
          submitted_at: string | null;
          updated_at: string;
        }[];
      };
      list_partner_assigned_remodel_requests: {
        Args: Record<PropertyKey, never>;
        Returns: {
          address_detail: string;
          assignment_id: string;
          assignment_status: Database['public']['Enums']['assignment_status'];
          budget_range: string;
          created_at: string;
          customer_name: string;
          desired_schedule: string;
          region: string;
          request_id: string;
          request_status: Database['public']['Enums']['remodel_request_status'];
          submitted_at: string | null;
        }[];
      };
      create_partner_with_representative: {
        Args: {
          p_business_number: string;
          p_business_registration_image_path: string;
          p_company_name: string;
          p_contact_name: string;
          p_contact_phone: string;
          p_login_email: string;
          p_note: string;
          p_target_user_id: string;
        };
        Returns: {
          approval_status: Database['public']['Enums']['partner_approval_status'];
          business_number: string;
          business_number_normalized: string | null;
          business_registration_image_path: string | null;
          company_name: string;
          contact_name: string;
          contact_phone: string;
          created_at: string;
          id: string;
          note: string | null;
          service_regions: string[];
          service_types: string[];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'partners';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      complete_remodel_request: {
        Args: { target_request_id: string };
        Returns: Database['public']['Enums']['remodel_request_status'];
      };
      mark_quote_final: {
        Args: { target_quote_id: string };
        Returns: undefined;
      };
      respond_to_partner_request: {
        Args: { target_action: string; target_request_id: string };
        Returns: Database['public']['Enums']['assignment_status'];
      };
      submit_customer_remodel_request: {
        Args: {
          target_address_detail: string;
          target_budget_range: string;
          target_desired_construction_date: string;
          target_notes: string;
          target_region: string;
          target_requires_demolition: boolean;
          target_selections: Json;
        };
        Returns: string;
      };
      update_remodel_request_schedule: {
        Args: { target_date: string; target_request_id: string };
        Returns: undefined;
      };
      update_demolition_cost_setting: {
        Args: { target_amount_manwon: number };
        Returns: undefined;
      };
      update_quote_option_master: {
        Args: {
          target_display_order: number;
          target_form_type: Database['public']['Enums']['quote_option_form_type'];
          target_name: string;
          target_option_id: string;
          target_products: Json;
        };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: 'customer' | 'partner_staff' | 'admin';
      assignment_status: 'assigned' | 'accepted' | 'declined';
      message_type:
        | 'message'
        | 'question'
        | 'change_request'
        | 'quote_sent'
        | 'quote_confirmed'
        | 'system';
      partner_approval_status: 'pending' | 'approved' | 'inactive';
      partner_member_status: 'invited' | 'active' | 'inactive';
      profile_status: 'active' | 'invited' | 'suspended' | 'deleted';
      quote_option_form_type: 'simple' | 'advanced';
      quote_status: 'draft' | 'sent' | 'final' | 'confirmed';
      remodel_request_status:
        | 'draft'
        | 'submitted'
        | 'quote_adjustment'
        | 'matched'
        | 'in_consultation'
        | 'final_quote_sent'
        | 'confirmed'
        | 'closed'
        | 'cancelled';
      remodel_scope: 'partial' | 'full';
      selection_decision: 'not_selected' | 'consultation_required' | 'selected';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ['customer', 'partner_staff', 'admin'],
      assignment_status: ['assigned', 'accepted', 'declined'],
      message_type: [
        'message',
        'question',
        'change_request',
        'quote_sent',
        'quote_confirmed',
        'system',
      ],
      partner_approval_status: ['pending', 'approved', 'inactive'],
      partner_member_status: ['invited', 'active', 'inactive'],
      profile_status: ['active', 'invited', 'suspended', 'deleted'],
      quote_option_form_type: ['simple', 'advanced'],
      quote_status: ['draft', 'sent', 'final', 'confirmed'],
      remodel_request_status: [
        'draft',
        'submitted',
        'quote_adjustment',
        'matched',
        'in_consultation',
        'final_quote_sent',
        'confirmed',
        'closed',
        'cancelled',
      ],
      remodel_scope: ['partial', 'full'],
      selection_decision: ['not_selected', 'consultation_required', 'selected'],
    },
  },
} as const;
