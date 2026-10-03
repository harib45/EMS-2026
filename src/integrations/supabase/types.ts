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
      approvals: {
        Row: {
          action: Database["public"]["Enums"]["approval_action"]
          approver_id: string | null
          approver_role: Database["public"]["Enums"]["user_role"]
          comments: string | null
          created_at: string
          expense_id: string
          id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["approval_action"]
          approver_id?: string | null
          approver_role: Database["public"]["Enums"]["user_role"]
          comments?: string | null
          created_at?: string
          expense_id: string
          id?: string
        }
        Update: {
          action?: Database["public"]["Enums"]["approval_action"]
          approver_id?: string | null
          approver_role?: Database["public"]["Enums"]["user_role"]
          comments?: string | null
          created_at?: string
          expense_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          hod_user_id: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          hod_user_id?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          hod_user_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_hod_user_id_fkey"
            columns: ["hod_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      email_logs: {
        Row: {
          body: string
          created_at: string
          id: string
          is_sent: boolean
          subject: string
          to_email: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_sent?: boolean
          subject: string
          to_email: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_sent?: boolean
          subject?: string
          to_email?: string
        }
        Relationships: []
      }
      expense_messages: {
        Row: {
          created_at: string
          expense_id: string
          id: string
          is_system_message: boolean
          message_text: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          expense_id: string
          id?: string
          is_system_message?: boolean
          message_text: string
          sender_id: string
        }
        Update: {
          created_at?: string
          expense_id?: string
          id?: string
          is_system_message?: boolean
          message_text?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_messages_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          assigned_approver_id: string | null
          assigned_approver_role:
            | Database["public"]["Enums"]["user_role"]
            | null
          bill_url: string | null
          category: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          ocr_amount: number | null
          ocr_date: string | null
          ocr_merchant: string | null
          ocr_mismatch_flag: boolean | null
          ocr_text: string | null
          status: Database["public"]["Enums"]["expense_status"]
          title: string
        }
        Insert: {
          amount: number
          assigned_approver_id?: string | null
          assigned_approver_role?:
            | Database["public"]["Enums"]["user_role"]
            | null
          bill_url?: string | null
          category: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          ocr_amount?: number | null
          ocr_date?: string | null
          ocr_merchant?: string | null
          ocr_mismatch_flag?: boolean | null
          ocr_text?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          title: string
        }
        Update: {
          amount?: number
          assigned_approver_id?: string | null
          assigned_approver_role?:
            | Database["public"]["Enums"]["user_role"]
            | null
          bill_url?: string | null
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          ocr_amount?: number | null
          ocr_date?: string | null
          ocr_merchant?: string | null
          ocr_mismatch_flag?: boolean | null
          ocr_text?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_profiles_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          expense_id: string
          id: string
          paid_at: string
          payment_mode: Database["public"]["Enums"]["payment_mode"]
          reference_id: string | null
        }
        Insert: {
          amount: number
          expense_id: string
          id?: string
          paid_at?: string
          payment_mode: Database["public"]["Enums"]["payment_mode"]
          reference_id?: string | null
        }
        Update: {
          amount?: number
          expense_id?: string
          id?: string
          paid_at?: string
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: true
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          display_name: string | null
          email: string
          id: string
          is_mobile_visible: boolean
          mobile_number: string | null
          must_change_password: boolean
          name: string
          password_updated_at: string | null
          profile_image_url: string | null
          register_number: string | null
          reporting_manager_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          display_name?: string | null
          email: string
          id?: string
          is_mobile_visible?: boolean
          mobile_number?: string | null
          must_change_password?: boolean
          name: string
          password_updated_at?: string | null
          profile_image_url?: string | null
          register_number?: string | null
          reporting_manager_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          display_name?: string | null
          email?: string
          id?: string
          is_mobile_visible?: boolean
          mobile_number?: string | null
          must_change_password?: boolean
          name?: string
          password_updated_at?: string | null
          profile_image_url?: string | null
          register_number?: string | null
          reporting_manager_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_reporting_manager_id_fkey"
            columns: ["reporting_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_approve_expense: boolean
          can_manage_users: boolean
          can_raise_expense: boolean
          can_view_analytics: boolean
          created_at: string
          id: string
          role_id: string
        }
        Insert: {
          can_approve_expense?: boolean
          can_manage_users?: boolean
          can_raise_expense?: boolean
          can_view_analytics?: boolean
          created_at?: string
          id?: string
          role_id: string
        }
        Update: {
          can_approve_expense?: boolean
          can_manage_users?: boolean
          can_raise_expense?: boolean
          can_view_analytics?: boolean
          created_at?: string
          id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: true
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system_role: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system_role?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system_role?: boolean
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["user_role"]
          role_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          role_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          role_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      escalate_expense: {
        Args: {
          p_expense_id: string
          p_new_approver_id?: string
          p_new_approver_role?: Database["public"]["Enums"]["user_role"]
          p_new_status: Database["public"]["Enums"]["expense_status"]
        }
        Returns: undefined
      }
      get_next_approver_role: {
        Args: { p_role: Database["public"]["Enums"]["user_role"] }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_reporting_manager_user_id: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_user_permissions: {
        Args: { p_user_id: string }
        Returns: {
          can_approve_expense: boolean
          can_manage_users: boolean
          can_raise_expense: boolean
          can_view_analytics: boolean
        }[]
      }
      get_user_role: {
        Args: { p_user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_role_name: { Args: { p_user_id: string }; Returns: string }
      has_role: {
        Args: {
          p_role: Database["public"]["Enums"]["user_role"]
          p_user_id: string
        }
        Returns: boolean
      }
      is_terminal_approver: { Args: { p_user_id: string }; Returns: boolean }
      log_audit: {
        Args: {
          p_action: string
          p_details?: Json
          p_entity: string
          p_entity_id?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      approval_action: "APPROVED" | "REJECTED"
      expense_status: "LOGGED" | "SUBMITTED" | "APPROVED" | "REJECTED"
      notification_type: "APPROVAL" | "REJECTION" | "INFO"
      payment_mode: "CASH" | "UPI" | "BANK"
      user_role: "ADMIN" | "PAYROLL" | "HOD" | "MENTOR" | "STUDENT"
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
      approval_action: ["APPROVED", "REJECTED"],
      expense_status: ["LOGGED", "SUBMITTED", "APPROVED", "REJECTED"],
      notification_type: ["APPROVAL", "REJECTION", "INFO"],
      payment_mode: ["CASH", "UPI", "BANK"],
      user_role: ["ADMIN", "PAYROLL", "HOD", "MENTOR", "STUDENT"],
    },
  },
} as const
