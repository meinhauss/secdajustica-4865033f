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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audiencias: {
        Row: {
          created_at: string
          data_hora: string
          id: string
          local: string | null
          observacoes: string | null
          processo_id: string
          status: string
          tipo: string
        }
        Insert: {
          created_at?: string
          data_hora: string
          id?: string
          local?: string | null
          observacoes?: string | null
          processo_id: string
          status?: string
          tipo?: string
        }
        Update: {
          created_at?: string
          data_hora?: string
          id?: string
          local?: string | null
          observacoes?: string | null
          processo_id?: string
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "audiencias_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      boletins_ocorrencia: {
        Row: {
          created_at: string
          data_fato: string | null
          delegado_id: string | null
          descricao: string
          id: string
          local_fato: string | null
          numero: string
          status: string
          tipo: string
          updated_at: string
          vitima_id: string | null
          vitima_nome: string
        }
        Insert: {
          created_at?: string
          data_fato?: string | null
          delegado_id?: string | null
          descricao: string
          id?: string
          local_fato?: string | null
          numero: string
          status?: string
          tipo: string
          updated_at?: string
          vitima_id?: string | null
          vitima_nome: string
        }
        Update: {
          created_at?: string
          data_fato?: string | null
          delegado_id?: string | null
          descricao?: string
          id?: string
          local_fato?: string | null
          numero?: string
          status?: string
          tipo?: string
          updated_at?: string
          vitima_id?: string | null
          vitima_nome?: string
        }
        Relationships: []
      }
      movimentacoes: {
        Row: {
          autor_id: string | null
          created_at: string
          descricao: string
          id: string
          processo_id: string
          tipo: string
        }
        Insert: {
          autor_id?: string | null
          created_at?: string
          descricao: string
          id?: string
          processo_id: string
          tipo: string
        }
        Update: {
          autor_id?: string | null
          created_at?: string
          descricao?: string
          id?: string
          processo_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      processos: {
        Row: {
          advogado_autor_id: string | null
          advogado_reu_id: string | null
          assunto: string
          autor_nome: string
          classe: Database["public"]["Enums"]["classe_processual"]
          created_at: string
          descricao: string | null
          id: string
          juiz_id: string | null
          numero: string
          prioridade: boolean | null
          reu_nome: string
          status: Database["public"]["Enums"]["processo_status"]
          updated_at: string
          valor_causa: number | null
          vara: string | null
        }
        Insert: {
          advogado_autor_id?: string | null
          advogado_reu_id?: string | null
          assunto: string
          autor_nome: string
          classe?: Database["public"]["Enums"]["classe_processual"]
          created_at?: string
          descricao?: string | null
          id?: string
          juiz_id?: string | null
          numero: string
          prioridade?: boolean | null
          reu_nome: string
          status?: Database["public"]["Enums"]["processo_status"]
          updated_at?: string
          valor_causa?: number | null
          vara?: string | null
        }
        Update: {
          advogado_autor_id?: string | null
          advogado_reu_id?: string | null
          assunto?: string
          autor_nome?: string
          classe?: Database["public"]["Enums"]["classe_processual"]
          created_at?: string
          descricao?: string | null
          id?: string
          juiz_id?: string | null
          numero?: string
          prioridade?: boolean | null
          reu_nome?: string
          status?: Database["public"]["Enums"]["processo_status"]
          updated_at?: string
          valor_causa?: number | null
          vara?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cargo: string | null
          cpf: string | null
          created_at: string
          id: string
          nome_completo: string
          oab_numero: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          id?: string
          nome_completo: string
          oab_numero?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          id?: string
          nome_completo?: string
          oab_numero?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
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
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      classe_processual:
        | "criminal"
        | "civil"
        | "administrativo"
        | "constitucional"
      processo_status:
        | "novo"
        | "em_andamento"
        | "concluso"
        | "sentenciado"
        | "arquivado"
        | "suspenso"
      user_role:
        | "admin"
        | "magistrado"
        | "ministerio_publico"
        | "delegado"
        | "oficial_justica"
        | "advogado"
        | "cidadao"
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
      classe_processual: [
        "criminal",
        "civil",
        "administrativo",
        "constitucional",
      ],
      processo_status: [
        "novo",
        "em_andamento",
        "concluso",
        "sentenciado",
        "arquivado",
        "suspenso",
      ],
      user_role: [
        "admin",
        "magistrado",
        "ministerio_publico",
        "delegado",
        "oficial_justica",
        "advogado",
        "cidadao",
      ],
    },
  },
} as const
