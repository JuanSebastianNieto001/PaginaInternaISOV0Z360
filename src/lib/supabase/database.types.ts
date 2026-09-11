/**
 * Tipos de la base de datos Supabase.
 *
 * Mantenidos manualmente en sincronía con `supabase/migrations/*.sql`.
 * Cuando dispongas de la CLI de Supabase conectada al proyecto puedes
 * regenerarlos con:
 *   npx supabase gen types typescript --project-id <ref> --schema public > src/lib/supabase/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type DocumentStatus = "draft" | "review" | "approved" | "obsolete";

type Timestamps = {
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      roles: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          level: number;
          is_system: boolean;
        } & Timestamps;
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          level?: number;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          level?: number;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      permissions: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          module: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          module: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          module?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          role_id: string;
          permission_id: string;
          created_at: string;
        };
        Insert: {
          role_id: string;
          permission_id: string;
          created_at?: string;
        };
        Update: {
          role_id?: string;
          permission_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey";
            columns: ["permission_id"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          role_id: string;
          is_active: boolean;
          must_change_password: boolean;
          last_sign_in_at: string | null;
        } & Timestamps;
        Insert: {
          id: string;
          email: string;
          full_name?: string;
          avatar_url?: string | null;
          role_id: string;
          is_active?: boolean;
          must_change_password?: boolean;
          last_sign_in_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string | null;
          role_id?: string;
          is_active?: boolean;
          must_change_password?: boolean;
          last_sign_in_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      standards: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          color: string | null;
          active: boolean;
          sort_order: number;
        } & Timestamps;
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          color?: string | null;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          color?: string | null;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          standard_id: string;
          code: string;
          name: string;
          description: string | null;
          active: boolean;
          sort_order: number;
        } & Timestamps;
        Insert: {
          id?: string;
          standard_id: string;
          code: string;
          name: string;
          description?: string | null;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          standard_id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_standard_id_fkey";
            columns: ["standard_id"];
            isOneToOne: false;
            referencedRelation: "standards";
            referencedColumns: ["id"];
          },
        ];
      };
      subcategories: {
        Row: {
          id: string;
          category_id: string;
          code: string;
          name: string;
          description: string | null;
          active: boolean;
          sort_order: number;
        } & Timestamps;
        Insert: {
          id?: string;
          category_id: string;
          code: string;
          name: string;
          description?: string | null;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      areas: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          active: boolean;
          sort_order: number;
        } & Timestamps;
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      document_types: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          active: boolean;
          sort_order: number;
        } & Timestamps;
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          standard_id: string;
          category_id: string;
          subcategory_id: string | null;
          document_type_id: string;
          area_id: string | null;
          status: DocumentStatus;
          version: string;
          file_path: string;
          file_name: string;
          file_extension: string;
          file_size: number;
          mime_type: string | null;
          approved_at: string | null;
          effective_date: string | null;
          review_date: string | null;
          created_by: string | null;
          updated_by: string | null;
          search_vector: unknown | null;
        } & Timestamps;
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          standard_id: string;
          category_id: string;
          subcategory_id?: string | null;
          document_type_id: string;
          area_id?: string | null;
          status?: DocumentStatus;
          version?: string;
          file_path: string;
          file_name: string;
          file_extension: string;
          file_size: number;
          mime_type?: string | null;
          approved_at?: string | null;
          effective_date?: string | null;
          review_date?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          standard_id?: string;
          category_id?: string;
          subcategory_id?: string | null;
          document_type_id?: string;
          area_id?: string | null;
          status?: DocumentStatus;
          version?: string;
          file_path?: string;
          file_name?: string;
          file_extension?: string;
          file_size?: number;
          mime_type?: string | null;
          approved_at?: string | null;
          effective_date?: string | null;
          review_date?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_standard_id_fkey";
            columns: ["standard_id"];
            isOneToOne: false;
            referencedRelation: "standards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_subcategory_id_fkey";
            columns: ["subcategory_id"];
            isOneToOne: false;
            referencedRelation: "subcategories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_document_type_id_fkey";
            columns: ["document_type_id"];
            isOneToOne: false;
            referencedRelation: "document_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      document_versions: {
        Row: {
          id: string;
          document_id: string;
          version: string;
          status: DocumentStatus;
          file_path: string;
          file_name: string;
          file_extension: string;
          file_size: number;
          mime_type: string | null;
          change_summary: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          version: string;
          status?: DocumentStatus;
          file_path: string;
          file_name: string;
          file_extension: string;
          file_size: number;
          mime_type?: string | null;
          change_summary?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          version?: string;
          status?: DocumentStatus;
          file_path?: string;
          file_name?: string;
          file_extension?: string;
          file_size?: number;
          mime_type?: string | null;
          change_summary?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_versions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tags: {
        Row: {
          id: string;
          name: string;
          slug: string;
          color: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          color?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          color?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tags_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      document_tags: {
        Row: {
          document_id: string;
          tag_id: string;
          created_at: string;
        };
        Insert: {
          document_id: string;
          tag_id: string;
          created_at?: string;
        };
        Update: {
          document_id?: string;
          tag_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "document_tags_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      favorites: {
        Row: {
          user_id: string;
          document_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          document_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          document_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favorites_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      recent_documents: {
        Row: {
          user_id: string;
          document_id: string;
          viewed_at: string;
          view_count: number;
        };
        Insert: {
          user_id: string;
          document_id: string;
          viewed_at?: string;
          view_count?: number;
        };
        Update: {
          user_id?: string;
          document_id?: string;
          viewed_at?: string;
          view_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "recent_documents_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recent_documents_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: number;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: never;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: never;
          user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      app_settings: {
        Row: {
          key: string;
          value: Json;
          description: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          description?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          description?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_role_code: { Args: Record<string, never>; Returns: string | null };
      is_super_admin: { Args: Record<string, never>; Returns: boolean };
      is_active_user: { Args: Record<string, never>; Returns: boolean };
      has_permission: { Args: { p_permission: string }; Returns: boolean };
      current_permissions: { Args: Record<string, never>; Returns: string[] };
      log_audit: {
        Args: {
          p_action: string;
          p_entity_type: string;
          p_entity_id?: string | null;
          p_metadata?: Json;
        };
        Returns: number;
      };
      touch_recent_document: { Args: { p_document_id: string }; Returns: undefined };
      touch_last_sign_in: { Args: Record<string, never>; Returns: undefined };
      get_dashboard_stats: { Args: Record<string, never>; Returns: Json };
      get_document_versions_list: { Args: Record<string, never>; Returns: string[] };
      get_taxonomy_counts: {
        Args: Record<string, never>;
        Returns: {
          standard_id: string;
          category_id: string;
          subcategory_id: string | null;
          total: number;
        }[];
      };
      get_area_counts: {
        Args: Record<string, never>;
        Returns: { area_id: string; total: number }[];
      };
      refresh_document_search_vector: { Args: { p_document_id: string }; Returns: undefined };
    };
    Enums: {
      document_status: DocumentStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

/* Helpers de acceso a tipos de tabla */
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
