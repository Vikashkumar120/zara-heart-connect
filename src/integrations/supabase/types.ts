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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      zara_channels: {
        Row: {
          channel_id: number
          channel_title: string | null
          created_at: string
          id: string
          is_active: boolean | null
        }
        Insert: {
          channel_id: number
          channel_title?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
        }
        Update: {
          channel_id?: number
          channel_title?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      zara_game_scores: {
        Row: {
          chat_id: number
          created_at: string
          first_name: string
          game_type: string
          id: string
          points: number
          telegram_user_id: number
        }
        Insert: {
          chat_id: number
          created_at?: string
          first_name?: string
          game_type: string
          id?: string
          points?: number
          telegram_user_id: number
        }
        Update: {
          chat_id?: number
          created_at?: string
          first_name?: string
          game_type?: string
          id?: string
          points?: number
          telegram_user_id?: number
        }
        Relationships: []
      }
      zara_group_chats: {
        Row: {
          chat_id: number
          chat_title: string
          created_at: string
          id: string
          is_active: boolean
        }
        Insert: {
          chat_id: number
          chat_title?: string
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Update: {
          chat_id?: number
          chat_title?: string
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      zara_mod_config: {
        Row: {
          blacklisted_words: string[]
          bot_token: string
          chat_id: number
          created_at: string
          id: string
          strictness: string
          updated_at: string
          whitelisted_words: string[]
        }
        Insert: {
          blacklisted_words?: string[]
          bot_token?: string
          chat_id: number
          created_at?: string
          id?: string
          strictness?: string
          updated_at?: string
          whitelisted_words?: string[]
        }
        Update: {
          blacklisted_words?: string[]
          bot_token?: string
          chat_id?: number
          created_at?: string
          id?: string
          strictness?: string
          updated_at?: string
          whitelisted_words?: string[]
        }
        Relationships: []
      }
      zara_mod_events: {
        Row: {
          bot_token: string | null
          chat_id: number
          created_at: string
          event_type: string
          first_name: string | null
          id: string
          message_text: string | null
          reason: string | null
          telegram_user_id: number
        }
        Insert: {
          bot_token?: string | null
          chat_id: number
          created_at?: string
          event_type: string
          first_name?: string | null
          id?: string
          message_text?: string | null
          reason?: string | null
          telegram_user_id: number
        }
        Update: {
          bot_token?: string | null
          chat_id?: number
          created_at?: string
          event_type?: string
          first_name?: string | null
          id?: string
          message_text?: string | null
          reason?: string | null
          telegram_user_id?: number
        }
        Relationships: []
      }
      zara_mod_warnings: {
        Row: {
          ban_count: number
          bot_token: string | null
          chat_id: number
          created_at: string
          first_name: string | null
          id: string
          last_reason: string | null
          last_warned_at: string | null
          mute_count: number
          telegram_user_id: number
          updated_at: string
          warning_count: number
        }
        Insert: {
          ban_count?: number
          bot_token?: string | null
          chat_id: number
          created_at?: string
          first_name?: string | null
          id?: string
          last_reason?: string | null
          last_warned_at?: string | null
          mute_count?: number
          telegram_user_id: number
          updated_at?: string
          warning_count?: number
        }
        Update: {
          ban_count?: number
          bot_token?: string | null
          chat_id?: number
          created_at?: string
          first_name?: string | null
          id?: string
          last_reason?: string | null
          last_warned_at?: string | null
          mute_count?: number
          telegram_user_id?: number
          updated_at?: string
          warning_count?: number
        }
        Relationships: []
      }
      zara_msg_buffer: {
        Row: {
          bot_token: string | null
          chat_id: number
          created_at: string
          id: string
          telegram_user_id: number
        }
        Insert: {
          bot_token?: string | null
          chat_id: number
          created_at?: string
          id?: string
          telegram_user_id: number
        }
        Update: {
          bot_token?: string | null
          chat_id?: number
          created_at?: string
          id?: string
          telegram_user_id?: number
        }
        Relationships: []
      }
      zara_user_bots: {
        Row: {
          bot_display_name: string | null
          bot_token: string
          bot_username: string | null
          created_at: string
          id: string
          is_active: boolean
          owner_first_name: string | null
          owner_telegram_user_id: number
          updated_at: string
        }
        Insert: {
          bot_display_name?: string | null
          bot_token: string
          bot_username?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          owner_first_name?: string | null
          owner_telegram_user_id: number
          updated_at?: string
        }
        Update: {
          bot_display_name?: string | null
          bot_token?: string
          bot_username?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          owner_first_name?: string | null
          owner_telegram_user_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      zara_user_modes: {
        Row: {
          id: string
          mode: string
          telegram_user_id: number
          text_only: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          mode?: string
          telegram_user_id: number
          text_only?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          mode?: string
          telegram_user_id?: number
          text_only?: boolean
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
