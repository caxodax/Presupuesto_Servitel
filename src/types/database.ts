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
      Alert: {
        Row: {
          companyId: number
          createdAt: string
          id: number
          isRead: boolean
          message: string
          title: string
          type: Database["public"]["Enums"]["AlertType"]
        }
        Insert: {
          companyId: number
          createdAt?: string
          id?: number
          isRead?: boolean
          message: string
          title: string
          type: Database["public"]["Enums"]["AlertType"]
        }
        Update: {
          companyId?: number
          createdAt?: string
          id?: number
          isRead?: boolean
          message?: string
          title?: string
          type?: Database["public"]["Enums"]["AlertType"]
        }
        Relationships: [
          {
            foreignKeyName: "Alert_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "Company"
            referencedColumns: ["id"]
          },
        ]
      }
      AuditLog: {
        Row: {
          action: string
          companyId: number | null
          createdAt: string
          details: Json | null
          entity: string
          entityId: string
          id: number
          userId: number
        }
        Insert: {
          action: string
          companyId?: number | null
          createdAt?: string
          details?: Json | null
          entity: string
          entityId: string
          id?: number
          userId: number
        }
        Update: {
          action?: string
          companyId?: number | null
          createdAt?: string
          details?: Json | null
          entity?: string
          entityId?: string
          id?: number
          userId?: number
        }
        Relationships: [
          {
            foreignKeyName: "AuditLog_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "Company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "AuditLog_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Branch: {
        Row: {
          companyId: number
          createdAt: string
          id: number
          isActive: boolean
          name: string
          updatedAt: string
        }
        Insert: {
          companyId: number
          createdAt?: string
          id?: number
          isActive?: boolean
          name: string
          updatedAt?: string
        }
        Update: {
          companyId?: number
          createdAt?: string
          id?: number
          isActive?: boolean
          name?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Branch_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "Company"
            referencedColumns: ["id"]
          },
        ]
      }
      Budget: {
        Row: {
          amountLimitUSD: number
          branchId: number
          companyId: number
          createdAt: string
          endDate: string
          id: number
          initialDate: string
          name: string
          status: Database["public"]["Enums"]["BudgetStatus"]
          type: Database["public"]["Enums"]["BudgetPeriodType"]
          updatedAt: string
        }
        Insert: {
          amountLimitUSD: number
          branchId: number
          companyId: number
          createdAt?: string
          endDate: string
          id?: number
          initialDate: string
          name: string
          status?: Database["public"]["Enums"]["BudgetStatus"]
          type?: Database["public"]["Enums"]["BudgetPeriodType"]
          updatedAt?: string
        }
        Update: {
          amountLimitUSD?: number
          branchId?: number
          companyId?: number
          createdAt?: string
          endDate?: string
          id?: number
          initialDate?: string
          name?: string
          status?: Database["public"]["Enums"]["BudgetStatus"]
          type?: Database["public"]["Enums"]["BudgetPeriodType"]
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Budget_branchId_fkey"
            columns: ["branchId"]
            isOneToOne: false
            referencedRelation: "Branch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Budget_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "Company"
            referencedColumns: ["id"]
          },
        ]
      }
      BudgetAdjustment: {
        Row: {
          allocationId: number
          amountUSD: number
          amountVES: number
          createdAt: string
          id: number
          reason: string
          recordedById: number
        }
        Insert: {
          allocationId: number
          amountUSD: number
          amountVES?: number
          createdAt?: string
          id?: number
          reason: string
          recordedById: number
        }
        Update: {
          allocationId?: number
          amountUSD?: number
          amountVES?: number
          createdAt?: string
          id?: number
          reason?: string
          recordedById?: number
        }
        Relationships: [
          {
            foreignKeyName: "BudgetAdjustment_allocationId_fkey"
            columns: ["allocationId"]
            isOneToOne: false
            referencedRelation: "BudgetAllocation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "BudgetAdjustment_recordedById_fkey"
            columns: ["recordedById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      BudgetAllocation: {
        Row: {
          amountUSD: number
          amountVES: number
          budgetId: number
          categoryId: number
          consumedUSD: number
          consumedVES: number
          createdAt: string
          id: number
          subcategoryId: number | null
          updatedAt: string
        }
        Insert: {
          amountUSD: number
          amountVES?: number
          budgetId: number
          categoryId: number
          consumedUSD?: number
          consumedVES?: number
          createdAt?: string
          id?: number
          subcategoryId?: number | null
          updatedAt?: string
        }
        Update: {
          amountUSD?: number
          amountVES?: number
          budgetId?: number
          categoryId?: number
          consumedUSD?: number
          consumedVES?: number
          createdAt?: string
          id?: number
          subcategoryId?: number | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "BudgetAllocation_budgetId_fkey"
            columns: ["budgetId"]
            isOneToOne: false
            referencedRelation: "Budget"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "BudgetAllocation_categoryId_fkey"
            columns: ["categoryId"]
            isOneToOne: false
            referencedRelation: "Category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "BudgetAllocation_subcategoryId_fkey"
            columns: ["subcategoryId"]
            isOneToOne: false
            referencedRelation: "Subcategory"
            referencedColumns: ["id"]
          },
        ]
      }
      Category: {
        Row: {
          companyId: number
          createdAt: string
          id: number
          isActive: boolean
          name: string
          updatedAt: string
        }
        Insert: {
          companyId: number
          createdAt?: string
          id?: number
          isActive?: boolean
          name: string
          updatedAt?: string
        }
        Update: {
          companyId?: number
          createdAt?: string
          id?: number
          isActive?: boolean
          name?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Category_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "Company"
            referencedColumns: ["id"]
          },
        ]
      }
      Company: {
        Row: {
          createdAt: string
          id: number
          isActive: boolean
          name: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          id?: number
          isActive?: boolean
          name: string
          updatedAt?: string
        }
        Update: {
          createdAt?: string
          id?: number
          isActive?: boolean
          name?: string
          updatedAt?: string
        }
        Relationships: []
      }
      Invoice: {
        Row: {
          allocationId: number
          amountUSD: number
          amountVES: number
          attachmentKey: string | null
          attachmentName: string | null
          companyId: number
          createdAt: string
          date: string
          exchangeRate: number
          id: number
          number: string
          registeredById: number
          status: Database["public"]["Enums"]["InvoiceStatus"]
          supplierName: string
          updatedAt: string
        }
        Insert: {
          allocationId: number
          amountUSD: number
          amountVES: number
          attachmentKey?: string | null
          attachmentName?: string | null
          companyId: number
          createdAt?: string
          date: string
          exchangeRate: number
          id?: number
          number: string
          registeredById: number
          status?: Database["public"]["Enums"]["InvoiceStatus"]
          supplierName: string
          updatedAt?: string
        }
        Update: {
          allocationId?: number
          amountUSD?: number
          amountVES?: number
          attachmentKey?: string | null
          attachmentName?: string | null
          companyId?: number
          createdAt?: string
          date?: string
          exchangeRate?: number
          id?: number
          number?: string
          registeredById?: number
          status?: Database["public"]["Enums"]["InvoiceStatus"]
          supplierName?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Invoice_allocationId_fkey"
            columns: ["allocationId"]
            isOneToOne: false
            referencedRelation: "BudgetAllocation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Invoice_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "Company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Invoice_registeredById_fkey"
            columns: ["registeredById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Subcategory: {
        Row: {
          categoryId: number
          createdAt: string
          id: number
          isActive: boolean
          name: string
          updatedAt: string
        }
        Insert: {
          categoryId: number
          createdAt?: string
          id?: number
          isActive?: boolean
          name: string
          updatedAt?: string
        }
        Update: {
          categoryId?: number
          createdAt?: string
          id?: number
          isActive?: boolean
          name?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Subcategory_categoryId_fkey"
            columns: ["categoryId"]
            isOneToOne: false
            referencedRelation: "Category"
            referencedColumns: ["id"]
          },
        ]
      }
      User: {
        Row: {
          authId: string | null
          branchId: number | null
          companyId: number | null
          createdAt: string
          email: string
          id: number
          isActive: boolean
          name: string
          passwordHash: string | null
          role: Database["public"]["Enums"]["Role"]
          updatedAt: string
        }
        Insert: {
          authId?: string | null
          branchId?: number | null
          companyId?: number | null
          createdAt?: string
          email: string
          id?: number
          isActive?: boolean
          name: string
          passwordHash?: string | null
          role?: Database["public"]["Enums"]["Role"]
          updatedAt?: string
        }
        Update: {
          authId?: string | null
          branchId?: number | null
          companyId?: number | null
          createdAt?: string
          email?: string
          id?: number
          isActive?: boolean
          name?: string
          passwordHash?: string | null
          role?: Database["public"]["Enums"]["Role"]
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "User_branchId_fkey"
            columns: ["branchId"]
            isOneToOne: false
            referencedRelation: "Branch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "User_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "Company"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      AlertType: "BUDGET_EXCEEDED" | "ADJUSTMENT_MADE" | "SYSTEM_WARNING"
      BudgetPeriodType: "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL"
      BudgetStatus: "DRAFT" | "ACTIVE" | "CLOSED"
      InvoiceStatus: "REGISTERED" | "CANCELLED"
      Role: "SUPER_ADMIN" | "COMPANY_ADMIN" | "OPERATOR" | "AUDITOR" | "VIEWER"
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
      AlertType: ["BUDGET_EXCEEDED", "ADJUSTMENT_MADE", "SYSTEM_WARNING"],
      BudgetPeriodType: ["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL"],
      BudgetStatus: ["DRAFT", "ACTIVE", "CLOSED"],
      InvoiceStatus: ["REGISTERED", "CANCELLED"],
      Role: ["SUPER_ADMIN", "COMPANY_ADMIN", "OPERATOR", "AUDITOR", "VIEWER"],
    },
  },
} as const
