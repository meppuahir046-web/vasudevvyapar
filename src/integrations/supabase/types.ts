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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: string
          owner_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          owner_id?: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          owner_id?: string
        }
        Relationships: []
      }
      business_settings: {
        Row: {
          address: string | null
          business_name: string
          city: string | null
          created_at: string
          currency: string
          email: string | null
          gst_number: string | null
          invoice_counter: number
          invoice_footer: string | null
          invoice_prefix: string
          logo_url: string | null
          owner_id: string
          owner_name: string | null
          phone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          business_name?: string
          city?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          gst_number?: string | null
          invoice_counter?: number
          invoice_footer?: string | null
          invoice_prefix?: string
          logo_url?: string | null
          owner_id: string
          owner_name?: string | null
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string
          city?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          gst_number?: string | null
          invoice_counter?: number
          invoice_footer?: string | null
          invoice_prefix?: string
          logo_url?: string | null
          owner_id?: string
          owner_name?: string | null
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      customer_product_prices: {
        Row: {
          created_at: string
          customer_id: string
          effective_date: string
          id: string
          owner_id: string
          product_id: string
          selling_price: number
          unit: Database["public"]["Enums"]["unit_type"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          effective_date?: string
          id?: string
          owner_id?: string
          product_id: string
          selling_price: number
          unit?: Database["public"]["Enums"]["unit_type"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          effective_date?: string
          id?: string
          owner_id?: string
          product_id?: string
          selling_price?: number
          unit?: Database["public"]["Enums"]["unit_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_product_prices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_product_prices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          active: boolean
          address: string | null
          city: string | null
          created_at: string
          id: string
          is_demo: boolean
          mobile: string | null
          name: string
          notes: string | null
          owner_id: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_demo?: boolean
          mobile?: string | null
          name: string
          notes?: string | null
          owner_id?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_demo?: boolean
          mobile?: string | null
          name?: string
          notes?: string | null
          owner_id?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          notes: string | null
          owner_id: string
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          txn_date: string
          txn_type: Database["public"]["Enums"]["inv_txn_type"]
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo?: boolean
          notes?: string | null
          owner_id?: string
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          txn_date?: string
          txn_type: Database["public"]["Enums"]["inv_txn_type"]
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          notes?: string | null
          owner_id?: string
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          txn_date?: string
          txn_type?: Database["public"]["Enums"]["inv_txn_type"]
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          id: string
          is_demo: boolean
          is_reversal: boolean
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          owner_id: string
          paid_at: string
          reference: string | null
          sale_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          id?: string
          is_demo?: boolean
          is_reversal?: boolean
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          owner_id?: string
          paid_at?: string
          reference?: string | null
          sale_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          id?: string
          is_demo?: boolean
          is_reversal?: boolean
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          owner_id?: string
          paid_at?: string
          reference?: string | null
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          brand: string | null
          category_id: string | null
          created_at: string
          default_price: number
          description: string | null
          id: string
          is_demo: boolean
          min_stock: number
          name: string
          owner_id: string
          sku: string | null
          unit: Database["public"]["Enums"]["unit_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          brand?: string | null
          category_id?: string | null
          created_at?: string
          default_price?: number
          description?: string | null
          id?: string
          is_demo?: boolean
          min_stock?: number
          name: string
          owner_id?: string
          sku?: string | null
          unit?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          brand?: string | null
          category_id?: string | null
          created_at?: string
          default_price?: number
          description?: string | null
          id?: string
          is_demo?: boolean
          min_stock?: number
          name?: string
          owner_id?: string
          sku?: string | null
          unit?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          language: string
          theme: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          language?: string
          theme?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          language?: string
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          amount: number
          cost_total: number
          created_at: string
          id: string
          owner_id: string
          product_id: string
          profit: number
          quantity: number
          rate: number
          returned_quantity: number
          sale_id: string
          unit: Database["public"]["Enums"]["unit_type"]
          unit_cost: number
        }
        Insert: {
          amount: number
          cost_total?: number
          created_at?: string
          id?: string
          owner_id?: string
          product_id: string
          profit?: number
          quantity: number
          rate: number
          returned_quantity?: number
          sale_id: string
          unit?: Database["public"]["Enums"]["unit_type"]
          unit_cost?: number
        }
        Update: {
          amount?: number
          cost_total?: number
          created_at?: string
          id?: string
          owner_id?: string
          product_id?: string
          profit?: number
          quantity?: number
          rate?: number
          returned_quantity?: number
          sale_id?: string
          unit?: Database["public"]["Enums"]["unit_type"]
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_return_items: {
        Row: {
          amount: number
          created_at: string
          id: string
          owner_id: string
          product_id: string
          quantity: number
          rate: number
          return_id: string
          sale_item_id: string
          unit_cost: number
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          owner_id?: string
          product_id: string
          quantity: number
          rate: number
          return_id: string
          sale_item_id: string
          unit_cost?: number
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          owner_id?: string
          product_id?: string
          quantity?: number
          rate?: number
          return_id?: string
          sale_item_id?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "sale_returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_return_items_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_returns: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          notes: string | null
          owner_id: string
          return_date: string
          sale_id: string
          total_amount: number
          total_cost: number
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          notes?: string | null
          owner_id?: string
          return_date?: string
          sale_id: string
          total_amount?: number
          total_cost?: number
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          notes?: string | null
          owner_id?: string
          return_date?: string
          sale_id?: string
          total_amount?: number
          total_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_returns_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cogs: number
          created_at: string
          customer_id: string
          discount: number
          id: string
          invoice_no: string
          is_demo: boolean
          notes: string | null
          owner_id: string
          paid_amount: number
          pending_amount: number | null
          profit: number
          sale_date: string
          status: Database["public"]["Enums"]["sale_status"]
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          cogs?: number
          created_at?: string
          customer_id: string
          discount?: number
          id?: string
          invoice_no: string
          is_demo?: boolean
          notes?: string | null
          owner_id?: string
          paid_amount?: number
          pending_amount?: number | null
          profit?: number
          sale_date?: string
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          cogs?: number
          created_at?: string
          customer_id?: string
          discount?: number
          id?: string
          invoice_no?: string
          is_demo?: boolean
          notes?: string | null
          owner_id?: string
          paid_amount?: number
          pending_amount?: number | null
          profit?: number
          sale_date?: string
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_purchases: {
        Row: {
          cost_per_unit: number | null
          created_at: string
          id: string
          invoice_no: string | null
          is_demo: boolean
          notes: string | null
          owner_id: string
          product_id: string
          purchase_date: string
          quantity: number
          supplier_id: string | null
          total_amount: number
          unit: Database["public"]["Enums"]["unit_type"]
        }
        Insert: {
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          invoice_no?: string | null
          is_demo?: boolean
          notes?: string | null
          owner_id?: string
          product_id: string
          purchase_date?: string
          quantity: number
          supplier_id?: string | null
          total_amount: number
          unit?: Database["public"]["Enums"]["unit_type"]
        }
        Update: {
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          invoice_no?: string | null
          is_demo?: boolean
          notes?: string | null
          owner_id?: string
          product_id?: string
          purchase_date?: string
          quantity?: number
          supplier_id?: string | null
          total_amount?: number
          unit?: Database["public"]["Enums"]["unit_type"]
        }
        Relationships: [
          {
            foreignKeyName: "stock_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_demo: boolean
          name: string
          notes: string | null
          owner_id: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_demo?: boolean
          name: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_demo?: boolean
          name?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_customer_summary: {
        Row: {
          active: boolean | null
          address: string | null
          city: string | null
          created_at: string | null
          id: string | null
          last_sale: string | null
          mobile: string | null
          name: string | null
          orders: number | null
          owner_id: string | null
          total_paid: number | null
          total_pending: number | null
          total_profit: number | null
          total_purchased: number | null
          whatsapp: string | null
        }
        Relationships: []
      }
      v_product_inventory: {
        Row: {
          active: boolean | null
          avg_cost: number | null
          brand: string | null
          category_id: string | null
          category_name: string | null
          current_stock: number | null
          default_price: number | null
          id: string | null
          is_low_stock: boolean | null
          last_purchase: string | null
          last_sale: string | null
          min_stock: number | null
          name: string | null
          owner_id: string | null
          sku: string | null
          stock_value: number | null
          total_investment: number | null
          total_profit: number | null
          total_purchased: number | null
          total_revenue: number | null
          total_sold: number | null
          unit: Database["public"]["Enums"]["unit_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cancel_sale: {
        Args: { p_reason?: string; p_sale_id: string }
        Returns: undefined
      }
      create_sale: {
        Args: {
          p_customer_id: string
          p_discount?: number
          p_items: Json
          p_notes?: string
          p_paid?: number
          p_payment_method?: Database["public"]["Enums"]["payment_method"]
          p_sale_date?: string
          p_save_prices?: boolean
        }
        Returns: string
      }
      create_sale_return: {
        Args: {
          p_items: Json
          p_notes?: string
          p_return_date?: string
          p_sale_id: string
        }
        Returns: string
      }
      ensure_business_settings: { Args: never; Returns: undefined }
      next_invoice_no: { Args: never; Returns: string }
      product_avg_cost: { Args: { p_product: string }; Returns: number }
      product_stock: { Args: { p_product: string }; Returns: number }
      reset_demo_data: { Args: never; Returns: undefined }
      seed_demo_data: { Args: never; Returns: undefined }
    }
    Enums: {
      inv_txn_type:
        | "PURCHASE"
        | "SALE"
        | "SALE_RETURN"
        | "PURCHASE_RETURN"
        | "ADJUSTMENT"
        | "CANCELLATION"
      payment_method: "CASH" | "UPI" | "BANK" | "CARD" | "OTHER"
      sale_status: "ACTIVE" | "CANCELLED"
      unit_type:
        | "KG"
        | "GRAM"
        | "LITER"
        | "ML"
        | "PIECE"
        | "BOX"
        | "PACKET"
        | "BOTTLE"
        | "DOZEN"
        | "OTHER"
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
      inv_txn_type: [
        "PURCHASE",
        "SALE",
        "SALE_RETURN",
        "PURCHASE_RETURN",
        "ADJUSTMENT",
        "CANCELLATION",
      ],
      payment_method: ["CASH", "UPI", "BANK", "CARD", "OTHER"],
      sale_status: ["ACTIVE", "CANCELLED"],
      unit_type: [
        "KG",
        "GRAM",
        "LITER",
        "ML",
        "PIECE",
        "BOX",
        "PACKET",
        "BOTTLE",
        "DOZEN",
        "OTHER",
      ],
    },
  },
} as const
