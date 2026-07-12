export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      mp_payments: {
        Row: {
          amount_cents: number
          created_at: string
          environment: string
          id: string
          mp_payment_id: string | null
          mp_preapproval_id: string | null
          net_team_cents: number
          paid_at: string | null
          payment_method: string | null
          platform_fee_cents: number
          raw: Json | null
          status: string
          subscription_id: string | null
          team_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          environment?: string
          id?: string
          mp_payment_id?: string | null
          mp_preapproval_id?: string | null
          net_team_cents?: number
          paid_at?: string | null
          payment_method?: string | null
          platform_fee_cents?: number
          raw?: Json | null
          status: string
          subscription_id?: string | null
          team_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          environment?: string
          id?: string
          mp_payment_id?: string | null
          mp_preapproval_id?: string | null
          net_team_cents?: number
          paid_at?: string | null
          payment_method?: string | null
          platform_fee_cents?: number
          raw?: Json | null
          status?: string
          subscription_id?: string | null
          team_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      partners: {
        Row: {
          address: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          discount: string
          icon: string
          id: string
          is_active: boolean
          name: string
          products: string | null
          team_id: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount: string
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          products?: string | null
          team_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          products?: string | null
          team_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          amount_cents: number
          created_at: string
          environment: string
          id: string
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          pix_key: string
          pix_key_type: string
          proof_url: string | null
          requested_at: string
          requested_by: string
          status: string
          team_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          environment?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          pix_key: string
          pix_key_type: string
          proof_url?: string | null
          requested_at?: string
          requested_by: string
          status?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          environment?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          pix_key?: string
          pix_key_type?: string
          proof_url?: string | null
          requested_at?: string
          requested_by?: string
          status?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount_cents: number
          arrival_date: string | null
          created_at: string
          currency: string
          environment: string
          id: string
          raw: Json | null
          status: string
          stripe_account_id: string | null
          stripe_payout_id: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          arrival_date?: string | null
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          raw?: Json | null
          status: string
          stripe_account_id?: string | null
          stripe_payout_id?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          arrival_date?: string | null
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          raw?: Json | null
          status?: string
          stripe_account_id?: string | null
          stripe_payout_id?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          age: number
          availability: Json
          avatar_url: string
          bio: string | null
          city: string
          created_at: string
          display_name: string
          dominant_foot: Database["public"]["Enums"]["dominant_foot"]
          gallery_urls: string[]
          goals_season: number
          height_cm: number
          is_published: boolean
          position: Database["public"]["Enums"]["player_position"]
          previous_clubs: string[]
          state: string
          updated_at: string
          user_id: string
          video_url: string | null
          whatsapp_e164: string
        }
        Insert: {
          age: number
          availability?: Json
          avatar_url: string
          bio?: string | null
          city: string
          created_at?: string
          display_name: string
          dominant_foot: Database["public"]["Enums"]["dominant_foot"]
          gallery_urls?: string[]
          goals_season?: number
          height_cm: number
          is_published?: boolean
          position: Database["public"]["Enums"]["player_position"]
          previous_clubs?: string[]
          state: string
          updated_at?: string
          user_id: string
          video_url?: string | null
          whatsapp_e164: string
        }
        Update: {
          age?: number
          availability?: Json
          avatar_url?: string
          bio?: string | null
          city?: string
          created_at?: string
          display_name?: string
          dominant_foot?: Database["public"]["Enums"]["dominant_foot"]
          gallery_urls?: string[]
          goals_season?: number
          height_cm?: number
          is_published?: boolean
          position?: Database["public"]["Enums"]["player_position"]
          previous_clubs?: string[]
          state?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
          whatsapp_e164?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          favorite_team_id: string | null
          id: string
          instagram: string | null
          tiktok: string | null
          twitter: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          favorite_team_id?: string | null
          id: string
          instagram?: string | null
          tiktok?: string | null
          twitter?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          favorite_team_id?: string | null
          id?: string
          instagram?: string | null
          tiktok?: string | null
          twitter?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          team_id: string | null
          unit_amount: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          team_id?: string | null
          unit_amount?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          team_id?: string | null
          unit_amount?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      team_directors: {
        Row: {
          created_at: string
          id: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_directors_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          charges_enabled: boolean
          city: string | null
          colors: string | null
          created_at: string
          crest_url: string | null
          details_submitted: boolean
          founded: number | null
          id: string
          is_active: boolean
          monthly_price: number | null
          mp_access_token: string | null
          mp_connected_at: string | null
          mp_public_key: string | null
          mp_refresh_token: string | null
          mp_token_expires_at: string | null
          mp_user_id: string | null
          name: string
          neighborhood: string | null
          nickname: string | null
          onboarding_status: string
          payout_enabled: boolean
          pix_key: string | null
          pix_key_type: string | null
          platform_fee_percent: number
          story: string | null
          stripe_account_id: string | null
          updated_at: string
        }
        Insert: {
          charges_enabled?: boolean
          city?: string | null
          colors?: string | null
          created_at?: string
          crest_url?: string | null
          details_submitted?: boolean
          founded?: number | null
          id: string
          is_active?: boolean
          monthly_price?: number | null
          mp_access_token?: string | null
          mp_connected_at?: string | null
          mp_public_key?: string | null
          mp_refresh_token?: string | null
          mp_token_expires_at?: string | null
          mp_user_id?: string | null
          name: string
          neighborhood?: string | null
          nickname?: string | null
          onboarding_status?: string
          payout_enabled?: boolean
          pix_key?: string | null
          pix_key_type?: string | null
          platform_fee_percent?: number
          story?: string | null
          stripe_account_id?: string | null
          updated_at?: string
        }
        Update: {
          charges_enabled?: boolean
          city?: string | null
          colors?: string | null
          created_at?: string
          crest_url?: string | null
          details_submitted?: boolean
          founded?: number | null
          id?: string
          is_active?: boolean
          monthly_price?: number | null
          mp_access_token?: string | null
          mp_connected_at?: string | null
          mp_public_key?: string | null
          mp_refresh_token?: string | null
          mp_token_expires_at?: string | null
          mp_user_id?: string | null
          name?: string
          neighborhood?: string | null
          nickname?: string | null
          onboarding_status?: string
          payout_enabled?: boolean
          pix_key?: string | null
          pix_key_type?: string | null
          platform_fee_percent?: number
          story?: string | null
          stripe_account_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_global_top_supporters: {
        Args: { check_env?: string; lim?: number }
        Returns: {
          avatar_url: string
          display_name: string
          monthly_cents: number
          rank: number
          team_count: number
          user_id: string
        }[]
      }
      get_team_top_supporters: {
        Args: { check_env?: string; lim?: number; team_id_in: string }
        Returns: {
          avatar_url: string
          display_name: string
          monthly_cents: number
          rank: number
          user_id: string
        }[]
      }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_team_director: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "director" | "user"
      dominant_foot: "direito" | "esquerdo" | "ambidestro"
      player_position:
        | "goleiro"
        | "zagueiro"
        | "lateral"
        | "volante"
        | "meia"
        | "atacante"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "director", "user"],
      dominant_foot: ["direito", "esquerdo", "ambidestro"],
      player_position: [
        "goleiro",
        "zagueiro",
        "lateral",
        "volante",
        "meia",
        "atacante",
      ],
    },
  },
} as const
