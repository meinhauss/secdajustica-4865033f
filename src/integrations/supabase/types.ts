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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      acoes_pendentes: {
        Row: {
          analista_id: string
          analista_nome: string | null
          created_at: string
          decidido_em: string | null
          descricao: string | null
          erro: string | null
          filtros: Json
          grupo_id: string | null
          id: string
          motivo: string | null
          operacao: string
          payload: Json | null
          status: string
          supervisor_id: string
          tabela: string
          updated_at: string
        }
        Insert: {
          analista_id: string
          analista_nome?: string | null
          created_at?: string
          decidido_em?: string | null
          descricao?: string | null
          erro?: string | null
          filtros?: Json
          grupo_id?: string | null
          id?: string
          motivo?: string | null
          operacao: string
          payload?: Json | null
          status?: string
          supervisor_id: string
          tabela: string
          updated_at?: string
        }
        Update: {
          analista_id?: string
          analista_nome?: string | null
          created_at?: string
          decidido_em?: string | null
          descricao?: string | null
          erro?: string | null
          filtros?: Json
          grupo_id?: string | null
          id?: string
          motivo?: string | null
          operacao?: string
          payload?: Json | null
          status?: string
          supervisor_id?: string
          tabela?: string
          updated_at?: string
        }
        Relationships: []
      }
      analista_vinculos: {
        Row: {
          analista_id: string
          created_at: string
          created_by: string | null
          id: string
          supervisor_id: string
        }
        Insert: {
          analista_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          supervisor_id: string
        }
        Update: {
          analista_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          supervisor_id?: string
        }
        Relationships: []
      }
      apelacoes: {
        Row: {
          apelante_id: string | null
          apelante_nome: string
          apelante_tipo: string
          created_at: string
          data_distribuicao: string | null
          data_julgamento: string | null
          decisao_dispositivo: string | null
          decisao_fundamentacao: string | null
          decisao_tipo: string | null
          desembargador_id: string | null
          destaque_justificativa: string | null
          destaque_solicitado: boolean
          destaque_solicitado_em: string | null
          destaque_solicitante_id: string | null
          destaque_solicitante_nome: string | null
          destaque_solicitante_qualificacao: string | null
          fundamentacao: string
          id: string
          numero_acordao: string | null
          pedido: string
          processo_id: string
          razoes_admissao: string | null
          razoes_inadmissao: string | null
          sentenca_id: string
          status: string
          updated_at: string
        }
        Insert: {
          apelante_id?: string | null
          apelante_nome: string
          apelante_tipo?: string
          created_at?: string
          data_distribuicao?: string | null
          data_julgamento?: string | null
          decisao_dispositivo?: string | null
          decisao_fundamentacao?: string | null
          decisao_tipo?: string | null
          desembargador_id?: string | null
          destaque_justificativa?: string | null
          destaque_solicitado?: boolean
          destaque_solicitado_em?: string | null
          destaque_solicitante_id?: string | null
          destaque_solicitante_nome?: string | null
          destaque_solicitante_qualificacao?: string | null
          fundamentacao: string
          id?: string
          numero_acordao?: string | null
          pedido: string
          processo_id: string
          razoes_admissao?: string | null
          razoes_inadmissao?: string | null
          sentenca_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          apelante_id?: string | null
          apelante_nome?: string
          apelante_tipo?: string
          created_at?: string
          data_distribuicao?: string | null
          data_julgamento?: string | null
          decisao_dispositivo?: string | null
          decisao_fundamentacao?: string | null
          decisao_tipo?: string | null
          desembargador_id?: string | null
          destaque_justificativa?: string | null
          destaque_solicitado?: boolean
          destaque_solicitado_em?: string | null
          destaque_solicitante_id?: string | null
          destaque_solicitante_nome?: string | null
          destaque_solicitante_qualificacao?: string | null
          fundamentacao?: string
          id?: string
          numero_acordao?: string | null
          pedido?: string
          processo_id?: string
          razoes_admissao?: string | null
          razoes_inadmissao?: string | null
          sentenca_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apelacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apelacoes_sentenca_id_fkey"
            columns: ["sentenca_id"]
            isOneToOne: false
            referencedRelation: "sentencas"
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
          ata: string | null
          created_at: string
          criado_por: string | null
          data_hora: string
          id: string
          local: string | null
          observacoes: string | null
          processo_id: string | null
          status: string
          tipo: string
        }
        Insert: {
          ata?: string | null
          created_at?: string
          criado_por?: string | null
          data_hora: string
          id?: string
          local?: string | null
          observacoes?: string | null
          processo_id?: string | null
          status?: string
          tipo?: string
        }
        Update: {
          ata?: string | null
          created_at?: string
          criado_por?: string | null
          data_hora?: string
          id?: string
          local?: string | null
          observacoes?: string | null
          processo_id?: string | null
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
          numero: string | null
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
          numero?: string | null
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
          numero?: string | null
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
          data_fim_prova: string | null
          data_inicio_prova: string | null
          data_prova: string | null
          data_resultado: string | null
          edital_url: string | null
          id: string
          regras_classificacao: string | null
          requisitos: string | null
          status: string
          tempo_prova_minutos: number | null
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
          data_fim_prova?: string | null
          data_inicio_prova?: string | null
          data_prova?: string | null
          data_resultado?: string | null
          edital_url?: string | null
          id?: string
          regras_classificacao?: string | null
          requisitos?: string | null
          status?: string
          tempo_prova_minutos?: number | null
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
          data_fim_prova?: string | null
          data_inicio_prova?: string | null
          data_prova?: string | null
          data_resultado?: string | null
          edital_url?: string | null
          id?: string
          regras_classificacao?: string | null
          requisitos?: string | null
          status?: string
          tempo_prova_minutos?: number | null
          titulo?: string
          updated_at?: string
          vagas?: number
        }
        Relationships: []
      }
      config_sistema: {
        Row: {
          chave: string
          updated_at: string
          valor: string | null
        }
        Insert: {
          chave: string
          updated_at?: string
          valor?: string | null
        }
        Update: {
          chave?: string
          updated_at?: string
          valor?: string | null
        }
        Relationships: []
      }
      convocacoes_jurados: {
        Row: {
          convocado_por: string | null
          created_at: string
          data_sessao: string
          id: string
          local: string | null
          observacoes: string | null
          processo_id: string
          quantidade: number
        }
        Insert: {
          convocado_por?: string | null
          created_at?: string
          data_sessao: string
          id?: string
          local?: string | null
          observacoes?: string | null
          processo_id: string
          quantidade?: number
        }
        Update: {
          convocado_por?: string | null
          created_at?: string
          data_sessao?: string
          id?: string
          local?: string | null
          observacoes?: string | null
          processo_id?: string
          quantidade?: number
        }
        Relationships: []
      }
      corregedoria_movimentacoes: {
        Row: {
          autor_id: string | null
          autor_nome: string | null
          created_at: string
          denuncia_id: string
          id: string
          texto: string
          tipo: string
        }
        Insert: {
          autor_id?: string | null
          autor_nome?: string | null
          created_at?: string
          denuncia_id: string
          id?: string
          texto: string
          tipo: string
        }
        Update: {
          autor_id?: string | null
          autor_nome?: string | null
          created_at?: string
          denuncia_id?: string
          id?: string
          texto?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "corregedoria_movimentacoes_denuncia_id_fkey"
            columns: ["denuncia_id"]
            isOneToOne: false
            referencedRelation: "denuncias_ouvidoria"
            referencedColumns: ["id"]
          },
        ]
      }
      denuncias_ouvidoria: {
        Row: {
          contato_denunciante: string | null
          contra_membro: boolean
          corregedoria_atualizado_em: string | null
          corregedoria_decisao: string | null
          corregedoria_motivo: string | null
          corregedoria_responsavel_id: string | null
          corregedoria_status: string | null
          created_at: string
          defesa_em: string | null
          defesa_prazo: string | null
          defesa_texto: string | null
          denunciado_cargos: string[] | null
          denunciado_id_personagem: string | null
          denunciado_nome: string | null
          denunciado_user_id: string | null
          descricao: string
          encaminhada_mp: boolean
          envolvidos: Json | null
          id: string
          indicio_crime: boolean
          links: Json | null
          nome_denunciante: string | null
          orgao_corregedoria: string | null
          status: string
        }
        Insert: {
          contato_denunciante?: string | null
          contra_membro?: boolean
          corregedoria_atualizado_em?: string | null
          corregedoria_decisao?: string | null
          corregedoria_motivo?: string | null
          corregedoria_responsavel_id?: string | null
          corregedoria_status?: string | null
          created_at?: string
          defesa_em?: string | null
          defesa_prazo?: string | null
          defesa_texto?: string | null
          denunciado_cargos?: string[] | null
          denunciado_id_personagem?: string | null
          denunciado_nome?: string | null
          denunciado_user_id?: string | null
          descricao: string
          encaminhada_mp?: boolean
          envolvidos?: Json | null
          id?: string
          indicio_crime?: boolean
          links?: Json | null
          nome_denunciante?: string | null
          orgao_corregedoria?: string | null
          status?: string
        }
        Update: {
          contato_denunciante?: string | null
          contra_membro?: boolean
          corregedoria_atualizado_em?: string | null
          corregedoria_decisao?: string | null
          corregedoria_motivo?: string | null
          corregedoria_responsavel_id?: string | null
          corregedoria_status?: string | null
          created_at?: string
          defesa_em?: string | null
          defesa_prazo?: string | null
          defesa_texto?: string | null
          denunciado_cargos?: string[] | null
          denunciado_id_personagem?: string | null
          denunciado_nome?: string | null
          denunciado_user_id?: string | null
          descricao?: string
          encaminhada_mp?: boolean
          envolvidos?: Json | null
          id?: string
          indicio_crime?: boolean
          links?: Json | null
          nome_denunciante?: string | null
          orgao_corregedoria?: string | null
          status?: string
        }
        Relationships: []
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
      embargos_declaracao: {
        Row: {
          created_at: string
          decidido_por: string | null
          decisao: string | null
          embargante_id: string | null
          embargante_nome: string
          fundamentacao: string
          id: string
          pedido: string
          processo_id: string
          sentenca_id: string
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          decidido_por?: string | null
          decisao?: string | null
          embargante_id?: string | null
          embargante_nome: string
          fundamentacao: string
          id?: string
          pedido: string
          processo_id: string
          sentenca_id: string
          status?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          decidido_por?: string | null
          decisao?: string | null
          embargante_id?: string | null
          embargante_nome?: string
          fundamentacao?: string
          id?: string
          pedido?: string
          processo_id?: string
          sentenca_id?: string
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "embargos_declaracao_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embargos_declaracao_sentenca_id_fkey"
            columns: ["sentenca_id"]
            isOneToOne: false
            referencedRelation: "sentencas"
            referencedColumns: ["id"]
          },
        ]
      }
      envolvidos_audiencia: {
        Row: {
          audiencia_id: string
          created_at: string
          id: string
          id_personagem: string | null
          nome: string
          observacoes: string | null
          tipo: string
        }
        Insert: {
          audiencia_id: string
          created_at?: string
          id?: string
          id_personagem?: string | null
          nome: string
          observacoes?: string | null
          tipo?: string
        }
        Update: {
          audiencia_id?: string
          created_at?: string
          id?: string
          id_personagem?: string | null
          nome?: string
          observacoes?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "envolvidos_audiencia_audiencia_id_fkey"
            columns: ["audiencia_id"]
            isOneToOne: false
            referencedRelation: "audiencias"
            referencedColumns: ["id"]
          },
        ]
      }
      envolvidos_tco: {
        Row: {
          created_at: string
          id: string
          id_personagem: string | null
          nome: string
          observacoes: string | null
          qualificacao: string | null
          tco_id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          id_personagem?: string | null
          nome: string
          observacoes?: string | null
          qualificacao?: string | null
          tco_id: string
          tipo?: string
        }
        Update: {
          created_at?: string
          id?: string
          id_personagem?: string | null
          nome?: string
          observacoes?: string | null
          qualificacao?: string | null
          tco_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "envolvidos_tco_tco_id_fkey"
            columns: ["tco_id"]
            isOneToOne: false
            referencedRelation: "tcos"
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
          prova_iniciada_em: string | null
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
          prova_iniciada_em?: string | null
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
          prova_iniciada_em?: string | null
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
      inscricoes_unisp: {
        Row: {
          area_interesse: string
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          id_personagem: string | null
          motivacao: string
          nome_completo: string
          status: string
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area_interesse?: string
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          id_personagem?: string | null
          motivacao: string
          nome_completo: string
          status?: string
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area_interesse?: string
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          id_personagem?: string | null
          motivacao?: string
          nome_completo?: string
          status?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interessados_processo: {
        Row: {
          created_at: string
          id: string
          orgao: string
          processo_id: string
          qualificacao: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          orgao: string
          processo_id: string
          qualificacao?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          orgao?: string
          processo_id?: string
          qualificacao?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interessados_processo_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      intimacoes: {
        Row: {
          cargo_intimado: string | null
          conteudo: string
          created_at: string
          data_envio: string
          data_leitura: string | null
          data_limite: string | null
          destinatario_discord_id: string | null
          destinatario_id: string | null
          destinatario_id_personagem: string | null
          destinatario_nome: string
          id: string
          prazo_dias: number
          processo_id: string
          status: string
          tipo: string
        }
        Insert: {
          cargo_intimado?: string | null
          conteudo: string
          created_at?: string
          data_envio?: string
          data_leitura?: string | null
          data_limite?: string | null
          destinatario_discord_id?: string | null
          destinatario_id?: string | null
          destinatario_id_personagem?: string | null
          destinatario_nome: string
          id?: string
          prazo_dias?: number
          processo_id: string
          status?: string
          tipo?: string
        }
        Update: {
          cargo_intimado?: string | null
          conteudo?: string
          created_at?: string
          data_envio?: string
          data_leitura?: string | null
          data_limite?: string | null
          destinatario_discord_id?: string | null
          destinatario_id?: string | null
          destinatario_id_personagem?: string | null
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
      jurados: {
        Row: {
          created_at: string
          disponibilidade: string
          id: string
          id_personagem: string | null
          nome_completo: string
          observacoes: string | null
          profissao: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          disponibilidade?: string
          id?: string
          id_personagem?: string | null
          nome_completo: string
          observacoes?: string | null
          profissao?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          disponibilidade?: string
          id?: string
          id_personagem?: string | null
          nome_completo?: string
          observacoes?: string | null
          profissao?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      jurados_convocados: {
        Row: {
          convocacao_id: string
          created_at: string
          id: string
          intimacao_id: string | null
          jurado_id: string
        }
        Insert: {
          convocacao_id: string
          created_at?: string
          id?: string
          intimacao_id?: string | null
          jurado_id: string
        }
        Update: {
          convocacao_id?: string
          created_at?: string
          id?: string
          intimacao_id?: string | null
          jurado_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jurados_convocados_convocacao_id_fkey"
            columns: ["convocacao_id"]
            isOneToOne: false
            referencedRelation: "convocacoes_jurados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jurados_convocados_jurado_id_fkey"
            columns: ["jurado_id"]
            isOneToOne: false
            referencedRelation: "jurados"
            referencedColumns: ["id"]
          },
        ]
      }
      jurisprudencias: {
        Row: {
          apelacao_id: string | null
          assunto: string | null
          classe: string | null
          created_at: string
          data_julgamento: string | null
          decisao_dispositivo: string | null
          decisao_fundamentacao: string | null
          decisao_tipo: string
          desembargador_id: string | null
          desembargador_nome: string | null
          ementa: string
          id: string
          numero_acordao: string
          origem: string
          processo_id: string | null
          sessao_descricao: string | null
          tags: string[] | null
        }
        Insert: {
          apelacao_id?: string | null
          assunto?: string | null
          classe?: string | null
          created_at?: string
          data_julgamento?: string | null
          decisao_dispositivo?: string | null
          decisao_fundamentacao?: string | null
          decisao_tipo: string
          desembargador_id?: string | null
          desembargador_nome?: string | null
          ementa: string
          id?: string
          numero_acordao: string
          origem?: string
          processo_id?: string | null
          sessao_descricao?: string | null
          tags?: string[] | null
        }
        Update: {
          apelacao_id?: string | null
          assunto?: string | null
          classe?: string | null
          created_at?: string
          data_julgamento?: string | null
          decisao_dispositivo?: string | null
          decisao_fundamentacao?: string | null
          decisao_tipo?: string
          desembargador_id?: string | null
          desembargador_nome?: string | null
          ementa?: string
          id?: string
          numero_acordao?: string
          origem?: string
          processo_id?: string | null
          sessao_descricao?: string | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "jurisprudencias_apelacao_id_fkey"
            columns: ["apelacao_id"]
            isOneToOne: false
            referencedRelation: "apelacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jurisprudencias_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      leis_municipais: {
        Row: {
          categoria: string
          conteudo: string
          created_at: string
          created_by: string | null
          data_vigencia: string | null
          ementa: string | null
          id: string
          numero: string
          revogada: boolean
          titulo: string
          updated_at: string
        }
        Insert: {
          categoria?: string
          conteudo: string
          created_at?: string
          created_by?: string | null
          data_vigencia?: string | null
          ementa?: string | null
          id?: string
          numero: string
          revogada?: boolean
          titulo: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          conteudo?: string
          created_at?: string
          created_by?: string | null
          data_vigencia?: string | null
          ementa?: string | null
          id?: string
          numero?: string
          revogada?: boolean
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      mandados: {
        Row: {
          created_at: string
          cumprido_em: string | null
          cumprido_por: string | null
          descricao: string
          destinatario_nome: string
          id: string
          magistrado_id: string | null
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
          magistrado_id?: string | null
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
          magistrado_id?: string | null
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
      modelos_documentos: {
        Row: {
          cargos: string[]
          categoria: string
          conteudo: string
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          cargos?: string[]
          categoria: string
          conteudo: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          cargos?: string[]
          categoria?: string
          conteudo?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      modelos_favoritos: {
        Row: {
          categoria: string | null
          conteudo: string
          created_at: string
          descricao: string | null
          id: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria?: string | null
          conteudo: string
          created_at?: string
          descricao?: string | null
          id?: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria?: string | null
          conteudo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          titulo?: string
          updated_at?: string
          user_id?: string
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
      outorga_regras: {
        Row: {
          cargo: Database["public"]["Enums"]["user_role"]
          created_at: string
          id: string
          outorgante: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          cargo: Database["public"]["Enums"]["user_role"]
          created_at?: string
          id?: string
          outorgante: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          cargo?: Database["public"]["Enums"]["user_role"]
          created_at?: string
          id?: string
          outorgante?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
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
          advogado_user_id: string | null
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
          advogado_user_id?: string | null
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
          advogado_user_id?: string | null
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
          autor_label: string | null
          autor_nome: string
          classe: Database["public"]["Enums"]["classe_processual"]
          classe_originaria: string | null
          created_at: string
          descricao: string | null
          id: string
          instancia: number
          juiz_id: string | null
          numero: string
          orgao_julgador: string | null
          pedido: string | null
          prioridade: boolean | null
          relator_id: string | null
          reu_label: string | null
          reu_nome: string
          sigilo: string
          status: Database["public"]["Enums"]["processo_status"]
          updated_at: string
          valor_causa: number | null
          vara: string | null
        }
        Insert: {
          advogado_autor_id?: string | null
          advogado_reu_id?: string | null
          assunto: string
          autor_label?: string | null
          autor_nome: string
          classe?: Database["public"]["Enums"]["classe_processual"]
          classe_originaria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          instancia?: number
          juiz_id?: string | null
          numero: string
          orgao_julgador?: string | null
          pedido?: string | null
          prioridade?: boolean | null
          relator_id?: string | null
          reu_label?: string | null
          reu_nome: string
          sigilo?: string
          status?: Database["public"]["Enums"]["processo_status"]
          updated_at?: string
          valor_causa?: number | null
          vara?: string | null
        }
        Update: {
          advogado_autor_id?: string | null
          advogado_reu_id?: string | null
          assunto?: string
          autor_label?: string | null
          autor_nome?: string
          classe?: Database["public"]["Enums"]["classe_processual"]
          classe_originaria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          instancia?: number
          juiz_id?: string | null
          numero?: string
          orgao_julgador?: string | null
          pedido?: string | null
          prioridade?: boolean | null
          relator_id?: string | null
          reu_label?: string | null
          reu_nome?: string
          sigilo?: string
          status?: Database["public"]["Enums"]["processo_status"]
          updated_at?: string
          valor_causa?: number | null
          vara?: string | null
        }
        Relationships: []
      }
      procuracoes: {
        Row: {
          advogado_id: string | null
          advogado_nome: string
          created_at: string
          documento_url: string | null
          id: string
          motivo_renuncia: string | null
          parte: string
          processo_id: string
          renunciada_em: string | null
          status: string
          updated_at: string
        }
        Insert: {
          advogado_id?: string | null
          advogado_nome: string
          created_at?: string
          documento_url?: string | null
          id?: string
          motivo_renuncia?: string | null
          parte?: string
          processo_id: string
          renunciada_em?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          advogado_id?: string | null
          advogado_nome?: string
          created_at?: string
          documento_url?: string | null
          id?: string
          motivo_renuncia?: string | null
          parte?: string
          processo_id?: string
          renunciada_em?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procuracoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cargo: string | null
          cpf: string | null
          created_at: string
          discord: string | null
          discord_dm_enabled: boolean
          discord_user_id: string | null
          id: string
          id_personagem: string | null
          nome_completo: string
          oab_numero: string | null
          precisa_atualizar_cadastro: boolean
          recesso: boolean
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
          discord_dm_enabled?: boolean
          discord_user_id?: string | null
          id?: string
          id_personagem?: string | null
          nome_completo: string
          oab_numero?: string | null
          precisa_atualizar_cadastro?: boolean
          recesso?: boolean
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
          discord_dm_enabled?: boolean
          discord_user_id?: string | null
          id?: string
          id_personagem?: string | null
          nome_completo?: string
          oab_numero?: string | null
          precisa_atualizar_cadastro?: boolean
          recesso?: boolean
          telefone_ingame?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      ranking_destaques: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          id_personagem: string | null
          nome_completo: string
          posicao: number
          score: number
          semana_fim: string
          semana_inicio: string
          tipo_ranking: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          id_personagem?: string | null
          nome_completo: string
          posicao?: number
          score?: number
          semana_fim: string
          semana_inicio: string
          tipo_ranking: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          id_personagem?: string | null
          nome_completo?: string
          posicao?: number
          score?: number
          semana_fim?: string
          semana_inicio?: string
          tipo_ranking?: string
          user_id?: string
        }
        Relationships: []
      }
      registros_cartorio: {
        Row: {
          created_at: string
          descricao: string
          documento_url: string | null
          emitido_em: string | null
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
          emitido_em?: string | null
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
          emitido_em?: string | null
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
      renuncias_prazo: {
        Row: {
          created_at: string
          id: string
          parte_tipo: string
          processo_id: string
          sentenca_id: string
          user_id: string
          user_nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          parte_tipo: string
          processo_id: string
          sentenca_id: string
          user_id: string
          user_nome: string
        }
        Update: {
          created_at?: string
          id?: string
          parte_tipo?: string
          processo_id?: string
          sentenca_id?: string
          user_id?: string
          user_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "renuncias_prazo_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renuncias_prazo_sentenca_id_fkey"
            columns: ["sentenca_id"]
            isOneToOne: false
            referencedRelation: "sentencas"
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
          anulada: boolean
          anulada_em: string | null
          anulada_por_apelacao_id: string | null
          assinado: boolean
          created_at: string
          data_publicacao: string | null
          dispositivo: string
          ementa: string | null
          fundamentacao: string
          id: string
          magistrado_id: string | null
          processo_id: string
          tipo: string
        }
        Insert: {
          anulada?: boolean
          anulada_em?: string | null
          anulada_por_apelacao_id?: string | null
          assinado?: boolean
          created_at?: string
          data_publicacao?: string | null
          dispositivo: string
          ementa?: string | null
          fundamentacao: string
          id?: string
          magistrado_id?: string | null
          processo_id: string
          tipo?: string
        }
        Update: {
          anulada?: boolean
          anulada_em?: string | null
          anulada_por_apelacao_id?: string | null
          assinado?: boolean
          created_at?: string
          data_publicacao?: string | null
          dispositivo?: string
          ementa?: string | null
          fundamentacao?: string
          id?: string
          magistrado_id?: string | null
          processo_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "sentencas_anulada_por_apelacao_id_fkey"
            columns: ["anulada_por_apelacao_id"]
            isOneToOne: false
            referencedRelation: "apelacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sentencas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      tcos: {
        Row: {
          autor_policial_id: string | null
          autor_policial_nome: string
          compromisso_jecrim: boolean
          created_at: string
          data_compromisso: string | null
          data_fato: string | null
          descricao_fatos: string
          id: string
          links: Json | null
          local_compromisso: string | null
          local_fato: string | null
          natureza_infracao: string
          numero: string
          processo_id: string | null
          relato_bo: string | null
          status: string
          tipificacao_penal: string
          updated_at: string
        }
        Insert: {
          autor_policial_id?: string | null
          autor_policial_nome: string
          compromisso_jecrim?: boolean
          created_at?: string
          data_compromisso?: string | null
          data_fato?: string | null
          descricao_fatos: string
          id?: string
          links?: Json | null
          local_compromisso?: string | null
          local_fato?: string | null
          natureza_infracao: string
          numero?: string
          processo_id?: string | null
          relato_bo?: string | null
          status?: string
          tipificacao_penal?: string
          updated_at?: string
        }
        Update: {
          autor_policial_id?: string | null
          autor_policial_nome?: string
          compromisso_jecrim?: boolean
          created_at?: string
          data_compromisso?: string | null
          data_fato?: string | null
          descricao_fatos?: string
          id?: string
          links?: Json | null
          local_compromisso?: string | null
          local_fato?: string | null
          natureza_infracao?: string
          numero?: string
          processo_id?: string | null
          relato_bo?: string | null
          status?: string
          tipificacao_penal?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tcos_processo_id_fkey"
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
      votos_apelacao: {
        Row: {
          acompanha_voto_id: string | null
          apelacao_id: string
          created_at: string
          decisao_tipo: string | null
          desembargador_id: string
          desembargador_nome: string
          dispositivo: string | null
          fundamentacao: string | null
          id: string
          ressalvas: string | null
          tipo: string
        }
        Insert: {
          acompanha_voto_id?: string | null
          apelacao_id: string
          created_at?: string
          decisao_tipo?: string | null
          desembargador_id: string
          desembargador_nome: string
          dispositivo?: string | null
          fundamentacao?: string | null
          id?: string
          ressalvas?: string | null
          tipo?: string
        }
        Update: {
          acompanha_voto_id?: string | null
          apelacao_id?: string
          created_at?: string
          decisao_tipo?: string | null
          desembargador_id?: string
          desembargador_nome?: string
          dispositivo?: string | null
          fundamentacao?: string | null
          id?: string
          ressalvas?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "votos_apelacao_acompanha_voto_id_fkey"
            columns: ["acompanha_voto_id"]
            isOneToOne: false
            referencedRelation: "votos_apelacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votos_apelacao_apelacao_id_fkey"
            columns: ["apelacao_id"]
            isOneToOne: false
            referencedRelation: "apelacoes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_remove_role: { Args: { p_role_id: string }; Returns: undefined }
      analista_tabelas_aprovacao: { Args: { _uid: string }; Returns: string[] }
      apresentar_defesa_corregedoria: {
        Args: { _id: string; _texto: string }
        Returns: undefined
      }
      buscar_membro_juridico: {
        Args: { _id_personagem: string }
        Returns: {
          cargos: string[]
          nome: string
          orgao: string
        }[]
      }
      can_view_processo: {
        Args: {
          _advogado_autor_id: string
          _advogado_reu_id: string
          _juiz_id: string
          _processo_id: string
          _sigilo: string
          _user_id: string
        }
        Returns: boolean
      }
      certificar_transito_se_expirado: {
        Args: { p_processo_id: string }
        Returns: boolean
      }
      cleanup_cargo_historico: { Args: never; Returns: number }
      cleanup_ranking_destaques: { Args: never; Returns: number }
      cleanup_read_notifications: { Args: never; Returns: number }
      corregedor_instituicoes: { Args: { _uid: string }; Returns: string[] }
      corregedoria_registrar: {
        Args: {
          _d: Database["public"]["Tables"]["denuncias_ouvidoria"]["Row"]
          _texto: string
          _tipo: string
          _titulo: string
        }
        Returns: undefined
      }
      decidir_corregedoria: {
        Args: {
          _acao: string
          _id: string
          _prazo_dias?: number
          _texto: string
        }
        Returns: undefined
      }
      delegado_assign_police_role: {
        Args: {
          p_role: Database["public"]["Enums"]["user_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      delegado_remove_police_role: {
        Args: { p_role_id: string }
        Returns: undefined
      }
      expirar_procuracoes_cartorio: { Args: never; Returns: Json }
      get_advogado_ranking: { Args: never; Returns: Json }
      get_analista_tabelas_aprovacao: { Args: never; Returns: string[] }
      get_last_friday: { Args: never; Returns: string }
      get_magistrado_ranking: { Args: never; Returns: Json }
      get_processo_stats: { Args: never; Returns: Json }
      get_procuracao_publica: {
        Args: { _numero: string }
        Returns: {
          descricao: string
          documento_url: string
          emitido_em: string
          numero_registro: string
          partes_envolvidas: string
          requerente_nome: string
          status: string
        }[]
      }
      get_promotor_ranking: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_advogado_like: { Args: { _uid: string }; Returns: boolean }
      is_analista: { Args: { _uid: string }; Returns: boolean }
      is_involved_cartorio: {
        Args: {
          _partes_envolvidas: string
          _requerente_id: string
          _requerente_nome: string
          _user_id: string
        }
        Returns: boolean
      }
      is_magistrado_role: { Args: { _uid: string }; Returns: boolean }
      is_postulante_role: { Args: { _uid: string }; Returns: boolean }
      is_servidor_judiciario: { Args: { _uid: string }; Returns: boolean }
      is_staff_processual: { Args: { _uid: string }; Returns: boolean }
      marcar_intimacoes_lidas: {
        Args: { _processo_id: string }
        Returns: number
      }
      minhas_representacoes: {
        Args: never
        Returns: {
          corregedoria_decisao: string
          corregedoria_motivo: string
          corregedoria_status: string
          created_at: string
          defesa_em: string
          defesa_prazo: string
          defesa_texto: string
          descricao: string
          id: string
          orgao_corregedoria: string
        }[]
      }
      notificar_audiencia: { Args: { _audiencia_id: string }; Returns: number }
      notificar_lembrete_prova_concurso: { Args: never; Returns: undefined }
      notificar_prazos_proximos: { Args: never; Returns: undefined }
      notify_cargo_intimacao: {
        Args: {
          _autor_id: string
          _cargo: Database["public"]["Enums"]["user_role"]
          _conteudo: string
          _processo_id: string
        }
        Returns: undefined
      }
      notify_concurso_evento: {
        Args: {
          _link_secao?: string
          _mensagem: string
          _tipo?: string
          _titulo: string
          _user_id: string
        }
        Returns: string
      }
      orgao_do_membro: { Args: { _uid: string }; Returns: string }
      pode_atuar_processo: {
        Args: { _processo_id: string; _uid: string }
        Returns: boolean
      }
      pode_corregedoria: {
        Args: { _orgao: string; _uid: string }
        Returns: boolean
      }
      pode_gerir_concurso_analista: {
        Args: { _concurso_id: string }
        Returns: boolean
      }
      pode_gerir_concurso_defensoria: {
        Args: { _concurso_id: string }
        Returns: boolean
      }
      pode_outorgar: {
        Args: { _cargo: Database["public"]["Enums"]["user_role"]; _uid: string }
        Returns: boolean
      }
      pode_ver_corregedoria: {
        Args: { _denuncia_id: string; _uid: string }
        Returns: boolean
      }
      redistribuir_por_suspeicao: {
        Args: { _justificativa: string; _processo_id: string }
        Returns: string
      }
      redistribuir_processo_admin: {
        Args: {
          _justificativa?: string
          _metodo?: string
          _novo_responsavel_id?: string
          _processo_id: string
        }
        Returns: string
      }
      sortear_desembargador: { Args: never; Returns: string }
      sortear_jurados: {
        Args: {
          _data_sessao: string
          _local?: string
          _observacoes?: string
          _processo_id: string
          _quantidade?: number
        }
        Returns: string
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
        | "prescrito"
      user_role:
        | "admin"
        | "magistrado"
        | "ministerio_publico"
        | "policia_civil"
        | "oficial_justica"
        | "advogado"
        | "cidadao"
        | "presidente_tribunal"
        | "desembargador"
        | "investigador"
        | "presidente_oab"
        | "procurador_geral"
        | "bacharel_direito"
        | "policia_militar"
        | "policia_federal"
        | "hospital"
        | "procurador_estado"
        | "delegado"
        | "detran"
        | "gaeco"
        | "chefe_gaeco"
        | "defensor_publico_geral"
        | "defensor_publico"
        | "corregedor"
        | "analista"
        | "procurador_geral_adjunto"
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
        "prescrito",
      ],
      user_role: [
        "admin",
        "magistrado",
        "ministerio_publico",
        "policia_civil",
        "oficial_justica",
        "advogado",
        "cidadao",
        "presidente_tribunal",
        "desembargador",
        "investigador",
        "presidente_oab",
        "procurador_geral",
        "bacharel_direito",
        "policia_militar",
        "policia_federal",
        "hospital",
        "procurador_estado",
        "delegado",
        "detran",
        "gaeco",
        "chefe_gaeco",
        "defensor_publico_geral",
        "defensor_publico",
        "corregedor",
        "analista",
        "procurador_geral_adjunto",
      ],
    },
  },
} as const
