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
      AccountingAccount: {
        Row: {
          id: number
          companyId: number
          code: string
          name: string
          type: Database["public"]["Enums"]["AccountType"]
          parentId: number | null
          level: number
          isBudgetable: boolean
          isExecutable: boolean
          isActive: boolean
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: number
          companyId: number
          code: string
          name: string
          type: Database["public"]["Enums"]["AccountType"]
          parentId?: number | null
          level?: number
          isBudgetable?: boolean
          isExecutable?: boolean
          isActive?: boolean
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: number
          companyId?: number
          code?: string
          name?: string
          type?: Database["public"]["Enums"]["AccountType"]
          parentId?: number | null
          level?: number
          isBudgetable?: boolean
          isExecutable?: boolean
          isActive?: boolean
          createdAt?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "AccountingAccount_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "Company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "AccountingAccount_parentId_fkey"
            columns: ["parentId"]
            isOneToOne: false
            referencedRelation: "AccountingAccount"
            referencedColumns: ["id"]
          }
        ]
      }
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
      CompanyAccount: {
        Row: {
          id: number
          companyId: number
          globalAccountId: number
          isActive: boolean
          overrideName: string | null
          isBudgetableOverride: boolean | null
          isExecutableOverride: boolean | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: number
          companyId: number
          globalAccountId: number
          isActive?: boolean
          overrideName?: string | null
          isBudgetableOverride?: boolean | null
          isExecutableOverride?: boolean | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: number
          companyId?: number
          globalAccountId?: number
          isActive?: boolean
          overrideName?: string | null
          isBudgetableOverride?: boolean | null
          isExecutableOverride?: boolean | null
          createdAt?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "CompanyAccount_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "Company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CompanyAccount_globalAccountId_fkey"
            columns: ["globalAccountId"]
            isOneToOne: false
            referencedRelation: "GlobalAccount"
            referencedColumns: ["id"]
          }
        ]
      }
      BudgetAdjustment: {
        Row: {
          id: number
          allocationId: number
          companyAccountId: number | null
          accountId: number | null
          amountUSD: number
          amountVES: number
          reason: string
          recordedById: number | null
          recordedAt: string
        }
        Insert: {
          id?: number
          allocationId: number
          companyAccountId?: number | null
          accountId?: number | null
          amountUSD: number
          amountVES?: number
          reason: string
          recordedById?: number | null
          recordedAt?: string
        }
        Update: {
          id?: number
          allocationId?: number
          companyAccountId?: number | null
          accountId?: number | null
          amountUSD?: number
          amountVES?: number
          reason?: string
          recordedById?: number | null
          recordedAt?: string
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
          {
            foreignKeyName: "BudgetAdjustment_accountId_fkey"
            columns: ["accountId"]
            isOneToOne: false
            referencedRelation: "AccountingAccount"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "BudgetAdjustment_companyAccountId_fkey"
            columns: ["companyAccountId"]
            isOneToOne: false
            referencedRelation: "CompanyAccount"
            referencedColumns: ["id"]
          },
        ]
      }
      BudgetAllocation: {
        Row: {
          amountUSD: number
          amountVES: number
          budgetId: number
          categoryId: number | null
          consumedUSD: number
          consumedVES: number
          accountId: number | null
          companyAccountId: number | null
          createdAt: string
          id: number
          subcategoryId: number | null
          updatedAt: string
        }
        Insert: {
          amountUSD: number
          amountVES?: number
          budgetId: number
          categoryId?: number | null
          consumedUSD?: number
          consumedVES?: number
          accountId?: number | null
          companyAccountId?: number | null
          createdAt?: string
          id?: number
          subcategoryId?: number | null
          updatedAt?: string
        }
        Update: {
          amountUSD?: number
          amountVES?: number
          budgetId?: number
          categoryId?: number | null
          consumedUSD?: number
          consumedVES?: number
          accountId?: number | null
          companyAccountId?: number | null
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
          {
            foreignKeyName: "BudgetAllocation_accountId_fkey"
            columns: ["accountId"]
            isOneToOne: false
            referencedRelation: "AccountingAccount"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "BudgetAllocation_companyAccountId_fkey"
            columns: ["companyAccountId"]
            isOneToOne: false
            referencedRelation: "CompanyAccount"
            referencedColumns: ["id"]
          },
        ]
      }
      BusinessGroup: {
        Row: {
          createdAt: string
          description: string | null
          id: number
          isActive: boolean
          name: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          description?: string | null
          id?: number
          isActive?: boolean
          name: string
          updatedAt?: string
        }
        Update: {
          createdAt?: string
          description?: string | null
          id?: number
          isActive?: boolean
          name?: string
          updatedAt?: string
        }
        Relationships: []
      }
      GlobalAccount: {
        Row: {
          id: number
          code: string
          name: string
          type: Database["public"]["Enums"]["AccountType"]
          parentId: number | null
          level: number
          isBudgetable: boolean
          isExecutable: boolean
          isMovementAccount: boolean
          isActive: boolean
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: number
          code: string
          name: string
          type: Database["public"]["Enums"]["AccountType"]
          parentId?: number | null
          level?: number
          isBudgetable?: boolean
          isExecutable?: boolean
          isMovementAccount?: boolean
          isActive?: boolean
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: number
          code?: string
          name?: string
          type?: Database["public"]["Enums"]["AccountType"]
          parentId?: number | null
          level?: number
          isBudgetable?: boolean
          isExecutable?: boolean
          isMovementAccount?: boolean
          isActive?: boolean
          createdAt?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "GlobalAccount_parentId_fkey"
            columns: ["parentId"]
            isOneToOne: false
            referencedRelation: "GlobalAccount"
            referencedColumns: ["id"]
          }
        ]
      }
      CategoryAccountMapping: {
        Row: {
          id: number
          companyId: number
          categoryId: number
          subcategoryId: number | null
          accountId: number | null
          companyAccountId: number | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: number
          companyId: number
          categoryId: number
          subcategoryId?: number | null
          accountId?: number | null
          companyAccountId?: number | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: number
          companyId?: number
          categoryId?: number
          subcategoryId?: number | null
          accountId?: number | null
          companyAccountId?: number | null
          createdAt?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "CategoryAccountMapping_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "Company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CategoryAccountMapping_categoryId_fkey"
            columns: ["categoryId"]
            isOneToOne: false
            referencedRelation: "Category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CategoryAccountMapping_subcategoryId_fkey"
            columns: ["subcategoryId"]
            isOneToOne: false
            referencedRelation: "Subcategory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CategoryAccountMapping_accountId_fkey"
            columns: ["accountId"]
            isOneToOne: false
            referencedRelation: "AccountingAccount"
            referencedColumns: ["id"]
          }
        ]
      }
      Category: {
        Row: {
          companyId: number | null
          createdAt: string
          id: number
          isActive: boolean
          name: string
          type: Database["public"]["Enums"]["CategoryType"] | null
          updatedAt: string
        }
        Insert: {
          companyId?: number | null
          createdAt?: string
          id?: number
          isActive?: boolean
          name: string
          type?: Database["public"]["Enums"]["CategoryType"] | null
          updatedAt?: string
        }
        Update: {
          companyId?: number | null
          createdAt?: string
          id?: number
          isActive?: boolean
          name?: string
          type?: Database["public"]["Enums"]["CategoryType"] | null
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
          groupId: number | null
          id: number
          isActive: boolean
          name: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          groupId?: number | null
          id?: number
          isActive?: boolean
          name: string
          updatedAt?: string
        }
        Update: {
          createdAt?: string
          groupId?: number | null
          id?: number
          isActive?: boolean
          name?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Company_groupId_fkey"
            columns: ["groupId"]
            isOneToOne: false
            referencedRelation: "BusinessGroup"
            referencedColumns: ["id"]
          },
        ]
      }
      ExchangeRate: {
        Row: {
          createdAt: string | null
          date: string
          eur: number
          id: number
          updatedAt: string | null
          usd: number
        }
        Insert: {
          createdAt?: string | null
          date?: string
          eur: number
          id?: number
          updatedAt?: string | null
          usd: number
        }
        Update: {
          createdAt?: string | null
          date?: string
          eur?: number
          id?: number
          updatedAt?: string | null
          usd?: number
        }
        Relationships: []
      }
      Income: {
        Row: {
          amountUSD: number
          amountVES: number
          attachmentKey: string | null
          attachmentName: string | null
          branchId: number | null
          categoryId: number
          clientName: string
          companyId: number
          accountId: number | null
          companyAccountId: number | null
          createdAt: string
          date: string
          exchangeRate: number
          id: number
          notes: string | null
          number: string
          registeredById: number
          subcategoryId: number | null
          updatedAt: string
        }
        Insert: {
          amountUSD: number
          amountVES: number
          attachmentKey?: string | null
          attachmentName?: string | null
          branchId?: number | null
          categoryId: number
          clientName: string
          companyId: number
          accountId?: number | null
          companyAccountId?: number | null
          createdAt?: string
          date: string
          exchangeRate: number
          id?: number
          notes?: string | null
          number: string
          registeredById: number
          subcategoryId?: number | null
          updatedAt?: string
        }
        Update: {
          amountUSD?: number
          amountVES?: number
          attachmentKey?: string | null
          attachmentName?: string | null
          branchId?: number | null
          categoryId?: number
          clientName?: string
          companyId?: number
          accountId?: number | null
          companyAccountId?: number | null
          createdAt?: string
          date?: string
          exchangeRate?: number
          id?: number
          notes?: string | null
          number?: string
          registeredById?: number
          subcategoryId?: number | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Income_branchId_fkey"
            columns: ["branchId"]
            isOneToOne: false
            referencedRelation: "Branch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Income_categoryId_fkey"
            columns: ["categoryId"]
            isOneToOne: false
            referencedRelation: "Category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Income_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "Company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Income_registeredById_fkey"
            columns: ["registeredById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Income_subcategoryId_fkey"
            columns: ["subcategoryId"]
            isOneToOne: false
            referencedRelation: "Subcategory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Income_accountId_fkey"
            columns: ["accountId"]
            isOneToOne: false
            referencedRelation: "AccountingAccount"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Income_companyAccountId_fkey"
            columns: ["companyAccountId"]
            isOneToOne: false
            referencedRelation: "CompanyAccount"
            referencedColumns: ["id"]
          },
        ]
      }
      Invoice: {
        Row: {
          allocationId: number
          amountUSD: number
          amountVES: number
          attachmentKey: string | null
          attachmentName: string | null
          companyId: number
          accountId: number | null
          companyAccountId: number | null
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
          accountId?: number | null
          companyAccountId?: number | null
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
          accountId?: number | null
          companyAccountId?: number | null
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
          {
            foreignKeyName: "Invoice_accountId_fkey"
            columns: ["accountId"]
            isOneToOne: false
            referencedRelation: "AccountingAccount"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Invoice_companyAccountId_fkey"
            columns: ["companyAccountId"]
            isOneToOne: false
            referencedRelation: "CompanyAccount"
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
      adjust_allocation_on_invoice: {
        Args: {
          p_allocation_id: number
          p_amount_usd: number
          p_amount_ves: number
        }
        Returns: undefined
      }
      get_auth_user_company_id: { Args: never; Returns: number }
      get_auth_user_id: { Args: never; Returns: number }
      get_auth_user_role: { Args: never; Returns: string }
      get_my_profile: {
        Args: never
        Returns: {
          user_branch_id: number
          user_company_id: number
          user_role: Database["public"]["Enums"]["Role"]
        }[]
      }
      rpc_transfer_budget_funds: {
        Args: {
          p_source_allocation_id: number
          p_target_allocation_id: number
          p_amount: number
          p_reason: string
        }
        Returns: Json
      }
      rpc_register_invoice: {
        Args: {
          p_invoice_data: Json
        }
        Returns: Json
      }
      rpc_cancel_invoice: {
        Args: {
          p_invoice_id: number
        }
        Returns: Json
      }
      rpc_register_income: {
        Args: {
          p_income_data: Json
        }
        Returns: Json
      }
      rpc_budget_adjustment: {
        Args: {
          p_allocation_id: number
          p_company_account_id: number
          p_amount_usd: number
          p_reason: string
        }
        Returns: Json
      }
      rpc_update_invoice: {
        Args: {
          p_invoice_id: number
          p_invoice_data: Json
        }
        Returns: Json
      }
    }
    Enums: {
      AccountType: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "COST" | "EXPENSE" | "PROFIT" | "DISTRIBUTION"
      AlertType: "BUDGET_EXCEEDED" | "ADJUSTMENT_MADE" | "SYSTEM_WARNING"
      BudgetPeriodType: "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL"
      BudgetStatus: "DRAFT" | "ACTIVE" | "CLOSED"
      CategoryType: "EXPENSE" | "INCOME"
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
      CategoryType: ["EXPENSE", "INCOME"],
      InvoiceStatus: ["REGISTERED", "CANCELLED"],
      Role: ["SUPER_ADMIN", "COMPANY_ADMIN", "OPERATOR", "AUDITOR", "VIEWER"],
    },
  },
} as const
