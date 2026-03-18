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
      arquivamentos_mp: {
        Row: {
          created_at: string
          id: string
          inquerito_id: string
          justificativa: string
          promotor_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          inquerito_id: string
          justificativa: string
          promotor_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          inquerito_id?: string
          justificativa?: string
          promotor_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "arquivamentos_mp_inquerito_id_fkey"
            columns: ["inquerito_id"]
            isOneToOne: false
            referencedRelation: "inqueritos"
            referencedColumns: ["id"]
          },
        ]
      }
      atos_judiciais: {
        Row: {
          assinado: boolean
          autor_id: string | null
          autor_nome: string | null
          conteudo: string
          created_at: string
          data_assinatura: string | null
          id: string
          processo_id: string
          tipo: string
          titulo: string
        }
        Insert: {
          assinado?: boolean
          autor_id?: string | null
          autor_nome?: string | null
          conteudo: string
          created_at?: string
          data_assinatura?: string | null
          id?: string
          processo_id: string
          tipo?: string
          titulo: string
        }
        Update: {
          assinado?: boolean
          autor_id?: string | null
          autor_nome?: string | null
          conteudo?: string
          created_at?: string
          data_assinatura?: string | null
          id?: string
          processo_id?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "atos_judiciais_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
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
      cargo_historico: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string
          id: string
          nomeado_por: string | null
          observacoes: string | null
          role: Database["public"]["Enums"]["user_role"]
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          nomeado_por?: string | null
          observacoes?: string | null
          role: Database["public"]["Enums"]["user_role"]
          tipo?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          nomeado_por?: string | null
          observacoes?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      carteiras_oab: {
        Row: {
          created_at: string
          data_inscricao: string
          especialidade: string | null
          foto_url: string | null
          id: string
          id_personagem: string | null
          inscricao_id: string | null
          nome_completo: string
          numero_oab: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_inscricao?: string
          especialidade?: string | null
          foto_url?: string | null
          id?: string
          id_personagem?: string | null
          inscricao_id?: string | null
          nome_completo: string
          numero_oab?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_inscricao?: string
          especialidade?: string | null
          foto_url?: string | null
          id?: string
          id_personagem?: string | null
          inscricao_id?: string | null
          nome_completo?: string
          numero_oab?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carteiras_oab_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "inscricoes_oab"
            referencedColumns: ["id"]
          },
        ]
      }
      certificacoes: {
        Row: {
          assinado: boolean
          conteudo: string
          created_at: string
          data_assinatura: string | null
          emitido_por: string | null
          emitido_por_nome: string | null
          id: string
          processo_id: string
          tipo: string
        }
        Insert: {
          assinado?: boolean
          conteudo: string
          created_at?: string
          data_assinatura?: string | null
          emitido_por?: string | null
          emitido_por_nome?: string | null
          id?: string
          processo_id: string
          tipo?: string
        }
        Update: {
          assinado?: boolean
          conteudo?: string
          created_at?: string
          data_assinatura?: string | null
          emitido_por?: string | null
          emitido_por_nome?: string | null
          id?: string
          processo_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      comunicados_concurso: {
        Row: {
          autor_id: string | null
          concurso_id: string
          conteudo: string
          created_at: string
          id: string
          tipo: string
          titulo: string
        }
        Insert: {
          autor_id?: string | null
          concurso_id: string
          conteudo: string
          created_at?: string
          id?: string
          tipo?: string
          titulo: string
        }
        Update: {
          autor_id?: string | null
          concurso_id?: string
          conteudo?: string
          created_at?: string
          id?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "comunicados_concurso_concurso_id_fkey"
            columns: ["concurso_id"]
            isOneToOne: false
            referencedRelation: "concursos"
            referencedColumns: ["id"]
          },
        ]
      }
      comunicados_oab: {
        Row: {
          autor_id: string | null
          conteudo: string
          created_at: string
          id: string
          tipo: string
          titulo: string
        }
        Insert: {
          autor_id?: string | null
          conteudo: string
          created_at?: string
          id?: string
          tipo?: string
          titulo: string
        }
        Update: {
          autor_id?: string | null
          conteudo?: string
          created_at?: string
          id?: string
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      concursos: {
        Row: {
          cargo: string
          conteudo_programatico: string | null
          created_at: string
          criado_por: string | null
          data_abertura: string | null
          data_encerramento_inscricoes: string | null
          data_prova: string | null
          data_resultado: string | null
          edital_url: string | null
          id: string
          regras_classificacao: string | null
          requisitos: string | null
          status: string
          titulo: string
          updated_at: string
          vagas: number
        }
        Insert: {
          cargo: string
          conteudo_programatico?: string | null
          created_at?: string
          criado_por?: string | null
          data_abertura?: string | null
          data_encerramento_inscricoes?: string | null
          data_prova?: string | null
          data_resultado?: string | null
          edital_url?: string | null
          id?: string
          regras_classificacao?: string | null
          requisitos?: string | null
          status?: string
          titulo: string
          updated_at?: string
          vagas?: number
        }
        Update: {
          cargo?: string
          conteudo_programatico?: string | null
          created_at?: string
          criado_por?: string | null
          data_abertura?: string | null
          data_encerramento_inscricoes?: string | null
          data_prova?: string | null
          data_resultado?: string | null
          edital_url?: string | null
          id?: string
          regras_classificacao?: string | null
          requisitos?: string | null
          status?: string
          titulo?: string
          updated_at?: string
          vagas?: number
        }
        Relationships: []
      }
      denuncias_mp: {
        Row: {
          created_at: string
          fundamentacao: string
          id: string
          inquerito_id: string | null
          numero_protocolo: string
          processo_id: string | null
          promotor_id: string
          resumo: string
          status: string
          tipificacao: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fundamentacao: string
          id?: string
          inquerito_id?: string | null
          numero_protocolo?: string
          processo_id?: string | null
          promotor_id: string
          resumo: string
          status?: string
          tipificacao?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fundamentacao?: string
          id?: string
          inquerito_id?: string | null
          numero_protocolo?: string
          processo_id?: string | null
          promotor_id?: string
          resumo?: string
          status?: string
          tipificacao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "denuncias_mp_inquerito_id_fkey"
            columns: ["inquerito_id"]
            isOneToOne: false
            referencedRelation: "inqueritos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "denuncias_mp_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      diligencias: {
        Row: {
          created_at: string
          descricao: string
          id: string
          inquerito_id: string
          responsavel_id: string | null
          responsavel_nome: string | null
          resultado: string | null
          status: string
          tipo: string
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          inquerito_id: string
          responsavel_id?: string | null
          responsavel_nome?: string | null
          resultado?: string | null
          status?: string
          tipo?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          inquerito_id?: string
          responsavel_id?: string | null
          responsavel_nome?: string | null
          resultado?: string | null
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "diligencias_inquerito_id_fkey"
            columns: ["inquerito_id"]
            isOneToOne: false
            referencedRelation: "inqueritos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_processo: {
        Row: {
          arquivo_url: string | null
          autor_id: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          processo_id: string
          tipo: string
        }
        Insert: {
          arquivo_url?: string | null
          autor_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          processo_id: string
          tipo?: string
        }
        Update: {
          arquivo_url?: string | null
          autor_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          processo_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_processo_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      envolvidos_bo: {
        Row: {
          bo_id: string
          created_at: string
          id: string
          id_personagem: string | null
          nome: string
          observacoes: string | null
          tipo: string
        }
        Insert: {
          bo_id: string
          created_at?: string
          id?: string
          id_personagem?: string | null
          nome: string
          observacoes?: string | null
          tipo?: string
        }
        Update: {
          bo_id?: string
          created_at?: string
          id?: string
          id_personagem?: string | null
          nome?: string
          observacoes?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "envolvidos_bo_bo_id_fkey"
            columns: ["bo_id"]
            isOneToOne: false
            referencedRelation: "boletins_ocorrencia"
            referencedColumns: ["id"]
          },
        ]
      }
      envolvidos_inquerito: {
        Row: {
          created_at: string
          id: string
          id_personagem: string | null
          inquerito_id: string
          nome: string
          observacoes: string | null
          qualificacao: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          id_personagem?: string | null
          inquerito_id: string
          nome: string
          observacoes?: string | null
          qualificacao?: string | null
          tipo?: string
        }
        Update: {
          created_at?: string
          id?: string
          id_personagem?: string | null
          inquerito_id?: string
          nome?: string
          observacoes?: string | null
          qualificacao?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "envolvidos_inquerito_inquerito_id_fkey"
            columns: ["inquerito_id"]
            isOneToOne: false
            referencedRelation: "inqueritos"
            referencedColumns: ["id"]
          },
        ]
      }
      honorarios_tabela: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          tipo_atuacao: string
          valor_minimo: number
          valor_sugerido: number | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          tipo_atuacao: string
          valor_minimo?: number
          valor_sugerido?: number | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          tipo_atuacao?: string
          valor_minimo?: number
          valor_sugerido?: number | null
        }
        Relationships: []
      }
      inqueritos: {
        Row: {
          bo_id: string | null
          created_at: string
          data_conclusao: string | null
          data_instauracao: string
          delegado_id: string | null
          descricao: string
          id: string
          numero: string
          relatorio_final: string | null
          remetido_mp: boolean
          sigilo: boolean
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          bo_id?: string | null
          created_at?: string
          data_conclusao?: string | null
          data_instauracao?: string
          delegado_id?: string | null
          descricao: string
          id?: string
          numero: string
          relatorio_final?: string | null
          remetido_mp?: boolean
          sigilo?: boolean
          status?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          bo_id?: string | null
          created_at?: string
          data_conclusao?: string | null
          data_instauracao?: string
          delegado_id?: string | null
          descricao?: string
          id?: string
          numero?: string
          relatorio_final?: string | null
          remetido_mp?: boolean
          sigilo?: boolean
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inqueritos_bo_id_fkey"
            columns: ["bo_id"]
            isOneToOne: false
            referencedRelation: "boletins_ocorrencia"
            referencedColumns: ["id"]
          },
        ]
      }
      inscricoes_concurso: {
        Row: {
          classificacao: number | null
          concurso_id: string
          created_at: string
          id: string
          id_personagem: string | null
          nome_completo: string
          nota_discursiva: number | null
          nota_final: number | null
          nota_objetiva: number | null
          numero_inscricao: string
          presente: boolean | null
          status: string
          user_id: string
        }
        Insert: {
          classificacao?: number | null
          concurso_id: string
          created_at?: string
          id?: string
          id_personagem?: string | null
          nome_completo: string
          nota_discursiva?: number | null
          nota_final?: number | null
          nota_objetiva?: number | null
          numero_inscricao?: string
          presente?: boolean | null
          status?: string
          user_id: string
        }
        Update: {
          classificacao?: number | null
          concurso_id?: string
          created_at?: string
          id?: string
          id_personagem?: string | null
          nome_completo?: string
          nota_discursiva?: number | null
          nota_final?: number | null
          nota_objetiva?: number | null
          numero_inscricao?: string
          presente?: boolean | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inscricoes_concurso_concurso_id_fkey"
            columns: ["concurso_id"]
            isOneToOne: false
            referencedRelation: "concursos"
            referencedColumns: ["id"]
          },
        ]
      }
      inscricoes_oab: {
        Row: {
          aprovado_por: string | null
          created_at: string
          email: string | null
          especialidade: string | null
          id: string
          id_personagem: string | null
          justificativa: string | null
          motivo_indeferimento: string | null
          nome_completo: string
          status: string
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aprovado_por?: string | null
          created_at?: string
          email?: string | null
          especialidade?: string | null
          id?: string
          id_personagem?: string | null
          justificativa?: string | null
          motivo_indeferimento?: string | null
          nome_completo: string
          status?: string
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aprovado_por?: string | null
          created_at?: string
          email?: string | null
          especialidade?: string | null
          id?: string
          id_personagem?: string | null
          justificativa?: string | null
          motivo_indeferimento?: string | null
          nome_completo?: string
          status?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      intimacoes: {
        Row: {
          conteudo: string
          created_at: string
          data_envio: string
          data_leitura: string | null
          data_limite: string | null
          destinatario_id: string | null
          destinatario_nome: string
          id: string
          prazo_dias: number
          processo_id: string
          status: string
          tipo: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          data_envio?: string
          data_leitura?: string | null
          data_limite?: string | null
          destinatario_id?: string | null
          destinatario_nome: string
          id?: string
          prazo_dias?: number
          processo_id: string
          status?: string
          tipo?: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          data_envio?: string
          data_leitura?: string | null
          data_limite?: string | null
          destinatario_id?: string | null
          destinatario_nome?: string
          id?: string
          prazo_dias?: number
          processo_id?: string
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "intimacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      mandados: {
        Row: {
          created_at: string
          cumprido_em: string | null
          cumprido_por: string | null
          descricao: string
          destinatario_nome: string
          id: string
          magistrado_id: string
          observacoes: string | null
          processo_id: string
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cumprido_em?: string | null
          cumprido_por?: string | null
          descricao: string
          destinatario_nome: string
          id?: string
          magistrado_id: string
          observacoes?: string | null
          processo_id: string
          status?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cumprido_em?: string | null
          cumprido_por?: string | null
          descricao?: string
          destinatario_nome?: string
          id?: string
          magistrado_id?: string
          observacoes?: string | null
          processo_id?: string
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mandados_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
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
      notificacoes: {
        Row: {
          created_at: string
          id: string
          lida: boolean
          link_secao: string | null
          mensagem: string
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lida?: boolean
          link_secao?: string | null
          mensagem: string
          tipo?: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lida?: boolean
          link_secao?: string | null
          mensagem?: string
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      oitivas: {
        Row: {
          conteudo: string
          created_at: string
          envolvido_id: string | null
          id: string
          inquerito_id: string
          nome_depoente: string
          registrado_por: string | null
          tipo: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          envolvido_id?: string | null
          id?: string
          inquerito_id: string
          nome_depoente: string
          registrado_por?: string | null
          tipo?: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          envolvido_id?: string | null
          id?: string
          inquerito_id?: string
          nome_depoente?: string
          registrado_por?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "oitivas_envolvido_id_fkey"
            columns: ["envolvido_id"]
            isOneToOne: false
            referencedRelation: "envolvidos_inquerito"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oitivas_inquerito_id_fkey"
            columns: ["inquerito_id"]
            isOneToOne: false
            referencedRelation: "inqueritos"
            referencedColumns: ["id"]
          },
        ]
      }
      pareceres_mp: {
        Row: {
          conteudo: string
          created_at: string
          id: string
          processo_id: string
          promotor_id: string
          tipo: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          id?: string
          processo_id: string
          promotor_id: string
          tipo?: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          id?: string
          processo_id?: string
          promotor_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "pareceres_mp_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      prazos_processuais: {
        Row: {
          created_at: string
          data_fim: string
          data_inicio: string
          descricao: string
          dias_uteis: number
          id: string
          processo_id: string
          responsavel_id: string | null
          status: string
          tipo: string
        }
        Insert: {
          created_at?: string
          data_fim: string
          data_inicio?: string
          descricao: string
          dias_uteis?: number
          id?: string
          processo_id: string
          responsavel_id?: string | null
          status?: string
          tipo?: string
        }
        Update: {
          created_at?: string
          data_fim?: string
          data_inicio?: string
          descricao?: string
          dias_uteis?: number
          id?: string
          processo_id?: string
          responsavel_id?: string | null
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "prazos_processuais_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      procedimentos_disciplinares: {
        Row: {
          advogado_user_id: string
          created_at: string
          denunciante_id: string | null
          descricao: string
          id: string
          parecer: string | null
          sancao: string | null
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          advogado_user_id: string
          created_at?: string
          denunciante_id?: string | null
          descricao: string
          id?: string
          parecer?: string | null
          sancao?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          advogado_user_id?: string
          created_at?: string
          denunciante_id?: string | null
          descricao?: string
          id?: string
          parecer?: string | null
          sancao?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
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
          discord: string | null
          id: string
          id_personagem: string | null
          nome_completo: string
          oab_numero: string | null
          telefone_ingame: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          discord?: string | null
          id?: string
          id_personagem?: string | null
          nome_completo: string
          oab_numero?: string | null
          telefone_ingame?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          discord?: string | null
          id?: string
          id_personagem?: string | null
          nome_completo?: string
          oab_numero?: string | null
          telefone_ingame?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      protocolos: {
        Row: {
          created_at: string
          descricao: string
          documento_url: string | null
          id: string
          numero: string
          processo_id: string | null
          remetente_id: string | null
          remetente_nome: string
          tipo: string
        }
        Insert: {
          created_at?: string
          descricao: string
          documento_url?: string | null
          id?: string
          numero?: string
          processo_id?: string | null
          remetente_id?: string | null
          remetente_nome: string
          tipo?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          documento_url?: string | null
          id?: string
          numero?: string
          processo_id?: string | null
          remetente_id?: string | null
          remetente_nome?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocolos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      questoes_concurso: {
        Row: {
          alternativa_a: string | null
          alternativa_b: string | null
          alternativa_c: string | null
          alternativa_d: string | null
          concurso_id: string
          created_at: string
          enunciado: string
          gabarito: string | null
          id: string
          numero: number
          peso: number
          tipo: string
        }
        Insert: {
          alternativa_a?: string | null
          alternativa_b?: string | null
          alternativa_c?: string | null
          alternativa_d?: string | null
          concurso_id: string
          created_at?: string
          enunciado: string
          gabarito?: string | null
          id?: string
          numero?: number
          peso?: number
          tipo?: string
        }
        Update: {
          alternativa_a?: string | null
          alternativa_b?: string | null
          alternativa_c?: string | null
          alternativa_d?: string | null
          concurso_id?: string
          created_at?: string
          enunciado?: string
          gabarito?: string | null
          id?: string
          numero?: number
          peso?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "questoes_concurso_concurso_id_fkey"
            columns: ["concurso_id"]
            isOneToOne: false
            referencedRelation: "concursos"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_cartorio: {
        Row: {
          created_at: string
          descricao: string
          documento_url: string | null
          emitido_por: string | null
          emitido_por_nome: string | null
          id: string
          id_personagem: string | null
          numero_registro: string
          observacoes: string | null
          partes_envolvidas: string | null
          requerente_id: string | null
          requerente_nome: string
          status: string
          subtipo: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao: string
          documento_url?: string | null
          emitido_por?: string | null
          emitido_por_nome?: string | null
          id?: string
          id_personagem?: string | null
          numero_registro?: string
          observacoes?: string | null
          partes_envolvidas?: string | null
          requerente_id?: string | null
          requerente_nome: string
          status?: string
          subtipo?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          documento_url?: string | null
          emitido_por?: string | null
          emitido_por_nome?: string | null
          id?: string
          id_personagem?: string | null
          numero_registro?: string
          observacoes?: string | null
          partes_envolvidas?: string | null
          requerente_id?: string | null
          requerente_nome?: string
          status?: string
          subtipo?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      requisicoes_diligencia_mp: {
        Row: {
          created_at: string
          descricao: string
          id: string
          inquerito_id: string
          prazo_dias: number
          promotor_id: string
          resposta: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          inquerito_id: string
          prazo_dias?: number
          promotor_id: string
          resposta?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          inquerito_id?: string
          prazo_dias?: number
          promotor_id?: string
          resposta?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requisicoes_diligencia_mp_inquerito_id_fkey"
            columns: ["inquerito_id"]
            isOneToOne: false
            referencedRelation: "inqueritos"
            referencedColumns: ["id"]
          },
        ]
      }
      respostas_concurso: {
        Row: {
          correta: boolean | null
          created_at: string
          id: string
          inscricao_id: string
          nota: number | null
          questao_id: string
          resposta: string | null
        }
        Insert: {
          correta?: boolean | null
          created_at?: string
          id?: string
          inscricao_id: string
          nota?: number | null
          questao_id: string
          resposta?: string | null
        }
        Update: {
          correta?: boolean | null
          created_at?: string
          id?: string
          inscricao_id?: string
          nota?: number | null
          questao_id?: string
          resposta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "respostas_concurso_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "inscricoes_concurso"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_concurso_questao_id_fkey"
            columns: ["questao_id"]
            isOneToOne: false
            referencedRelation: "questoes_concurso"
            referencedColumns: ["id"]
          },
        ]
      }
      sentencas: {
        Row: {
          assinado: boolean
          created_at: string
          data_publicacao: string | null
          dispositivo: string
          ementa: string | null
          fundamentacao: string
          id: string
          magistrado_id: string
          processo_id: string
          tipo: string
        }
        Insert: {
          assinado?: boolean
          created_at?: string
          data_publicacao?: string | null
          dispositivo: string
          ementa?: string | null
          fundamentacao: string
          id?: string
          magistrado_id: string
          processo_id: string
          tipo?: string
        }
        Update: {
          assinado?: boolean
          created_at?: string
          data_publicacao?: string | null
          dispositivo?: string
          ementa?: string | null
          fundamentacao?: string
          id?: string
          magistrado_id?: string
          processo_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "sentencas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
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
      sortear_magistrado: { Args: never; Returns: string }
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
        | "presidente_tribunal"
        | "desembargador"
        | "investigador"
        | "presidente_oab"
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
        "presidente_tribunal",
        "desembargador",
        "investigador",
        "presidente_oab",
      ],
    },
  },
} as const
