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
      activity_log: {
        Row: {
          actor_id: string | null
          client_id: string
          created_at: string
          id: string
          message: string
          type: string
        }
        Insert: {
          actor_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          message: string
          type: string
        }
        Update: {
          actor_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          message?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_requests: {
        Row: {
          admin_id: string | null
          client_id: string
          created_at: string
          id: string
          message: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          message?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          message?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          activity_level: string | null
          age: number | null
          archived: boolean
          availability: Json
          avatar_url: string | null
          body_assessment: Json
          created_at: string
          date_of_birth: string | null
          email: string | null
          fitness_profile: Json
          full_name: string
          gender: string | null
          health: Json
          health_flagged: boolean
          height_cm: number | null
          hold_reason: string | null
          id: string
          last_activity_at: string | null
          measurement_system: string
          occupation: string | null
          status: string
          trainer_id: string | null
          training_setup: Json
          updated_at: string
          user_id: string | null
          weight_kg: number | null
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          archived?: boolean
          availability?: Json
          avatar_url?: string | null
          body_assessment?: Json
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          fitness_profile?: Json
          full_name: string
          gender?: string | null
          health?: Json
          health_flagged?: boolean
          height_cm?: number | null
          hold_reason?: string | null
          id?: string
          last_activity_at?: string | null
          measurement_system?: string
          occupation?: string | null
          status?: string
          trainer_id?: string | null
          training_setup?: Json
          updated_at?: string
          user_id?: string | null
          weight_kg?: number | null
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          archived?: boolean
          availability?: Json
          avatar_url?: string | null
          body_assessment?: Json
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          fitness_profile?: Json
          full_name?: string
          gender?: string | null
          health?: Json
          health_flagged?: boolean
          height_cm?: number | null
          hold_reason?: string | null
          id?: string
          last_activity_at?: string | null
          measurement_system?: string
          occupation?: string | null
          status?: string
          trainer_id?: string | null
          training_setup?: Json
          updated_at?: string
          user_id?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      exercise_completions: {
        Row: {
          client_id: string
          completed: boolean
          completed_at: string
          exercise_key: string
          exercise_name: string
          id: string
          performance: Json
          session_id: string
        }
        Insert: {
          client_id: string
          completed?: boolean
          completed_at?: string
          exercise_key: string
          exercise_name: string
          id?: string
          performance?: Json
          session_id: string
        }
        Update: {
          client_id?: string
          completed?: boolean
          completed_at?: string
          exercise_key?: string
          exercise_name?: string
          id?: string
          performance?: Json
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_completions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_completions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          recipient_id: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          recipient_id: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          recipient_id?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      plan_versions: {
        Row: {
          content: Json
          created_at: string
          id: string
          plan_id: string
          status: string
          title: string
          trainer_notes: string | null
          version: number
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          plan_id: string
          status: string
          title: string
          trainer_notes?: string | null
          version: number
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          plan_id?: string
          status?: string
          title?: string
          trainer_notes?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_versions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_entries: {
        Row: {
          body_fat_pct: number | null
          client_id: string
          created_at: string
          id: string
          measurements: Json
          note: string | null
          recorded_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          body_fat_pct?: number | null
          client_id: string
          created_at?: string
          id?: string
          measurements?: Json
          note?: string | null
          recorded_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          body_fat_pct?: number | null
          client_id?: string
          created_at?: string
          id?: string
          measurements?: Json
          note?: string | null
          recorded_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_profiles: {
        Row: {
          accepted_disclaimer: boolean
          avatar_url: string | null
          business_name: string | null
          certification_name: string | null
          certification_number: string | null
          created_at: string
          full_name: string
          id: string
          measurement_system: string
          onboarded: boolean
          training_style: string | null
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          accepted_disclaimer?: boolean
          avatar_url?: string | null
          business_name?: string | null
          certification_name?: string | null
          certification_number?: string | null
          created_at?: string
          full_name?: string
          id?: string
          measurement_system?: string
          onboarded?: boolean
          training_style?: string | null
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          accepted_disclaimer?: boolean
          avatar_url?: string | null
          business_name?: string | null
          certification_name?: string | null
          certification_number?: string | null
          created_at?: string
          full_name?: string
          id?: string
          measurement_system?: string
          onboarded?: boolean
          training_style?: string | null
          updated_at?: string
          user_id?: string
          years_experience?: number | null
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
      workout_plans: {
        Row: {
          approved: boolean
          archived: boolean
          client_id: string
          content: Json
          created_at: string
          created_by: string | null
          current_phase: number
          end_date: string | null
          goal: string | null
          id: string
          published_at: string | null
          start_date: string | null
          status: string
          title: string
          trainer_id: string
          trainer_notes: string | null
          updated_at: string
          version: number
        }
        Insert: {
          approved?: boolean
          archived?: boolean
          client_id: string
          content?: Json
          created_at?: string
          created_by?: string | null
          current_phase?: number
          end_date?: string | null
          goal?: string | null
          id?: string
          published_at?: string | null
          start_date?: string | null
          status?: string
          title?: string
          trainer_id: string
          trainer_notes?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          approved?: boolean
          archived?: boolean
          client_id?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          current_phase?: number
          end_date?: string | null
          goal?: string | null
          id?: string
          published_at?: string | null
          start_date?: string | null
          status?: string
          title?: string
          trainer_id?: string
          trainer_notes?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "workout_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          day_index: number
          day_label: string
          focus: string
          id: string
          notes: string | null
          phase_index: number
          plan_id: string
          scheduled_date: string
          started_at: string | null
          status: string
          updated_at: string
          week_number: number
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          day_index?: number
          day_label?: string
          focus?: string
          id?: string
          notes?: string | null
          phase_index?: number
          plan_id: string
          scheduled_date: string
          started_at?: string | null
          status?: string
          updated_at?: string
          week_number?: number
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          day_index?: number
          day_label?: string
          focus?: string
          id?: string
          notes?: string | null
          phase_index?: number
          plan_id?: string
          scheduled_date?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_exists: { Args: never; Returns: boolean }
      claim_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      client_id_for_user: { Args: { _user_id: string }; Returns: string }
      client_is_active: { Args: { _client_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      log_activity: {
        Args: { _client_id: string; _message: string; _type: string }
        Returns: undefined
      }
      notify_admins: {
        Args: { _link: string; _message: string; _title: string; _type: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "client"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "client"],
    },
  },
} as const
