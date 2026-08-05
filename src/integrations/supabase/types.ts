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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      listing_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          listing_id: string
          sort_order: number
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          listing_id: string
          sort_order?: number
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_photos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          category: Database["public"]["Enums"]["listing_category"]
          condition: Database["public"]["Enums"]["listing_condition"]
          created_at: string
          description: string
          estimated_value: number
          id: string
          is_available: boolean
          is_flagged: boolean
          latitude: number | null
          location: string | null
          longitude: number | null
          offer_type: Database["public"]["Enums"]["offer_type"]
          owner_id: string
          quantity: string | null
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at: string
          wanted_in_return: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["listing_category"]
          condition?: Database["public"]["Enums"]["listing_condition"]
          created_at?: string
          description?: string
          estimated_value?: number
          id?: string
          is_available?: boolean
          is_flagged?: boolean
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          offer_type?: Database["public"]["Enums"]["offer_type"]
          owner_id: string
          quantity?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at?: string
          wanted_in_return?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["listing_category"]
          condition?: Database["public"]["Enums"]["listing_condition"]
          created_at?: string
          description?: string
          estimated_value?: number
          id?: string
          is_available?: boolean
          is_flagged?: boolean
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          offer_type?: Database["public"]["Enums"]["offer_type"]
          owner_id?: string
          quantity?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          updated_at?: string
          wanted_in_return?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          proposal_id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          proposal_id: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          proposal_id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "trade_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          emergency_mode: boolean
          handle: string
          id: string
          is_suspended: boolean
          is_verified: boolean
          latitude: number | null
          location: string | null
          longitude: number | null
          rating_avg: number
          rating_count: number
          trades_completed: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          emergency_mode?: boolean
          handle: string
          id?: string
          is_suspended?: boolean
          is_verified?: boolean
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          rating_avg?: number
          rating_count?: number
          trades_completed?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          emergency_mode?: boolean
          handle?: string
          id?: string
          is_suspended?: boolean
          is_verified?: boolean
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          rating_avg?: number
          rating_count?: number
          trades_completed?: number
          updated_at?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          proposal_id: string | null
          ratee_id: string
          rater_id: string
          stars: number
          was_reliable: boolean
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          proposal_id?: string | null
          ratee_id: string
          rater_id: string
          stars: number
          was_reliable?: boolean
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          proposal_id?: string | null
          ratee_id?: string
          rater_id?: string
          stars?: number
          was_reliable?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ratings_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "trade_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_ratee_id_fkey"
            columns: ["ratee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          listing_id: string | null
          reason: string
          reported_user_id: string | null
          reporter_id: string | null
          resolution_note: string | null
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string | null
          reason: string
          reported_user_id?: string | null
          reporter_id?: string | null
          resolution_note?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string | null
          reason?: string
          reported_user_id?: string | null
          reporter_id?: string | null
          resolution_note?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_matches: {
        Row: {
          created_at: string
          dismissed: boolean
          id: string
          my_listing_id: string | null
          reasoning: string | null
          score: number
          their_listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dismissed?: boolean
          id?: string
          my_listing_id?: string | null
          reasoning?: string | null
          score?: number
          their_listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          dismissed?: boolean
          id?: string
          my_listing_id?: string | null
          reasoning?: string | null
          score?: number
          their_listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_matches_my_listing_id_fkey"
            columns: ["my_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_matches_their_listing_id_fkey"
            columns: ["their_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_matches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_proposals: {
        Row: {
          created_at: string
          id: string
          message: string | null
          offer_summary: string | null
          offered_listing_id: string | null
          parent_proposal_id: string | null
          proposer_id: string
          recipient_id: string
          requested_listing_id: string
          status: Database["public"]["Enums"]["proposal_status"]
          updated_at: string
          value_adjustment: number
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          offer_summary?: string | null
          offered_listing_id?: string | null
          parent_proposal_id?: string | null
          proposer_id: string
          recipient_id: string
          requested_listing_id: string
          status?: Database["public"]["Enums"]["proposal_status"]
          updated_at?: string
          value_adjustment?: number
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          offer_summary?: string | null
          offered_listing_id?: string | null
          parent_proposal_id?: string | null
          proposer_id?: string
          recipient_id?: string
          requested_listing_id?: string
          status?: Database["public"]["Enums"]["proposal_status"]
          updated_at?: string
          value_adjustment?: number
        }
        Relationships: [
          {
            foreignKeyName: "trade_proposals_offered_listing_id_fkey"
            columns: ["offered_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_proposals_parent_proposal_id_fkey"
            columns: ["parent_proposal_id"]
            isOneToOne: false
            referencedRelation: "trade_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_proposals_proposer_id_fkey"
            columns: ["proposer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_proposals_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_proposals_requested_listing_id_fkey"
            columns: ["requested_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "member"
      listing_category:
        | "food"
        | "water"
        | "tools"
        | "equipment"
        | "skills"
        | "services"
        | "medical"
        | "shelter"
        | "energy"
        | "transport"
        | "clothing"
        | "other"
      listing_condition: "new" | "like_new" | "good" | "fair" | "worn" | "na"
      listing_status: "active" | "pending" | "traded" | "archived"
      offer_type: "offering" | "seeking" | "both"
      proposal_status:
        | "pending"
        | "countered"
        | "accepted"
        | "rejected"
        | "completed"
        | "cancelled"
      report_status: "open" | "reviewing" | "resolved" | "dismissed"
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
      app_role: ["admin", "moderator", "member"],
      listing_category: [
        "food",
        "water",
        "tools",
        "equipment",
        "skills",
        "services",
        "medical",
        "shelter",
        "energy",
        "transport",
        "clothing",
        "other",
      ],
      listing_condition: ["new", "like_new", "good", "fair", "worn", "na"],
      listing_status: ["active", "pending", "traded", "archived"],
      offer_type: ["offering", "seeking", "both"],
      proposal_status: [
        "pending",
        "countered",
        "accepted",
        "rejected",
        "completed",
        "cancelled",
      ],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
    },
  },
} as const
