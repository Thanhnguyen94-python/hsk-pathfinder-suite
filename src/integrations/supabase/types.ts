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
      assignment_submissions: {
        Row: {
          assignment_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_comment: string | null
          score: number | null
          student_id: string
          submission_id: string
          submission_text: string | null
          submission_url: string | null
          submitted_at: string
        }
        Insert: {
          assignment_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_comment?: string | null
          score?: number | null
          student_id: string
          submission_id?: string
          submission_text?: string | null
          submission_url?: string | null
          submitted_at?: string
        }
        Update: {
          assignment_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_comment?: string | null
          score?: number | null
          student_id?: string
          submission_id?: string
          submission_text?: string | null
          submission_url?: string | null
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["assignment_id"]
          },
        ]
      }
      assignments: {
        Row: {
          assignment_id: string
          course_id: string
          created_at: string
          created_by: string | null
          deadline: string
          description: string | null
          title: string
          slot_id: string | null
        }
        Insert: {
          assignment_id?: string
          course_id: string
          created_at?: string
          created_by?: string | null
          deadline: string
          description?: string | null
          title: string
          slot_id?: string | null
        }
        Update: {
          assignment_id?: string
          course_id?: string
          created_at?: string
          created_by?: string | null
          deadline?: string
          description?: string | null
          title?: string
          slot_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["slot_id"]
          }
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          log_id: string
          user_id: string | null
          user_specific_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          log_id?: string
          user_id?: string | null
          user_specific_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          log_id?: string
          user_id?: string | null
          user_specific_id?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          class_id: string
          created_at: string
          session_date: string
          session_end_date: string | null
          slot_id: string
          status: Database["public"]["Enums"]["booking_status"]
          student_id: string
          teacher_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          session_date: string
          session_end_date?: string | null
          slot_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          student_id: string
          teacher_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          session_date?: string
          session_end_date?: string | null
          slot_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          student_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "bookings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["specific_id"]
          },
          {
            foreignKeyName: "bookings_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["specific_id"]
          },
        ]
      }
      class_enrollments: {
        Row: {
          class_id: string
          enrolled_at: string
          student_id: string
        }
        Insert: {
          class_id: string
          enrolled_at?: string
          student_id: string
        }
        Update: {
          class_id?: string
          enrolled_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "class_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["specific_id"]
          },
        ]
      }
      classes: {
        Row: {
          class_id: string
          course_id: string
          created_at: string
          teacher_id: string | null
          type: Database["public"]["Enums"]["class_type"]
        }
        Insert: {
          class_id: string
          course_id: string
          created_at?: string
          teacher_id?: string | null
          type: Database["public"]["Enums"]["class_type"]
        }
        Update: {
          class_id?: string
          course_id?: string
          created_at?: string
          teacher_id?: string | null
          type?: Database["public"]["Enums"]["class_type"]
        }
        Relationships: [
          {
            foreignKeyName: "classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["specific_id"]
          },
        ]
      }
      courses: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          title?: string
        }
        Relationships: []
      }
      hsk_chapters: {
        Row: {
          chapter_id: string
          content: string | null
          course_id: string
          created_at: string
          order_index: number
          pdf_url: string | null
          file_urls: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          chapter_id?: string
          content?: string | null
          course_id: string
          created_at?: string
          order_index?: number
          pdf_url?: string | null
          file_urls?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          chapter_id?: string
          content?: string | null
          course_id?: string
          created_at?: string
          order_index?: number
          pdf_url?: string | null
          file_urls?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_progress: {
        Row: {
          course_id: string
          created_at: string
          expiry_date: string
          freeze_start_date: string | null
          id: string
          learning_mode: string
          remaining_sessions: number
          status: Database["public"]["Enums"]["progress_status"]
          student_id: string
          total_sessions: number
        }
        Insert: {
          course_id: string
          created_at?: string
          expiry_date?: string
          freeze_start_date?: string | null
          id?: string
          learning_mode?: string
          remaining_sessions?: number
          status?: Database["public"]["Enums"]["progress_status"]
          student_id: string
          total_sessions?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          expiry_date?: string
          freeze_start_date?: string | null
          id?: string
          learning_mode?: string
          remaining_sessions?: number
          status?: Database["public"]["Enums"]["progress_status"]
          student_id?: string
          total_sessions?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "student_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["specific_id"]
          },
        ]
      }
      teacher_penalties: {
        Row: {
          created_at: string
          penalty_id: string
          reason: string
          slot_id: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          penalty_id?: string
          reason: string
          slot_id: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          penalty_id?: string
          reason?: string
          slot_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_penalties_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["slot_id"]
          },
          {
            foreignKeyName: "teacher_penalties_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["specific_id"]
          },
        ]
      }
      teacher_ratings: {
        Row: {
          comment: string | null
          created_at: string
          rating_id: string
          slot_id: string
          stars: number
          student_id: string
          teacher_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          rating_id?: string
          slot_id: string
          stars: number
          student_id: string
          teacher_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          rating_id?: string
          slot_id?: string
          stars?: number
          student_id?: string
          teacher_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          birth_year: number | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          specific_id: string
          status: string
        }
        Insert: {
          birth_year?: number | null
          created_at?: string
          email: string
          full_name: string
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          specific_id: string
          status?: string
        }
        Update: {
          birth_year?: number | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          specific_id?: string
          status?: string
        }
        Relationships: []
      }
      session_evaluations: {
        Row: {
          evaluation_id: string
          slot_id: string
          student_id: string
          teacher_id: string
          listening_score: number
          speaking_score: number
          reading_score: number
          writing_score: number
          vocabulary_score: number
          grammar_score: number
          general_comment: string | null
          created_at: string
        }
        Insert: {
          evaluation_id?: string
          slot_id: string
          student_id: string
          teacher_id: string
          listening_score: number
          speaking_score: number
          reading_score: number
          writing_score: number
          vocabulary_score: number
          grammar_score: number
          general_comment?: string | null
          created_at?: string
        }
        Update: {
          evaluation_id?: string
          slot_id?: string
          student_id?: string
          teacher_id?: string
          listening_score?: number
          speaking_score?: number
          reading_score?: number
          writing_score?: number
          vocabulary_score?: number
          grammar_score?: number
          general_comment?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_evaluations_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["slot_id"]
          },
          {
            foreignKeyName: "session_evaluations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["specific_id"]
          },
          {
            foreignKeyName: "session_evaluations_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["specific_id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_student_to_offline_class: {
        Args: { p_class_id: string; p_student_id: string }
        Returns: {
          class_id: string
          enrolled_at: string
          student_id: string
        }
        SetofOptions: {
          from: "*"
          to: "class_enrollments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_slot: {
        Args: { p_slot_id: string }
        Returns: {
          class_id: string
          created_at: string
          session_date: string
          session_end_date: string | null
          slot_id: string
          status: Database["public"]["Enums"]["booking_status"]
          student_id: string
          teacher_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_recurring_bookings: {
        Args: {
          p_class_id: string
          p_course_id: string
          p_end_date: string
          p_end_time: string
          p_start_date: string
          p_start_time: string
          p_weekdays: number[]
        }
        Returns: {
          created: number
          skipped: number
          slot_ids: string[]
        }[]
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      current_user_specific_id: { Args: never; Returns: string }
      expire_stale_freezes: { Args: never; Returns: number }
      freeze_course: {
        Args: { p_course_id: string; p_student_id: string }
        Returns: {
          course_id: string
          created_at: string
          expiry_date: string
          freeze_start_date: string | null
          id: string
          learning_mode: string
          remaining_sessions: number
          status: Database["public"]["Enums"]["progress_status"]
          student_id: string
          total_sessions: number
        }
        SetofOptions: {
          from: "*"
          to: "student_progress"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_care_staff: {
        Args: never
        Returns: {
          birth_year_masked: string
          created_at: string
          email: string
          full_name: string
          phone_masked: string
          role: Database["public"]["Enums"]["app_role"]
          specific_id: string
          status: string
        }[]
      }
      get_care_students: {
        Args: never
        Returns: {
          birth_year_masked: string
          courses: Json
          created_at: string
          email: string
          full_name: string
          phone_masked: string
          specific_id: string
          status: string
        }[]
      }
      get_student_skills: {
        Args: { p_student_id: string }
        Returns: {
          skill: string
          avg_score: number
          session_count: number
        }[]
      }
      get_teacher_analytics: {
        Args: never
        Returns: {
          avg_stars: number
          full_name: string
          teacher_id: string
          total_penalties: number
          total_reviews: number
        }[]
      }
      get_top_teachers: {
        Args: { p_limit?: number }
        Returns: {
          avg_stars: number
          full_name: string
          teacher_id: string
          total_reviews: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      log_action: {
        Args: { p_action: string; p_details: Json }
        Returns: undefined
      }
      reveal_user_pii: {
        Args: { p_field: string; p_specific_id: string }
        Returns: string
      }
      student_cancel_booking: {
        Args: { p_slot_id: string }
        Returns: {
          class_id: string
          created_at: string
          session_date: string
          session_end_date: string | null
          slot_id: string
          status: Database["public"]["Enums"]["booking_status"]
          student_id: string
          teacher_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      teacher_cancel_booking: {
        Args: { p_reason?: string; p_slot_id: string }
        Returns: {
          class_id: string
          created_at: string
          session_date: string
          session_end_date: string | null
          slot_id: string
          status: Database["public"]["Enums"]["booking_status"]
          student_id: string
          teacher_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unfreeze_course: {
        Args: { p_course_id: string; p_student_id: string }
        Returns: {
          course_id: string
          created_at: string
          expiry_date: string
          freeze_start_date: string | null
          id: string
          learning_mode: string
          remaining_sessions: number
          status: Database["public"]["Enums"]["progress_status"]
          student_id: string
          total_sessions: number
        }
        SetofOptions: {
          from: "*"
          to: "student_progress"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "logistics" | "teacher" | "student" | "care"
      booking_status:
        | "pending"
        | "confirmed"
        | "cancelled_valid"
        | "cancelled_late"
      class_type: "online_1_1" | "offline_group"
      progress_status: "active" | "frozen" | "expired"
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
      app_role: ["admin", "logistics", "teacher", "student", "care"],
      booking_status: [
        "pending",
        "confirmed",
        "cancelled_valid",
        "cancelled_late",
      ],
      class_type: ["online_1_1", "offline_group"],
      progress_status: ["active", "frozen", "expired"],
    },
  },
} as const
