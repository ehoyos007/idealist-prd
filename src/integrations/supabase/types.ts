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
      activity_log: {
        Row: {
          actor_id: string | null
          client_id: string | null
          created_at: string
          id: string
          message: string
          metadata: Json | null
          type: Database["public"]["Enums"]["activity_type"]
        }
        Insert: {
          actor_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          type: Database["public"]["Enums"]["activity_type"]
        }
        Update: {
          actor_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          type?: Database["public"]["Enums"]["activity_type"]
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_snapshots: {
        Row: {
          client_id: string
          created_at: string
          id: string
          metrics: Json
          snapshot_date: string
          source: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          metrics?: Json
          snapshot_date: string
          source?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          metrics?: Json
          snapshot_date?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_snapshots_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_slots: {
        Row: {
          created_at: string
          end_time: string
          id: string
          is_booked: boolean
          start_time: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          is_booked?: boolean
          start_time: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          is_booked?: boolean
          start_time?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          client_id: string | null
          created_at: string
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          message: string | null
          service_interest: string | null
          slot_id: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          message?: string | null
          service_interest?: string | null
          slot_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          message?: string | null
          service_interest?: string | null
          slot_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "availability_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      case_studies: {
        Row: {
          client_name: string
          content: Json
          created_at: string
          created_by: string | null
          id: string
          industry: string | null
          is_featured: boolean
          is_published: boolean
          location: string | null
          services: string[] | null
          slug: string
          updated_at: string
        }
        Insert: {
          client_name: string
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          industry?: string | null
          is_featured?: boolean
          is_published?: boolean
          location?: string | null
          services?: string[] | null
          slug: string
          updated_at?: string
        }
        Update: {
          client_name?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          industry?: string | null
          is_featured?: boolean
          is_published?: boolean
          location?: string | null
          services?: string[] | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_studies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          business_email: string | null
          business_name: string | null
          business_phone: string | null
          business_url: string | null
          created_at: string
          id: string
          industry: string | null
          location: string | null
          notes: string | null
          onboarding_completed: boolean
          onboarding_data: Json | null
          stripe_customer_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          business_email?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_url?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          location?: string | null
          notes?: string | null
          onboarding_completed?: boolean
          onboarding_data?: Json | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          business_email?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_url?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          location?: string | null
          notes?: string | null
          onboarding_completed?: boolean
          onboarding_data?: Json | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coop_file_registry: {
        Row: {
          action: string
          dev_name: string
          file_path: string
          id: number
          project_id: string
          started_at: string
        }
        Insert: {
          action?: string
          dev_name: string
          file_path: string
          id?: number
          project_id: string
          started_at?: string
        }
        Update: {
          action?: string
          dev_name?: string
          file_path?: string
          id?: number
          project_id?: string
          started_at?: string
        }
        Relationships: []
      }
      coop_history: {
        Row: {
          created_at: string
          dev_name: string
          files_changed: string[] | null
          id: number
          project_id: string
          session_date: string
          session_id: string | null
          summary: string
          tasks_completed: number[] | null
        }
        Insert: {
          created_at?: string
          dev_name: string
          files_changed?: string[] | null
          id?: number
          project_id: string
          session_date?: string
          session_id?: string | null
          summary: string
          tasks_completed?: number[] | null
        }
        Update: {
          created_at?: string
          dev_name?: string
          files_changed?: string[] | null
          id?: number
          project_id?: string
          session_date?: string
          session_id?: string | null
          summary?: string
          tasks_completed?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "coop_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coop_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coop_sessions: {
        Row: {
          current_focus: string | null
          dev_name: string
          files_touched: string[] | null
          id: string
          last_heartbeat: string
          project_id: string
          session_summary: string | null
          started_at: string
          status: string
          worktree_branch: string | null
        }
        Insert: {
          current_focus?: string | null
          dev_name: string
          files_touched?: string[] | null
          id?: string
          last_heartbeat?: string
          project_id: string
          session_summary?: string | null
          started_at?: string
          status?: string
          worktree_branch?: string | null
        }
        Update: {
          current_focus?: string | null
          dev_name?: string
          files_touched?: string[] | null
          id?: string
          last_heartbeat?: string
          project_id?: string
          session_summary?: string | null
          started_at?: string
          status?: string
          worktree_branch?: string | null
        }
        Relationships: []
      }
      coop_tasks: {
        Row: {
          completed_at: string | null
          completion_summary: string | null
          created_at: string
          created_by: string
          description: string | null
          id: number
          owner: string | null
          priority: string
          project_id: string
          status: string
          title: string
        }
        Insert: {
          completed_at?: string | null
          completion_summary?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: number
          owner?: string | null
          priority?: string
          project_id: string
          status?: string
          title: string
        }
        Update: {
          completed_at?: string | null
          completion_summary?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: number
          owner?: string | null
          priority?: string
          project_id?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      coop_vault: {
        Row: {
          claimed: boolean
          created_at: string
          encrypted_payload: string
          expires_at: string
          id: string
          iv: string
          key_names: string[] | null
          nonce: string
          project_id: string
          recipient: string
          sender: string
          sender_session_id: string | null
          session_scoped: boolean
        }
        Insert: {
          claimed?: boolean
          created_at?: string
          encrypted_payload: string
          expires_at: string
          id?: string
          iv: string
          key_names?: string[] | null
          nonce: string
          project_id: string
          recipient: string
          sender: string
          sender_session_id?: string | null
          session_scoped?: boolean
        }
        Update: {
          claimed?: boolean
          created_at?: string
          encrypted_payload?: string
          expires_at?: string
          id?: string
          iv?: string
          key_names?: string[] | null
          nonce?: string
          project_id?: string
          recipient?: string
          sender?: string
          sender_session_id?: string | null
          session_scoped?: boolean
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount_cents: number
          client_id: string
          created_at: string
          id: string
          metadata: Json | null
          service_id: string
          status: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          client_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          service_id: string
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          client_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          service_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      prd_document_chunks: {
        Row: {
          chunk_index: number
          chunk_text: string
          created_at: string
          embedding: string | null
          file_name: string
          file_type: string | null
          id: string
          keywords: string[] | null
          project_id: string | null
          session_id: string
        }
        Insert: {
          chunk_index: number
          chunk_text: string
          created_at?: string
          embedding?: string | null
          file_name: string
          file_type?: string | null
          id?: string
          keywords?: string[] | null
          project_id?: string | null
          session_id: string
        }
        Update: {
          chunk_index?: number
          chunk_text?: string
          created_at?: string
          embedding?: string | null
          file_name?: string
          file_type?: string | null
          id?: string
          keywords?: string[] | null
          project_id?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prd_document_chunks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "prd_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      prd_project_documents: {
        Row: {
          chunk_count: number | null
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          project_id: string
        }
        Insert: {
          chunk_count?: number | null
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          project_id: string
        }
        Update: {
          chunk_count?: number | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prd_project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "prd_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      prd_projects: {
        Row: {
          architecture: string | null
          core_features: string | null
          created_at: string
          first_sprint_plan: string | null
          id: string
          problem_statement: string | null
          project_name: string
          risks_and_open_questions: string | null
          score_complexity: number | null
          score_confidence: number | null
          score_impact: number | null
          score_urgency: number | null
          success_metrics: string | null
          tagline: string | null
          tags: string[] | null
          target_user: string | null
          tech_stack: string | null
          transcript: string | null
          updated_at: string
          user_stories: Json | null
          vision: string | null
        }
        Insert: {
          architecture?: string | null
          core_features?: string | null
          created_at?: string
          first_sprint_plan?: string | null
          id?: string
          problem_statement?: string | null
          project_name: string
          risks_and_open_questions?: string | null
          score_complexity?: number | null
          score_confidence?: number | null
          score_impact?: number | null
          score_urgency?: number | null
          success_metrics?: string | null
          tagline?: string | null
          tags?: string[] | null
          target_user?: string | null
          tech_stack?: string | null
          transcript?: string | null
          updated_at?: string
          user_stories?: Json | null
          vision?: string | null
        }
        Update: {
          architecture?: string | null
          core_features?: string | null
          created_at?: string
          first_sprint_plan?: string | null
          id?: string
          problem_statement?: string | null
          project_name?: string
          risks_and_open_questions?: string | null
          score_complexity?: number | null
          score_confidence?: number | null
          score_impact?: number | null
          score_urgency?: number | null
          success_metrics?: string | null
          tagline?: string | null
          tags?: string[] | null
          target_user?: string | null
          tech_stack?: string | null
          transcript?: string | null
          updated_at?: string
          user_stories?: Json | null
          vision?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      project_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          project_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["milestone_status"]
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          project_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["milestone_status"]
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          project_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["milestone_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          estimated_completion: string | null
          id: string
          name: string
          started_at: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_completion?: string | null
          id?: string
          name: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_completion?: string | null
          id?: string
          name?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          display_order: number | null
          features: Json | null
          id: string
          is_active: boolean
          monthly_price_cents: number | null
          name: string
          setup_price_cents: number | null
          slug: string
          stripe_monthly_price_id: string | null
          stripe_setup_price_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean
          monthly_price_cents?: number | null
          name: string
          setup_price_cents?: number | null
          slug: string
          stripe_monthly_price_id?: string | null
          stripe_setup_price_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean
          monthly_price_cents?: number | null
          name?: string
          setup_price_cents?: number | null
          slug?: string
          stripe_monthly_price_id?: string | null
          stripe_setup_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          client_slug: string
          created_at: string | null
          form_data: Json
          id: string
          metadata: Json | null
          notes: string | null
          status: string | null
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          client_slug: string
          created_at?: string | null
          form_data: Json
          id?: string
          metadata?: Json | null
          notes?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          client_slug?: string
          created_at?: string | null
          form_data?: Json
          id?: string
          metadata?: Json | null
          notes?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          client_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          service_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          client_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          service_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          client_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          service_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      coop_cleanup_stale_sessions: { Args: never; Returns: Json }
      get_client_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      match_document_chunks: {
        Args: {
          match_count?: number
          match_session_id: string
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chunk_index: number
          chunk_text: string
          file_name: string
          id: string
          keywords: string[]
          similarity: number
        }[]
      }
    }
    Enums: {
      activity_type:
        | "signup"
        | "purchase"
        | "payment"
        | "project_update"
        | "milestone"
        | "booking"
        | "service_change"
        | "note"
        | "system"
      booking_status: "confirmed" | "cancelled" | "completed" | "no_show"
      milestone_status: "pending" | "in_progress" | "completed" | "skipped"
      order_status: "pending" | "paid" | "failed" | "refunded" | "cancelled"
      project_status:
        | "onboarding"
        | "in_progress"
        | "review"
        | "completed"
        | "on_hold"
      subscription_status: "active" | "past_due" | "cancelled" | "paused"
      user_role: "admin" | "client"
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
      activity_type: [
        "signup",
        "purchase",
        "payment",
        "project_update",
        "milestone",
        "booking",
        "service_change",
        "note",
        "system",
      ],
      booking_status: ["confirmed", "cancelled", "completed", "no_show"],
      milestone_status: ["pending", "in_progress", "completed", "skipped"],
      order_status: ["pending", "paid", "failed", "refunded", "cancelled"],
      project_status: [
        "onboarding",
        "in_progress",
        "review",
        "completed",
        "on_hold",
      ],
      subscription_status: ["active", "past_due", "cancelled", "paused"],
      user_role: ["admin", "client"],
    },
  },
} as const
