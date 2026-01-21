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
      audit_lines: {
        Row: {
          calculadora: string
          competencia: string | null
          descricao: string | null
          formula: string | null
          id: string
          linha: number
          metadata: Json | null
          run_id: string
          valor_bruto: number | null
          valor_liquido: number | null
        }
        Insert: {
          calculadora: string
          competencia?: string | null
          descricao?: string | null
          formula?: string | null
          id?: string
          linha: number
          metadata?: Json | null
          run_id: string
          valor_bruto?: number | null
          valor_liquido?: number | null
        }
        Update: {
          calculadora?: string
          competencia?: string | null
          descricao?: string | null
          formula?: string | null
          id?: string
          linha?: number
          metadata?: Json | null
          run_id?: string
          valor_bruto?: number | null
          valor_liquido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_lines_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "calculation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      calculation_profiles: {
        Row: {
          ativo: boolean | null
          calculadoras_incluidas: string[] | null
          config: Json | null
          criado_em: string | null
          criado_por: string | null
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          calculadoras_incluidas?: string[] | null
          config?: Json | null
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean | null
          calculadoras_incluidas?: string[] | null
          config?: Json | null
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      calculation_runs: {
        Row: {
          calculators_used: Json | null
          case_id: string
          executado_em: string | null
          executado_por: string | null
          facts_snapshot: Json | null
          id: string
          profile_id: string | null
          resultado_bruto: Json | null
          resultado_liquido: Json | null
          warnings: Json | null
        }
        Insert: {
          calculators_used?: Json | null
          case_id: string
          executado_em?: string | null
          executado_por?: string | null
          facts_snapshot?: Json | null
          id?: string
          profile_id?: string | null
          resultado_bruto?: Json | null
          resultado_liquido?: Json | null
          warnings?: Json | null
        }
        Update: {
          calculators_used?: Json | null
          case_id?: string
          executado_em?: string | null
          executado_por?: string | null
          facts_snapshot?: Json | null
          id?: string
          profile_id?: string | null
          resultado_bruto?: Json | null
          resultado_liquido?: Json | null
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "calculation_runs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "calculation_runs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calculation_runs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "calculation_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calculator_versions: {
        Row: {
          ativo: boolean | null
          calculator_id: string
          changelog: string | null
          codigo_ref: string | null
          criado_em: string | null
          criado_por: string | null
          id: string
          regras: Json | null
          versao: string
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          ativo?: boolean | null
          calculator_id: string
          changelog?: string | null
          codigo_ref?: string | null
          criado_em?: string | null
          criado_por?: string | null
          id?: string
          regras?: Json | null
          versao: string
          vigencia_fim?: string | null
          vigencia_inicio: string
        }
        Update: {
          ativo?: boolean | null
          calculator_id?: string
          changelog?: string | null
          codigo_ref?: string | null
          criado_em?: string | null
          criado_por?: string | null
          id?: string
          regras?: Json | null
          versao?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "calculator_versions_calculator_id_fkey"
            columns: ["calculator_id"]
            isOneToOne: false
            referencedRelation: "calculators"
            referencedColumns: ["id"]
          },
        ]
      }
      calculators: {
        Row: {
          ativo: boolean | null
          categoria: string
          criado_em: string | null
          descricao: string | null
          id: string
          inputs_esperados: Json | null
          nome: string
          outputs: Json | null
          tags: string[] | null
        }
        Insert: {
          ativo?: boolean | null
          categoria: string
          criado_em?: string | null
          descricao?: string | null
          id?: string
          inputs_esperados?: Json | null
          nome: string
          outputs?: Json | null
          tags?: string[] | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string
          criado_em?: string | null
          descricao?: string | null
          id?: string
          inputs_esperados?: Json | null
          nome?: string
          outputs?: Json | null
          tags?: string[] | null
        }
        Relationships: []
      }
      cases: {
        Row: {
          atualizado_em: string | null
          cliente: string
          criado_em: string | null
          criado_por: string | null
          id: string
          numero_processo: string | null
          status: Database["public"]["Enums"]["case_status"] | null
        }
        Insert: {
          atualizado_em?: string | null
          cliente: string
          criado_em?: string | null
          criado_por?: string | null
          id?: string
          numero_processo?: string | null
          status?: Database["public"]["Enums"]["case_status"] | null
        }
        Update: {
          atualizado_em?: string | null
          cliente?: string
          criado_em?: string | null
          criado_por?: string | null
          id?: string
          numero_processo?: string | null
          status?: Database["public"]["Enums"]["case_status"] | null
        }
        Relationships: []
      }
      doc_chunks: {
        Row: {
          document_id: string
          embedding: string | null
          id: string
          metadata: Json | null
          texto: string
        }
        Insert: {
          document_id: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          texto: string
        }
        Update: {
          document_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_chunks: {
        Row: {
          case_id: string
          chunk_index: number
          content: string
          content_hash: string | null
          created_at: string
          doc_type: string | null
          document_id: string
          embedding: string | null
          id: string
          metadata: Json
          page_number: number | null
        }
        Insert: {
          case_id: string
          chunk_index?: number
          content: string
          content_hash?: string | null
          created_at?: string
          doc_type?: string | null
          document_id: string
          embedding?: string | null
          id?: string
          metadata?: Json
          page_number?: number | null
        }
        Update: {
          case_id?: string
          chunk_index?: number
          content?: string
          content_hash?: string | null
          created_at?: string
          doc_type?: string | null
          document_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          page_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "document_chunks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_queue: {
        Row: {
          case_id: string
          completed_at: string | null
          created_at: string | null
          document_id: string
          error_message: string | null
          id: string
          metadata: Json | null
          priority: number | null
          retry_count: number | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          case_id: string
          completed_at?: string | null
          created_at?: string | null
          document_id: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          priority?: number | null
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          case_id?: string
          completed_at?: string | null
          created_at?: string | null
          document_id?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          priority?: number | null
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_queue_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "document_queue_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_queue_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          arquivo_url: string | null
          case_id: string
          error_message: string | null
          file_name: string | null
          hash: string | null
          id: string
          max_retries: number | null
          metadata: Json
          mime_type: string | null
          ocr_confidence: number | null
          owner_user_id: string | null
          page_count: number | null
          processing_completed_at: string | null
          processing_started_at: string | null
          queue_priority: number | null
          queued_at: string | null
          retry_count: number | null
          status: string
          storage_path: string | null
          tipo: Database["public"]["Enums"]["doc_type"] | null
          updated_at: string | null
          uploaded_em: string | null
        }
        Insert: {
          arquivo_url?: string | null
          case_id: string
          error_message?: string | null
          file_name?: string | null
          hash?: string | null
          id?: string
          max_retries?: number | null
          metadata?: Json
          mime_type?: string | null
          ocr_confidence?: number | null
          owner_user_id?: string | null
          page_count?: number | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          queue_priority?: number | null
          queued_at?: string | null
          retry_count?: number | null
          status?: string
          storage_path?: string | null
          tipo?: Database["public"]["Enums"]["doc_type"] | null
          updated_at?: string | null
          uploaded_em?: string | null
        }
        Update: {
          arquivo_url?: string | null
          case_id?: string
          error_message?: string | null
          file_name?: string | null
          hash?: string | null
          id?: string
          max_retries?: number | null
          metadata?: Json
          mime_type?: string | null
          ocr_confidence?: number | null
          owner_user_id?: string | null
          page_count?: number | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          queue_priority?: number | null
          queued_at?: string | null
          retry_count?: number | null
          status?: string
          storage_path?: string | null
          tipo?: Database["public"]["Enums"]["doc_type"] | null
          updated_at?: string | null
          uploaded_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      extraction_tasks: {
        Row: {
          case_id: string
          chunks_analyzed: number | null
          created_at: string
          error_message: string | null
          filters: Json
          id: string
          owner_user_id: string
          processing_time_ms: number | null
          query: string
          result_json: Json | null
          similarity_threshold: number | null
          status: string
          task_type: string
          top_k: number
          updated_at: string
        }
        Insert: {
          case_id: string
          chunks_analyzed?: number | null
          created_at?: string
          error_message?: string | null
          filters?: Json
          id?: string
          owner_user_id: string
          processing_time_ms?: number | null
          query: string
          result_json?: Json | null
          similarity_threshold?: number | null
          status?: string
          task_type: string
          top_k?: number
          updated_at?: string
        }
        Update: {
          case_id?: string
          chunks_analyzed?: number | null
          created_at?: string
          error_message?: string | null
          filters?: Json
          id?: string
          owner_user_id?: string
          processing_time_ms?: number | null
          query?: string
          result_json?: Json | null
          similarity_threshold?: number | null
          status?: string
          task_type?: string
          top_k?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "extraction_tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "extraction_tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      fact_evidences: {
        Row: {
          case_id: string
          chunk_id: string
          confidence: number | null
          created_at: string
          document_id: string
          fact_id: string
          id: string
          page_number: number | null
          quote: string
        }
        Insert: {
          case_id: string
          chunk_id: string
          confidence?: number | null
          created_at?: string
          document_id: string
          fact_id: string
          id?: string
          page_number?: number | null
          quote: string
        }
        Update: {
          case_id?: string
          chunk_id?: string
          confidence?: number | null
          created_at?: string
          document_id?: string
          fact_id?: string
          id?: string
          page_number?: number | null
          quote?: string
        }
        Relationships: [
          {
            foreignKeyName: "fact_evidences_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "fact_evidences_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_evidences_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "document_chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_evidences_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_evidences_fact_id_fkey"
            columns: ["fact_id"]
            isOneToOne: false
            referencedRelation: "facts"
            referencedColumns: ["id"]
          },
        ]
      }
      fact_sources: {
        Row: {
          document_id: string
          fact_id: string
          id: string
          pagina: number | null
          trecho: string | null
        }
        Insert: {
          document_id: string
          fact_id: string
          id?: string
          pagina?: number | null
          trecho?: string | null
        }
        Update: {
          document_id?: string
          fact_id?: string
          id?: string
          pagina?: number | null
          trecho?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fact_sources_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_sources_fact_id_fkey"
            columns: ["fact_id"]
            isOneToOne: false
            referencedRelation: "facts"
            referencedColumns: ["id"]
          },
        ]
      }
      facts: {
        Row: {
          case_id: string
          chave: string
          chunk_id: string | null
          citacao: string | null
          confianca: number | null
          confirmado: boolean | null
          confirmado_em: string | null
          confirmado_por: string | null
          criado_em: string | null
          id: string
          origem: Database["public"]["Enums"]["fact_origem"]
          pagina: number | null
          tipo: Database["public"]["Enums"]["fact_type"]
          valor: string
        }
        Insert: {
          case_id: string
          chave: string
          chunk_id?: string | null
          citacao?: string | null
          confianca?: number | null
          confirmado?: boolean | null
          confirmado_em?: string | null
          confirmado_por?: string | null
          criado_em?: string | null
          id?: string
          origem?: Database["public"]["Enums"]["fact_origem"]
          pagina?: number | null
          tipo?: Database["public"]["Enums"]["fact_type"]
          valor: string
        }
        Update: {
          case_id?: string
          chave?: string
          chunk_id?: string | null
          citacao?: string | null
          confianca?: number | null
          confirmado?: boolean | null
          confirmado_em?: string | null
          confirmado_por?: string | null
          criado_em?: string | null
          id?: string
          origem?: Database["public"]["Enums"]["fact_origem"]
          pagina?: number | null
          tipo?: Database["public"]["Enums"]["fact_type"]
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "facts_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "facts_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facts_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "doc_chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      index_series: {
        Row: {
          competencia: string
          criado_em: string | null
          fonte: string | null
          id: string
          nome: string
          valor: number
          versao: number | null
        }
        Insert: {
          competencia: string
          criado_em?: string | null
          fonte?: string | null
          id?: string
          nome: string
          valor: number
          versao?: number | null
        }
        Update: {
          competencia?: string
          criado_em?: string | null
          fonte?: string | null
          id?: string
          nome?: string
          valor?: number
          versao?: number | null
        }
        Relationships: []
      }
      petition_templates: {
        Row: {
          ativo: boolean | null
          content_markdown: string | null
          created_at: string
          descricao: string | null
          estrutura: Json
          id: string
          is_default: boolean | null
          nome: string
          tipo: string
          variaveis: Json | null
        }
        Insert: {
          ativo?: boolean | null
          content_markdown?: string | null
          created_at?: string
          descricao?: string | null
          estrutura?: Json
          id: string
          is_default?: boolean | null
          nome: string
          tipo: string
          variaveis?: Json | null
        }
        Update: {
          ativo?: boolean | null
          content_markdown?: string | null
          created_at?: string
          descricao?: string | null
          estrutura?: Json
          id?: string
          is_default?: boolean | null
          nome?: string
          tipo?: string
          variaveis?: Json | null
        }
        Relationships: []
      }
      petitions: {
        Row: {
          ai_model_used: string | null
          calculation_run_id: string | null
          case_id: string
          conteudo_completo: string | null
          created_at: string
          created_by: string | null
          facts_snapshot: Json | null
          fundamentacao_juridica: string | null
          generation_config: Json | null
          generation_time_ms: number | null
          id: string
          last_edited_by: string | null
          memoria_calculo_html: string | null
          narrativa_fatos: string | null
          pedidos: Json | null
          ressalvas: string | null
          status: string
          template_id: string | null
          theses_used: Json | null
          tipo: string
          titulo: string | null
          updated_at: string
        }
        Insert: {
          ai_model_used?: string | null
          calculation_run_id?: string | null
          case_id: string
          conteudo_completo?: string | null
          created_at?: string
          created_by?: string | null
          facts_snapshot?: Json | null
          fundamentacao_juridica?: string | null
          generation_config?: Json | null
          generation_time_ms?: number | null
          id?: string
          last_edited_by?: string | null
          memoria_calculo_html?: string | null
          narrativa_fatos?: string | null
          pedidos?: Json | null
          ressalvas?: string | null
          status?: string
          template_id?: string | null
          theses_used?: Json | null
          tipo?: string
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          ai_model_used?: string | null
          calculation_run_id?: string | null
          case_id?: string
          conteudo_completo?: string | null
          created_at?: string
          created_by?: string | null
          facts_snapshot?: Json | null
          fundamentacao_juridica?: string | null
          generation_config?: Json | null
          generation_time_ms?: number | null
          id?: string
          last_edited_by?: string | null
          memoria_calculo_html?: string | null
          narrativa_fatos?: string | null
          pedidos?: Json | null
          ressalvas?: string | null
          status?: string
          template_id?: string | null
          theses_used?: Json | null
          tipo?: string
          titulo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "petitions_calculation_run_id_fkey"
            columns: ["calculation_run_id"]
            isOneToOne: false
            referencedRelation: "calculation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petitions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "petitions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_calculators: {
        Row: {
          calculator_version_id: string
          criado_em: string | null
          profile_id: string
        }
        Insert: {
          calculator_version_id: string
          criado_em?: string | null
          profile_id: string
        }
        Update: {
          calculator_version_id?: string
          criado_em?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_calculators_calculator_version_id_fkey"
            columns: ["calculator_version_id"]
            isOneToOne: false
            referencedRelation: "calculator_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_calculators_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "calculation_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_tables: {
        Row: {
          criado_em: string | null
          faixas: Json
          id: string
          tipo: string
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          criado_em?: string | null
          faixas?: Json
          id?: string
          tipo: string
          vigencia_fim?: string | null
          vigencia_inicio: string
        }
        Update: {
          criado_em?: string | null
          faixas?: Json
          id?: string
          tipo?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: []
      }
    }
    Views: {
      case_processing_stats: {
        Row: {
          case_id: string | null
          failed_documents: number | null
          indexed_documents: number | null
          last_processed_at: string | null
          owner_id: string | null
          pending_documents: number | null
          processing_documents: number | null
          total_chunks: number | null
          total_documents: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_next_queued_document: {
        Args: never
        Returns: {
          case_id: string
          document_id: string
          priority: number
          queue_id: string
        }[]
      }
      match_document_chunks: {
        Args: {
          p_case_id: string
          p_doc_types?: string[]
          p_query_embedding: string
          p_top_k: number
        }
        Returns: {
          chunk_id: string
          content: string
          doc_type: string
          document_id: string
          page_number: number
          similarity: number
        }[]
      }
      queue_case_documents: {
        Args: { p_case_id: string; p_priority?: number }
        Returns: number
      }
    }
    Enums: {
      case_status: "rascunho" | "em_analise" | "calculado" | "revisado"
      doc_type:
        | "peticao"
        | "trct"
        | "holerite"
        | "cartao_ponto"
        | "sentenca"
        | "outro"
      fact_origem: "ia_extracao" | "usuario" | "documento"
      fact_type: "data" | "moeda" | "numero" | "texto" | "boolean"
      processing_status:
        | "pending"
        | "queued"
        | "processing"
        | "chunking"
        | "embedding"
        | "completed"
        | "failed"
        | "retrying"
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
      case_status: ["rascunho", "em_analise", "calculado", "revisado"],
      doc_type: [
        "peticao",
        "trct",
        "holerite",
        "cartao_ponto",
        "sentenca",
        "outro",
      ],
      fact_origem: ["ia_extracao", "usuario", "documento"],
      fact_type: ["data", "moeda", "numero", "texto", "boolean"],
      processing_status: [
        "pending",
        "queued",
        "processing",
        "chunking",
        "embedding",
        "completed",
        "failed",
        "retrying",
      ],
    },
  },
} as const
