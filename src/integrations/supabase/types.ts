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
      audit_log: {
        Row: {
          acao: string
          after_json: Json | null
          before_json: Json | null
          created_at: string
          entidade: string
          entidade_id: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          acao: string
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entidade: string
          entidade_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entidade?: string
          entidade_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      calc_lineage: {
        Row: {
          created_at: string
          formula_aplicada: string | null
          hash_reproducao: string | null
          id: string
          inputs: Json
          output_tipo: string | null
          output_valor: number | null
          parametros: Json | null
          result_item_id: string | null
          rule_codigo: string | null
          rule_id: string | null
          rule_versao: string | null
          snapshot_id: string
        }
        Insert: {
          created_at?: string
          formula_aplicada?: string | null
          hash_reproducao?: string | null
          id?: string
          inputs?: Json
          output_tipo?: string | null
          output_valor?: number | null
          parametros?: Json | null
          result_item_id?: string | null
          rule_codigo?: string | null
          rule_id?: string | null
          rule_versao?: string | null
          snapshot_id: string
        }
        Update: {
          created_at?: string
          formula_aplicada?: string | null
          hash_reproducao?: string | null
          id?: string
          inputs?: Json
          output_tipo?: string | null
          output_valor?: number | null
          parametros?: Json | null
          result_item_id?: string | null
          rule_codigo?: string | null
          rule_id?: string | null
          rule_versao?: string | null
          snapshot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calc_lineage_result_item_id_fkey"
            columns: ["result_item_id"]
            isOneToOne: false
            referencedRelation: "calc_result_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calc_lineage_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "calc_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calc_lineage_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "calc_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      calc_result_items: {
        Row: {
          base_calculo: number | null
          competencia: string | null
          created_at: string
          dependencias: Json | null
          fator: number | null
          id: string
          memoria_detalhada: Json | null
          ordem: number | null
          percentual: number | null
          periodo_fim: string | null
          periodo_inicio: string | null
          quantidade: number | null
          rubrica_codigo: string
          rubrica_nome: string | null
          snapshot_id: string
          valor_bruto: number
          valor_liquido: number | null
        }
        Insert: {
          base_calculo?: number | null
          competencia?: string | null
          created_at?: string
          dependencias?: Json | null
          fator?: number | null
          id?: string
          memoria_detalhada?: Json | null
          ordem?: number | null
          percentual?: number | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          quantidade?: number | null
          rubrica_codigo: string
          rubrica_nome?: string | null
          snapshot_id: string
          valor_bruto: number
          valor_liquido?: number | null
        }
        Update: {
          base_calculo?: number | null
          competencia?: string | null
          created_at?: string
          dependencias?: Json | null
          fator?: number | null
          id?: string
          memoria_detalhada?: Json | null
          ordem?: number | null
          percentual?: number | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          quantidade?: number | null
          rubrica_codigo?: string
          rubrica_nome?: string | null
          snapshot_id?: string
          valor_bruto?: number
          valor_liquido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "calc_result_items_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "calc_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      calc_rules: {
        Row: {
          ativo: boolean | null
          categoria: string
          codigo: string
          created_at: string
          descricao: string | null
          formula: Json
          id: string
          nome: string
          parametros_requeridos: Json | null
          versao: string
          versao_numero: number
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria: string
          codigo: string
          created_at?: string
          descricao?: string | null
          formula?: Json
          id?: string
          nome: string
          parametros_requeridos?: Json | null
          versao?: string
          versao_numero?: number
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string
          codigo?: string
          created_at?: string
          descricao?: string | null
          formula?: Json
          id?: string
          nome?: string
          parametros_requeridos?: Json | null
          versao?: string
          versao_numero?: number
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: []
      }
      calc_scenarios: {
        Row: {
          ativo: boolean | null
          case_id: string
          created_at: string
          created_by: string | null
          descricao: string | null
          divisor: number
          dsr_fator: number | null
          hash_config: string | null
          id: string
          indice_correcao: string | null
          media_variaveis_metodo: string | null
          metodo_dsr: string
          metodo_he: string
          nome: string
          premissas_completas: Json | null
          prescricao_data_limite: string | null
          prescricao_tipo: string | null
          taxa_juros: number | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          case_id: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          divisor?: number
          dsr_fator?: number | null
          hash_config?: string | null
          id?: string
          indice_correcao?: string | null
          media_variaveis_metodo?: string | null
          metodo_dsr?: string
          metodo_he?: string
          nome: string
          premissas_completas?: Json | null
          prescricao_data_limite?: string | null
          prescricao_tipo?: string | null
          taxa_juros?: number | null
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          case_id?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          divisor?: number
          dsr_fator?: number | null
          hash_config?: string | null
          id?: string
          indice_correcao?: string | null
          media_variaveis_metodo?: string | null
          metodo_dsr?: string
          metodo_he?: string
          nome?: string
          premissas_completas?: Json | null
          prescricao_data_limite?: string | null
          prescricao_tipo?: string | null
          taxa_juros?: number | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calc_scenarios_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "calc_scenarios_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      calc_snapshots: {
        Row: {
          alertas_consistencia: Json | null
          aprovado_em: string | null
          aprovado_por: string | null
          calendario_hash: string | null
          case_id: string
          created_at: string
          created_by: string
          diff_anterior: Json | null
          engine_version: string
          id: string
          inputs_snapshot: Json
          observacoes: string | null
          pendencias: Json | null
          periodo_fim: string | null
          periodo_inicio: string | null
          prescricao_aplicada: string | null
          profile_id: string | null
          qualidade_score: number | null
          resultado_bruto: Json | null
          resultado_liquido: Json | null
          ruleset_hash: string | null
          scenario_id: string | null
          status: Database["public"]["Enums"]["snapshot_status"]
          total_bruto: number | null
          total_descontos: number | null
          total_liquido: number | null
          versao: number
          warnings: Json | null
        }
        Insert: {
          alertas_consistencia?: Json | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          calendario_hash?: string | null
          case_id: string
          created_at?: string
          created_by: string
          diff_anterior?: Json | null
          engine_version?: string
          id?: string
          inputs_snapshot?: Json
          observacoes?: string | null
          pendencias?: Json | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          prescricao_aplicada?: string | null
          profile_id?: string | null
          qualidade_score?: number | null
          resultado_bruto?: Json | null
          resultado_liquido?: Json | null
          ruleset_hash?: string | null
          scenario_id?: string | null
          status?: Database["public"]["Enums"]["snapshot_status"]
          total_bruto?: number | null
          total_descontos?: number | null
          total_liquido?: number | null
          versao?: number
          warnings?: Json | null
        }
        Update: {
          alertas_consistencia?: Json | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          calendario_hash?: string | null
          case_id?: string
          created_at?: string
          created_by?: string
          diff_anterior?: Json | null
          engine_version?: string
          id?: string
          inputs_snapshot?: Json
          observacoes?: string | null
          pendencias?: Json | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          prescricao_aplicada?: string | null
          profile_id?: string | null
          qualidade_score?: number | null
          resultado_bruto?: Json | null
          resultado_liquido?: Json | null
          ruleset_hash?: string | null
          scenario_id?: string | null
          status?: Database["public"]["Enums"]["snapshot_status"]
          total_bruto?: number | null
          total_descontos?: number | null
          total_liquido?: number | null
          versao?: number
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "calc_snapshots_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "calc_snapshots_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calc_snapshots_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "calculation_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calc_snapshots_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "calc_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      calculation_cases: {
        Row: {
          ajuizamento_data: string | null
          case_id: string
          categoria: string | null
          cct_act: string | null
          cidade: string | null
          created_at: string
          id: string
          observacoes: string | null
          periodo_fim: string | null
          periodo_inicio: string | null
          tipo_contrato: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ajuizamento_data?: string | null
          case_id: string
          categoria?: string | null
          cct_act?: string | null
          cidade?: string | null
          created_at?: string
          id?: string
          observacoes?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          tipo_contrato?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ajuizamento_data?: string | null
          case_id?: string
          categoria?: string | null
          cct_act?: string | null
          cidade?: string | null
          created_at?: string
          id?: string
          observacoes?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          tipo_contrato?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calculation_cases_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "calculation_cases_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
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
      calendars: {
        Row: {
          ano: number
          ativo: boolean | null
          created_at: string
          feriados: Json
          fonte: string | null
          hash_versao: string
          id: string
          municipio: string | null
          nome: string
          uf: string
        }
        Insert: {
          ano: number
          ativo?: boolean | null
          created_at?: string
          feriados?: Json
          fonte?: string | null
          hash_versao: string
          id?: string
          municipio?: string | null
          nome: string
          uf: string
        }
        Update: {
          ano?: number
          ativo?: boolean | null
          created_at?: string
          feriados?: Json
          fonte?: string | null
          hash_versao?: string
          id?: string
          municipio?: string | null
          nome?: string
          uf?: string
        }
        Relationships: []
      }
      case_briefings: {
        Row: {
          case_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          updated_at: string
        }
        Insert: {
          case_id: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_briefings_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "case_briefings_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_controversies: {
        Row: {
          campo: string
          case_id: string
          created_at: string
          created_by: string | null
          descricao: string
          document_ids: string[] | null
          fact_ids: string[] | null
          fundamentacao_legal: string | null
          id: string
          impacto_estimado: number | null
          justificativa: string | null
          prioridade: string | null
          resolvido_em: string | null
          resolvido_por: string | null
          status: string
          updated_at: string
          valor_escolhido: string | null
        }
        Insert: {
          campo: string
          case_id: string
          created_at?: string
          created_by?: string | null
          descricao: string
          document_ids?: string[] | null
          fact_ids?: string[] | null
          fundamentacao_legal?: string | null
          id?: string
          impacto_estimado?: number | null
          justificativa?: string | null
          prioridade?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          status: string
          updated_at?: string
          valor_escolhido?: string | null
        }
        Update: {
          campo?: string
          case_id?: string
          created_at?: string
          created_by?: string | null
          descricao?: string
          document_ids?: string[] | null
          fact_ids?: string[] | null
          fundamentacao_legal?: string | null
          id?: string
          impacto_estimado?: number | null
          justificativa?: string | null
          prioridade?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: string
          updated_at?: string
          valor_escolhido?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_controversies_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "case_controversies_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_inputs: {
        Row: {
          case_id: string
          created_at: string
          data_fim: string | null
          data_inicio: string
          id: string
          metadata_json: Json | null
          observacoes: string | null
          quantidade: number | null
          source_document_id: string | null
          tipo_evento: string
          valor: number | null
        }
        Insert: {
          case_id: string
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          id?: string
          metadata_json?: Json | null
          observacoes?: string | null
          quantidade?: number | null
          source_document_id?: string | null
          tipo_evento: string
          valor?: number | null
        }
        Update: {
          case_id?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          metadata_json?: Json | null
          observacoes?: string | null
          quantidade?: number | null
          source_document_id?: string | null
          tipo_evento?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "case_inputs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "case_inputs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_inputs_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      case_outputs: {
        Row: {
          base_calculo: number | null
          case_id: string
          created_at: string
          descontos_json: Json | null
          formula_aplicada: string | null
          id: string
          legal_basis_json: Json | null
          memoria_json: Json | null
          ordem: number | null
          periodo_ref: string | null
          reflexos_json: Json | null
          snapshot_id: string | null
          valor_bruto: number
          valor_liquido: number | null
          verba_codigo: string
          verba_nome: string | null
        }
        Insert: {
          base_calculo?: number | null
          case_id: string
          created_at?: string
          descontos_json?: Json | null
          formula_aplicada?: string | null
          id?: string
          legal_basis_json?: Json | null
          memoria_json?: Json | null
          ordem?: number | null
          periodo_ref?: string | null
          reflexos_json?: Json | null
          snapshot_id?: string | null
          valor_bruto: number
          valor_liquido?: number | null
          verba_codigo: string
          verba_nome?: string | null
        }
        Update: {
          base_calculo?: number | null
          case_id?: string
          created_at?: string
          descontos_json?: Json | null
          formula_aplicada?: string | null
          id?: string
          legal_basis_json?: Json | null
          memoria_json?: Json | null
          ordem?: number | null
          periodo_ref?: string | null
          reflexos_json?: Json | null
          snapshot_id?: string | null
          valor_bruto?: number
          valor_liquido?: number | null
          verba_codigo?: string
          verba_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_outputs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "case_outputs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_outputs_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "calc_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      case_risk_analysis: {
        Row: {
          analisado_em: string
          analisado_por: string | null
          case_id: string
          fatores: Json
          id: string
          nivel_risco: string
          recomendacoes: string[] | null
          resumo: string | null
          score_risco: number | null
          snapshot_id: string | null
        }
        Insert: {
          analisado_em?: string
          analisado_por?: string | null
          case_id: string
          fatores?: Json
          id?: string
          nivel_risco: string
          recomendacoes?: string[] | null
          resumo?: string | null
          score_risco?: number | null
          snapshot_id?: string | null
        }
        Update: {
          analisado_em?: string
          analisado_por?: string | null
          case_id?: string
          fatores?: Json
          id?: string
          nivel_risco?: string
          recomendacoes?: string[] | null
          resumo?: string | null
          score_risco?: number | null
          snapshot_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_risk_analysis_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "case_risk_analysis_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_risk_analysis_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "calc_snapshots"
            referencedColumns: ["id"]
          },
        ]
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
          tags: string[] | null
          tribunal: string | null
        }
        Insert: {
          atualizado_em?: string | null
          cliente: string
          criado_em?: string | null
          criado_por?: string | null
          id?: string
          numero_processo?: string | null
          status?: Database["public"]["Enums"]["case_status"] | null
          tags?: string[] | null
          tribunal?: string | null
        }
        Update: {
          atualizado_em?: string | null
          cliente?: string
          criado_em?: string | null
          criado_por?: string | null
          id?: string
          numero_processo?: string | null
          status?: Database["public"]["Enums"]["case_status"] | null
          tags?: string[] | null
          tribunal?: string | null
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
          competencia: string | null
          error_message: string | null
          file_name: string | null
          hash: string | null
          hash_integridade: string | null
          id: string
          max_retries: number | null
          metadata: Json
          mime_type: string | null
          ocr_confianca: number | null
          ocr_confidence: number | null
          owner_user_id: string | null
          page_count: number | null
          periodo_fim: string | null
          periodo_inicio: string | null
          periodo_referencia_fim: string | null
          periodo_referencia_inicio: string | null
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
          validado: boolean | null
          validado_em: string | null
          validado_por: string | null
          versao_documento: number | null
        }
        Insert: {
          arquivo_url?: string | null
          case_id: string
          competencia?: string | null
          error_message?: string | null
          file_name?: string | null
          hash?: string | null
          hash_integridade?: string | null
          id?: string
          max_retries?: number | null
          metadata?: Json
          mime_type?: string | null
          ocr_confianca?: number | null
          ocr_confidence?: number | null
          owner_user_id?: string | null
          page_count?: number | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          periodo_referencia_fim?: string | null
          periodo_referencia_inicio?: string | null
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
          validado?: boolean | null
          validado_em?: string | null
          validado_por?: string | null
          versao_documento?: number | null
        }
        Update: {
          arquivo_url?: string | null
          case_id?: string
          competencia?: string | null
          error_message?: string | null
          file_name?: string | null
          hash?: string | null
          hash_integridade?: string | null
          id?: string
          max_retries?: number | null
          metadata?: Json
          mime_type?: string | null
          ocr_confianca?: number | null
          ocr_confidence?: number | null
          owner_user_id?: string | null
          page_count?: number | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          periodo_referencia_fim?: string | null
          periodo_referencia_inicio?: string | null
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
          validado?: boolean | null
          validado_em?: string | null
          validado_por?: string | null
          versao_documento?: number | null
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
      employment_contracts: {
        Row: {
          case_id: string
          created_at: string
          data_admissao: string
          data_demissao: string | null
          funcao: string | null
          historico_salarial: Json | null
          id: string
          jornada_contratual: Json | null
          local_trabalho: string | null
          observacoes: string | null
          salario_inicial: number | null
          sindicato: string | null
          tipo_demissao: Database["public"]["Enums"]["termination_type"] | null
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          data_admissao: string
          data_demissao?: string | null
          funcao?: string | null
          historico_salarial?: Json | null
          id?: string
          jornada_contratual?: Json | null
          local_trabalho?: string | null
          observacoes?: string | null
          salario_inicial?: number | null
          sindicato?: string | null
          tipo_demissao?: Database["public"]["Enums"]["termination_type"] | null
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          data_admissao?: string
          data_demissao?: string | null
          funcao?: string | null
          historico_salarial?: Json | null
          id?: string
          jornada_contratual?: Json | null
          local_trabalho?: string | null
          observacoes?: string | null
          salario_inicial?: number | null
          sindicato?: string | null
          tipo_demissao?: Database["public"]["Enums"]["termination_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employment_contracts_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "employment_contracts_case_id_fkey"
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
      extractions: {
        Row: {
          campo: string
          case_id: string
          confianca: number | null
          created_at: string
          document_id: string
          id: string
          metodo: string | null
          origem: Json
          status: string | null
          tipo_valor: string
          valor_proposto: string
        }
        Insert: {
          campo: string
          case_id: string
          confianca?: number | null
          created_at?: string
          document_id: string
          id?: string
          metodo?: string | null
          origem?: Json
          status?: string | null
          tipo_valor?: string
          valor_proposto: string
        }
        Update: {
          campo?: string
          case_id?: string
          confianca?: number | null
          created_at?: string
          document_id?: string
          id?: string
          metodo?: string | null
          origem?: Json
          status?: string | null
          tipo_valor?: string
          valor_proposto?: string
        }
        Relationships: [
          {
            foreignKeyName: "extractions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "extractions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extractions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
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
          justificativa_validacao: string | null
          origem: Database["public"]["Enums"]["fact_origem"]
          pagina: number | null
          prova_qualidade: string | null
          status_pericial: string | null
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
          justificativa_validacao?: string | null
          origem?: Database["public"]["Enums"]["fact_origem"]
          pagina?: number | null
          prova_qualidade?: string | null
          status_pericial?: string | null
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
          justificativa_validacao?: string | null
          origem?: Database["public"]["Enums"]["fact_origem"]
          pagina?: number | null
          prova_qualidade?: string | null
          status_pericial?: string | null
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
      legal_rules: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          codigo: string
          created_at: string
          descricao: string | null
          flag_controversia: boolean | null
          formula_texto: string | null
          id: string
          jurisdicao: string
          link_ref: string | null
          parametros_json: Json | null
          prioridade: number | null
          referencia: string | null
          referencia_curta: string | null
          source_id: string | null
          status: string
          tese_opcoes: Json | null
          titulo: string
          updated_at: string
          versao: number | null
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          codigo: string
          created_at?: string
          descricao?: string | null
          flag_controversia?: boolean | null
          formula_texto?: string | null
          id?: string
          jurisdicao?: string
          link_ref?: string | null
          parametros_json?: Json | null
          prioridade?: number | null
          referencia?: string | null
          referencia_curta?: string | null
          source_id?: string | null
          status?: string
          tese_opcoes?: Json | null
          titulo: string
          updated_at?: string
          versao?: number | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          codigo?: string
          created_at?: string
          descricao?: string | null
          flag_controversia?: boolean | null
          formula_texto?: string | null
          id?: string
          jurisdicao?: string
          link_ref?: string | null
          parametros_json?: Json | null
          prioridade?: number | null
          referencia?: string | null
          referencia_curta?: string | null
          source_id?: string | null
          status?: string
          tese_opcoes?: Json | null
          titulo?: string
          updated_at?: string
          versao?: number | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_rules_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "legal_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_sources: {
        Row: {
          ativo: boolean | null
          created_at: string
          id: string
          nome: string
          notas: string | null
          observado_em: string | null
          orgao: string
          publicado_em: string | null
          status: string
          tipo: string
          updated_at: string
          url: string | null
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          nome: string
          notas?: string | null
          observado_em?: string | null
          orgao: string
          publicado_em?: string | null
          status?: string
          tipo: string
          updated_at?: string
          url?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          nome?: string
          notas?: string | null
          observado_em?: string | null
          orgao?: string
          publicado_em?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          url?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: []
      }
      parties: {
        Row: {
          case_id: string
          contato: Json | null
          created_at: string
          documento: string | null
          documento_tipo: string | null
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["party_type"]
          updated_at: string
        }
        Insert: {
          case_id: string
          contato?: Json | null
          created_at?: string
          documento?: string | null
          documento_tipo?: string | null
          id?: string
          nome: string
          tipo: Database["public"]["Enums"]["party_type"]
          updated_at?: string
        }
        Update: {
          case_id?: string
          contato?: Json | null
          created_at?: string
          documento?: string | null
          documento_tipo?: string | null
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["party_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parties_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "parties_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
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
      pjecalc_cartao_ponto: {
        Row: {
          adicional_noturno_pct: number | null
          case_id: string
          competencia: string
          created_at: string
          dias_trabalhados: number | null
          dias_uteis: number | null
          dsr_horas: number | null
          horas_extras_100: number | null
          horas_extras_50: number | null
          horas_normais: number | null
          horas_noturnas: number | null
          id: string
          intervalo_suprimido: number | null
          observacoes: string | null
          sobreaviso: number | null
        }
        Insert: {
          adicional_noturno_pct?: number | null
          case_id: string
          competencia: string
          created_at?: string
          dias_trabalhados?: number | null
          dias_uteis?: number | null
          dsr_horas?: number | null
          horas_extras_100?: number | null
          horas_extras_50?: number | null
          horas_normais?: number | null
          horas_noturnas?: number | null
          id?: string
          intervalo_suprimido?: number | null
          observacoes?: string | null
          sobreaviso?: number | null
        }
        Update: {
          adicional_noturno_pct?: number | null
          case_id?: string
          competencia?: string
          created_at?: string
          dias_trabalhados?: number | null
          dias_uteis?: number | null
          dsr_horas?: number | null
          horas_extras_100?: number | null
          horas_extras_50?: number | null
          horas_normais?: number | null
          horas_noturnas?: number | null
          id?: string
          intervalo_suprimido?: number | null
          observacoes?: string | null
          sobreaviso?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_cartao_ponto_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_cartao_ponto_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_contribuicao_social: {
        Row: {
          aliquota: number
          competencia: string
          created_at: string
          faixa: number
          id: string
          teto_beneficio: number | null
          teto_maximo: number | null
          tipo: string
          valor_final: number
          valor_inicial: number
          version_id: string | null
        }
        Insert: {
          aliquota: number
          competencia: string
          created_at?: string
          faixa?: number
          id?: string
          teto_beneficio?: number | null
          teto_maximo?: number | null
          tipo?: string
          valor_final: number
          valor_inicial?: number
          version_id?: string | null
        }
        Update: {
          aliquota?: number
          competencia?: string
          created_at?: string
          faixa?: number
          id?: string
          teto_beneficio?: number | null
          teto_maximo?: number | null
          tipo?: string
          valor_final?: number
          valor_inicial?: number
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_contribuicao_social_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "reference_table_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_correcao_config: {
        Row: {
          case_id: string
          created_at: string
          data_fixa: string | null
          data_liquidacao: string | null
          epoca: string | null
          id: string
          indice: string | null
          juros_inicio: string | null
          juros_percentual: number | null
          juros_tipo: string | null
          multa_523: boolean | null
          multa_523_percentual: number | null
        }
        Insert: {
          case_id: string
          created_at?: string
          data_fixa?: string | null
          data_liquidacao?: string | null
          epoca?: string | null
          id?: string
          indice?: string | null
          juros_inicio?: string | null
          juros_percentual?: number | null
          juros_tipo?: string | null
          multa_523?: boolean | null
          multa_523_percentual?: number | null
        }
        Update: {
          case_id?: string
          created_at?: string
          data_fixa?: string | null
          data_liquidacao?: string | null
          epoca?: string | null
          id?: string
          indice?: string | null
          juros_inicio?: string | null
          juros_percentual?: number | null
          juros_tipo?: string | null
          multa_523?: boolean | null
          multa_523_percentual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_correcao_config_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_correcao_config_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_correcao_monetaria: {
        Row: {
          acumulado: number | null
          competencia: string
          created_at: string
          fonte: string | null
          id: string
          indice: string
          valor: number
          version_id: string | null
        }
        Insert: {
          acumulado?: number | null
          competencia: string
          created_at?: string
          fonte?: string | null
          id?: string
          indice: string
          valor: number
          version_id?: string | null
        }
        Update: {
          acumulado?: number | null
          competencia?: string
          created_at?: string
          fonte?: string | null
          id?: string
          indice?: string
          valor?: number
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_correcao_monetaria_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "reference_table_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_cs_config: {
        Row: {
          aliquota_empresa_fixa: number | null
          aliquota_sat_fixa: number | null
          aliquota_segurado_fixa: number | null
          aliquota_segurado_tipo: string | null
          aliquota_terceiros_fixa: number | null
          apurar_empresa: boolean | null
          apurar_sat: boolean | null
          apurar_segurado: boolean | null
          apurar_terceiros: boolean | null
          case_id: string
          cobrar_reclamante: boolean | null
          created_at: string
          cs_sobre_salarios_pagos: boolean | null
          id: string
          limitar_teto: boolean | null
          periodos_simples: Json | null
        }
        Insert: {
          aliquota_empresa_fixa?: number | null
          aliquota_sat_fixa?: number | null
          aliquota_segurado_fixa?: number | null
          aliquota_segurado_tipo?: string | null
          aliquota_terceiros_fixa?: number | null
          apurar_empresa?: boolean | null
          apurar_sat?: boolean | null
          apurar_segurado?: boolean | null
          apurar_terceiros?: boolean | null
          case_id: string
          cobrar_reclamante?: boolean | null
          created_at?: string
          cs_sobre_salarios_pagos?: boolean | null
          id?: string
          limitar_teto?: boolean | null
          periodos_simples?: Json | null
        }
        Update: {
          aliquota_empresa_fixa?: number | null
          aliquota_sat_fixa?: number | null
          aliquota_segurado_fixa?: number | null
          aliquota_segurado_tipo?: string | null
          aliquota_terceiros_fixa?: number | null
          apurar_empresa?: boolean | null
          apurar_sat?: boolean | null
          apurar_segurado?: boolean | null
          apurar_terceiros?: boolean | null
          case_id?: string
          cobrar_reclamante?: boolean | null
          created_at?: string
          cs_sobre_salarios_pagos?: boolean | null
          id?: string
          limitar_teto?: boolean | null
          periodos_simples?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_cs_config_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_cs_config_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_custas: {
        Row: {
          apurar: boolean | null
          assistencia_judiciaria: boolean | null
          case_id: string
          created_at: string
          id: string
          isento: boolean | null
          percentual: number | null
          valor_maximo: number | null
          valor_minimo: number | null
        }
        Insert: {
          apurar?: boolean | null
          assistencia_judiciaria?: boolean | null
          case_id: string
          created_at?: string
          id?: string
          isento?: boolean | null
          percentual?: number | null
          valor_maximo?: number | null
          valor_minimo?: number | null
        }
        Update: {
          apurar?: boolean | null
          assistencia_judiciaria?: boolean | null
          case_id?: string
          created_at?: string
          id?: string
          isento?: boolean | null
          percentual?: number | null
          valor_maximo?: number | null
          valor_minimo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_custas_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_custas_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_custas_config: {
        Row: {
          apurar: boolean | null
          assistencia_judiciaria: boolean | null
          case_id: string
          created_at: string
          id: string
          isento: boolean | null
          percentual: number | null
          valor_maximo: number | null
          valor_minimo: number | null
        }
        Insert: {
          apurar?: boolean | null
          assistencia_judiciaria?: boolean | null
          case_id: string
          created_at?: string
          id?: string
          isento?: boolean | null
          percentual?: number | null
          valor_maximo?: number | null
          valor_minimo?: number | null
        }
        Update: {
          apurar?: boolean | null
          assistencia_judiciaria?: boolean | null
          case_id?: string
          created_at?: string
          id?: string
          isento?: boolean | null
          percentual?: number | null
          valor_maximo?: number | null
          valor_minimo?: number | null
        }
        Relationships: []
      }
      pjecalc_custas_judiciais: {
        Row: {
          agravo_instrumento: number | null
          agravo_peticao: number | null
          atos_oficiais_rural: number | null
          atos_oficiais_urbana: number | null
          created_at: string
          embargos_arrematacao: number | null
          embargos_execucao: number | null
          embargos_terceiros: number | null
          id: string
          impugnacao_sentenca: number | null
          piso_custas_conhecimento: number | null
          recurso_revista: number | null
          teto_custas_autos: number | null
          teto_custas_liquidacao: number | null
          version_id: string | null
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          agravo_instrumento?: number | null
          agravo_peticao?: number | null
          atos_oficiais_rural?: number | null
          atos_oficiais_urbana?: number | null
          created_at?: string
          embargos_arrematacao?: number | null
          embargos_execucao?: number | null
          embargos_terceiros?: number | null
          id?: string
          impugnacao_sentenca?: number | null
          piso_custas_conhecimento?: number | null
          recurso_revista?: number | null
          teto_custas_autos?: number | null
          teto_custas_liquidacao?: number | null
          version_id?: string | null
          vigencia_fim?: string | null
          vigencia_inicio: string
        }
        Update: {
          agravo_instrumento?: number | null
          agravo_peticao?: number | null
          atos_oficiais_rural?: number | null
          atos_oficiais_urbana?: number | null
          created_at?: string
          embargos_arrematacao?: number | null
          embargos_execucao?: number | null
          embargos_terceiros?: number | null
          id?: string
          impugnacao_sentenca?: number | null
          piso_custas_conhecimento?: number | null
          recurso_revista?: number | null
          teto_custas_autos?: number | null
          teto_custas_liquidacao?: number | null
          version_id?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_custas_judiciais_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "reference_table_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_dados_processo: {
        Row: {
          case_id: string
          comarca: string | null
          created_at: string
          data_citacao: string | null
          data_distribuicao: string | null
          data_transito: string | null
          fase: string | null
          id: string
          juiz: string | null
          numero_processo: string | null
          objeto: string | null
          reclamada_cnpj: string | null
          reclamada_nome: string | null
          reclamante_cpf: string | null
          reclamante_nome: string | null
          rito: string | null
          tipo_acao: string | null
          uf: string | null
          vara: string | null
        }
        Insert: {
          case_id: string
          comarca?: string | null
          created_at?: string
          data_citacao?: string | null
          data_distribuicao?: string | null
          data_transito?: string | null
          fase?: string | null
          id?: string
          juiz?: string | null
          numero_processo?: string | null
          objeto?: string | null
          reclamada_cnpj?: string | null
          reclamada_nome?: string | null
          reclamante_cpf?: string | null
          reclamante_nome?: string | null
          rito?: string | null
          tipo_acao?: string | null
          uf?: string | null
          vara?: string | null
        }
        Update: {
          case_id?: string
          comarca?: string | null
          created_at?: string
          data_citacao?: string | null
          data_distribuicao?: string | null
          data_transito?: string | null
          fase?: string | null
          id?: string
          juiz?: string | null
          numero_processo?: string | null
          objeto?: string | null
          reclamada_cnpj?: string | null
          reclamada_nome?: string | null
          reclamante_cpf?: string | null
          reclamante_nome?: string | null
          rito?: string | null
          tipo_acao?: string | null
          uf?: string | null
          vara?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_dados_processo_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_dados_processo_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_faltas: {
        Row: {
          case_id: string
          created_at: string
          data_final: string
          data_inicial: string
          id: string
          justificada: boolean | null
          justificativa: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          data_final: string
          data_inicial: string
          id?: string
          justificada?: boolean | null
          justificativa?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          data_final?: string
          data_inicial?: string
          id?: string
          justificada?: boolean | null
          justificativa?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_faltas_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_faltas_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_feriados: {
        Row: {
          created_at: string
          data: string
          fonte: string | null
          id: string
          municipio: string | null
          municipio_ibge: string | null
          nome: string
          scope: string
          uf: string | null
          version_id: string | null
        }
        Insert: {
          created_at?: string
          data: string
          fonte?: string | null
          id?: string
          municipio?: string | null
          municipio_ibge?: string | null
          nome: string
          scope?: string
          uf?: string | null
          version_id?: string | null
        }
        Update: {
          created_at?: string
          data?: string
          fonte?: string | null
          id?: string
          municipio?: string | null
          municipio_ibge?: string | null
          nome?: string
          scope?: string
          uf?: string | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_feriados_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "reference_table_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_ferias: {
        Row: {
          abono: boolean | null
          case_id: string
          created_at: string
          dobra: boolean | null
          id: string
          periodo_aquisitivo_fim: string
          periodo_aquisitivo_inicio: string
          periodo_concessivo_fim: string
          periodo_concessivo_inicio: string
          periodos_gozo: Json | null
          prazo_dias: number
          relativas: string
          situacao: string
          updated_at: string
        }
        Insert: {
          abono?: boolean | null
          case_id: string
          created_at?: string
          dobra?: boolean | null
          id?: string
          periodo_aquisitivo_fim: string
          periodo_aquisitivo_inicio: string
          periodo_concessivo_fim: string
          periodo_concessivo_inicio: string
          periodos_gozo?: Json | null
          prazo_dias?: number
          relativas: string
          situacao?: string
          updated_at?: string
        }
        Update: {
          abono?: boolean | null
          case_id?: string
          created_at?: string
          dobra?: boolean | null
          id?: string
          periodo_aquisitivo_fim?: string
          periodo_aquisitivo_inicio?: string
          periodo_concessivo_fim?: string
          periodo_concessivo_inicio?: string
          periodos_gozo?: Json | null
          prazo_dias?: number
          relativas?: string
          situacao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_ferias_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_ferias_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_fgts_config: {
        Row: {
          apurar: boolean | null
          case_id: string
          compor_principal: boolean | null
          created_at: string
          deduzir_saldo: boolean | null
          destino: string | null
          id: string
          lc110_05: boolean | null
          lc110_10: boolean | null
          multa_apurar: boolean | null
          multa_base: string | null
          multa_percentual: number | null
          multa_tipo: string | null
          multa_valor_informado: number | null
          saldos_saques: Json | null
        }
        Insert: {
          apurar?: boolean | null
          case_id: string
          compor_principal?: boolean | null
          created_at?: string
          deduzir_saldo?: boolean | null
          destino?: string | null
          id?: string
          lc110_05?: boolean | null
          lc110_10?: boolean | null
          multa_apurar?: boolean | null
          multa_base?: string | null
          multa_percentual?: number | null
          multa_tipo?: string | null
          multa_valor_informado?: number | null
          saldos_saques?: Json | null
        }
        Update: {
          apurar?: boolean | null
          case_id?: string
          compor_principal?: boolean | null
          created_at?: string
          deduzir_saldo?: boolean | null
          destino?: string | null
          id?: string
          lc110_05?: boolean | null
          lc110_10?: boolean | null
          multa_apurar?: boolean | null
          multa_base?: string | null
          multa_percentual?: number | null
          multa_tipo?: string | null
          multa_valor_informado?: number | null
          saldos_saques?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_fgts_config_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_fgts_config_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_historico_ocorrencias: {
        Row: {
          competencia: string
          created_at: string
          historico_id: string
          id: string
          tipo: string
          valor: number
        }
        Insert: {
          competencia: string
          created_at?: string
          historico_id: string
          id?: string
          tipo?: string
          valor?: number
        }
        Update: {
          competencia?: string
          created_at?: string
          historico_id?: string
          id?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_historico_ocorrencias_historico_id_fkey"
            columns: ["historico_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_historico_salarial"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_historico_salarial: {
        Row: {
          base_referencia: string | null
          case_id: string
          categoria_piso: string | null
          created_at: string
          cs_recolhida: boolean | null
          fgts_recolhido: boolean | null
          id: string
          incidencia_cs: boolean | null
          incidencia_fgts: boolean | null
          nome: string
          periodo_fim: string
          periodo_inicio: string
          quantidade: number | null
          tipo_valor: string
          updated_at: string
          valor_informado: number | null
        }
        Insert: {
          base_referencia?: string | null
          case_id: string
          categoria_piso?: string | null
          created_at?: string
          cs_recolhida?: boolean | null
          fgts_recolhido?: boolean | null
          id?: string
          incidencia_cs?: boolean | null
          incidencia_fgts?: boolean | null
          nome: string
          periodo_fim: string
          periodo_inicio: string
          quantidade?: number | null
          tipo_valor?: string
          updated_at?: string
          valor_informado?: number | null
        }
        Update: {
          base_referencia?: string | null
          case_id?: string
          categoria_piso?: string | null
          created_at?: string
          cs_recolhida?: boolean | null
          fgts_recolhido?: boolean | null
          id?: string
          incidencia_cs?: boolean | null
          incidencia_fgts?: boolean | null
          nome?: string
          periodo_fim?: string
          periodo_inicio?: string
          quantidade?: number | null
          tipo_valor?: string
          updated_at?: string
          valor_informado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_historico_salarial_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_historico_salarial_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_honorarios: {
        Row: {
          apurar_contratuais: boolean | null
          apurar_sucumbenciais: boolean | null
          base_sucumbenciais: string | null
          case_id: string
          created_at: string
          id: string
          percentual_contratuais: number | null
          percentual_sucumbenciais: number | null
          valor_fixo: number | null
        }
        Insert: {
          apurar_contratuais?: boolean | null
          apurar_sucumbenciais?: boolean | null
          base_sucumbenciais?: string | null
          case_id: string
          created_at?: string
          id?: string
          percentual_contratuais?: number | null
          percentual_sucumbenciais?: number | null
          valor_fixo?: number | null
        }
        Update: {
          apurar_contratuais?: boolean | null
          apurar_sucumbenciais?: boolean | null
          base_sucumbenciais?: string | null
          case_id?: string
          created_at?: string
          id?: string
          percentual_contratuais?: number | null
          percentual_sucumbenciais?: number | null
          valor_fixo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_honorarios_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_honorarios_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_imposto_renda: {
        Row: {
          competencia: string
          created_at: string
          deducao_aposentado_65: number
          deducao_dependente: number
          id: string
        }
        Insert: {
          competencia: string
          created_at?: string
          deducao_aposentado_65?: number
          deducao_dependente?: number
          id?: string
        }
        Update: {
          competencia?: string
          created_at?: string
          deducao_aposentado_65?: number
          deducao_dependente?: number
          id?: string
        }
        Relationships: []
      }
      pjecalc_imposto_renda_faixas: {
        Row: {
          aliquota: number
          created_at: string
          faixa: number
          id: string
          ir_id: string
          parcela_deduzir: number
          valor_final: number | null
          valor_inicial: number
        }
        Insert: {
          aliquota?: number
          created_at?: string
          faixa?: number
          id?: string
          ir_id: string
          parcela_deduzir?: number
          valor_final?: number | null
          valor_inicial?: number
        }
        Update: {
          aliquota?: number
          created_at?: string
          faixa?: number
          id?: string
          ir_id?: string
          parcela_deduzir?: number
          valor_final?: number | null
          valor_inicial?: number
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_imposto_renda_faixas_ir_id_fkey"
            columns: ["ir_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_imposto_renda"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_inss_faixas: {
        Row: {
          aliquota: number
          competencia_fim: string | null
          competencia_inicio: string
          created_at: string | null
          faixa: number
          id: string
          valor_ate: number
        }
        Insert: {
          aliquota: number
          competencia_fim?: string | null
          competencia_inicio: string
          created_at?: string | null
          faixa: number
          id?: string
          valor_ate: number
        }
        Update: {
          aliquota?: number
          competencia_fim?: string | null
          competencia_inicio?: string
          created_at?: string | null
          faixa?: number
          id?: string
          valor_ate?: number
        }
        Relationships: []
      }
      pjecalc_ir_config: {
        Row: {
          aposentado_65: boolean | null
          apurar: boolean | null
          case_id: string
          cobrar_reclamado: boolean | null
          created_at: string
          deduzir_cs: boolean | null
          deduzir_honorarios: boolean | null
          deduzir_pensao: boolean | null
          deduzir_prev_privada: boolean | null
          dependentes: number | null
          id: string
          incidir_sobre_juros: boolean | null
          tributacao_exclusiva_13: boolean | null
          tributacao_separada_ferias: boolean | null
        }
        Insert: {
          aposentado_65?: boolean | null
          apurar?: boolean | null
          case_id: string
          cobrar_reclamado?: boolean | null
          created_at?: string
          deduzir_cs?: boolean | null
          deduzir_honorarios?: boolean | null
          deduzir_pensao?: boolean | null
          deduzir_prev_privada?: boolean | null
          dependentes?: number | null
          id?: string
          incidir_sobre_juros?: boolean | null
          tributacao_exclusiva_13?: boolean | null
          tributacao_separada_ferias?: boolean | null
        }
        Update: {
          aposentado_65?: boolean | null
          apurar?: boolean | null
          case_id?: string
          cobrar_reclamado?: boolean | null
          created_at?: string
          deduzir_cs?: boolean | null
          deduzir_honorarios?: boolean | null
          deduzir_pensao?: boolean | null
          deduzir_prev_privada?: boolean | null
          dependentes?: number | null
          id?: string
          incidir_sobre_juros?: boolean | null
          tributacao_exclusiva_13?: boolean | null
          tributacao_separada_ferias?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_ir_config_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_ir_config_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_ir_faixas: {
        Row: {
          aliquota: number
          competencia_fim: string | null
          competencia_inicio: string
          created_at: string | null
          deducao: number
          deducao_dependente: number
          faixa: number
          id: string
          valor_ate: number
        }
        Insert: {
          aliquota: number
          competencia_fim?: string | null
          competencia_inicio: string
          created_at?: string | null
          deducao?: number
          deducao_dependente?: number
          faixa: number
          id?: string
          valor_ate: number
        }
        Update: {
          aliquota?: number
          competencia_fim?: string | null
          competencia_inicio?: string
          created_at?: string | null
          deducao?: number
          deducao_dependente?: number
          faixa?: number
          id?: string
          valor_ate?: number
        }
        Relationships: []
      }
      pjecalc_juros_mora: {
        Row: {
          acumulado: number | null
          competencia: string
          created_at: string
          id: string
          taxa_mensal: number
          tipo: string
        }
        Insert: {
          acumulado?: number | null
          competencia: string
          created_at?: string
          id?: string
          taxa_mensal: number
          tipo?: string
        }
        Update: {
          acumulado?: number | null
          competencia?: string
          created_at?: string
          id?: string
          taxa_mensal?: number
          tipo?: string
        }
        Relationships: []
      }
      pjecalc_liquidacao_resultado: {
        Row: {
          case_id: string
          created_at: string
          data_liquidacao: string | null
          engine_version: string | null
          id: string
          resultado: Json
          total_bruto: number | null
          total_liquido: number | null
          total_reclamada: number | null
          total_reclamante: number | null
        }
        Insert: {
          case_id: string
          created_at?: string
          data_liquidacao?: string | null
          engine_version?: string | null
          id?: string
          resultado: Json
          total_bruto?: number | null
          total_liquido?: number | null
          total_reclamada?: number | null
          total_reclamante?: number | null
        }
        Update: {
          case_id?: string
          created_at?: string
          data_liquidacao?: string | null
          engine_version?: string | null
          id?: string
          resultado?: Json
          total_bruto?: number | null
          total_liquido?: number | null
          total_reclamada?: number | null
          total_reclamante?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_liquidacao_resultado_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_liquidacao_resultado_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_multas_config: {
        Row: {
          apurar_467: boolean | null
          apurar_477: boolean | null
          case_id: string
          created_at: string | null
          id: string
          observacoes: string | null
          valor_467: number | null
          valor_477_informado: number | null
          valor_477_tipo: string | null
        }
        Insert: {
          apurar_467?: boolean | null
          apurar_477?: boolean | null
          case_id: string
          created_at?: string | null
          id?: string
          observacoes?: string | null
          valor_467?: number | null
          valor_477_informado?: number | null
          valor_477_tipo?: string | null
        }
        Update: {
          apurar_467?: boolean | null
          apurar_477?: boolean | null
          case_id?: string
          created_at?: string | null
          id?: string
          observacoes?: string | null
          valor_467?: number | null
          valor_477_informado?: number | null
          valor_477_tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_multas_config_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_multas_config_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_parametros: {
        Row: {
          carga_horaria_padrao: number
          case_id: string
          comentarios: string | null
          considerar_feriado_estadual: boolean | null
          considerar_feriado_municipal: boolean | null
          created_at: string
          data_admissao: string
          data_ajuizamento: string
          data_demissao: string | null
          data_final: string | null
          data_inicial: string | null
          data_prescricao_quinquenal: string | null
          estado: string
          excecoes_carga_horaria: Json | null
          excecoes_sabado: Json | null
          id: string
          limitar_avos_periodo: boolean | null
          maior_remuneracao: number | null
          municipio: string
          pontos_facultativos: Json | null
          prazo_aviso_dias: number | null
          prazo_aviso_previo: string
          prescricao_fgts: boolean | null
          prescricao_quinquenal: boolean | null
          projetar_aviso_indenizado: boolean | null
          regime_trabalho: string
          sabado_dia_util: boolean | null
          ultima_remuneracao: number | null
          updated_at: string
          zerar_valor_negativo: boolean | null
        }
        Insert: {
          carga_horaria_padrao?: number
          case_id: string
          comentarios?: string | null
          considerar_feriado_estadual?: boolean | null
          considerar_feriado_municipal?: boolean | null
          created_at?: string
          data_admissao: string
          data_ajuizamento: string
          data_demissao?: string | null
          data_final?: string | null
          data_inicial?: string | null
          data_prescricao_quinquenal?: string | null
          estado?: string
          excecoes_carga_horaria?: Json | null
          excecoes_sabado?: Json | null
          id?: string
          limitar_avos_periodo?: boolean | null
          maior_remuneracao?: number | null
          municipio?: string
          pontos_facultativos?: Json | null
          prazo_aviso_dias?: number | null
          prazo_aviso_previo?: string
          prescricao_fgts?: boolean | null
          prescricao_quinquenal?: boolean | null
          projetar_aviso_indenizado?: boolean | null
          regime_trabalho?: string
          sabado_dia_util?: boolean | null
          ultima_remuneracao?: number | null
          updated_at?: string
          zerar_valor_negativo?: boolean | null
        }
        Update: {
          carga_horaria_padrao?: number
          case_id?: string
          comentarios?: string | null
          considerar_feriado_estadual?: boolean | null
          considerar_feriado_municipal?: boolean | null
          created_at?: string
          data_admissao?: string
          data_ajuizamento?: string
          data_demissao?: string | null
          data_final?: string | null
          data_inicial?: string | null
          data_prescricao_quinquenal?: string | null
          estado?: string
          excecoes_carga_horaria?: Json | null
          excecoes_sabado?: Json | null
          id?: string
          limitar_avos_periodo?: boolean | null
          maior_remuneracao?: number | null
          municipio?: string
          pontos_facultativos?: Json | null
          prazo_aviso_dias?: number | null
          prazo_aviso_previo?: string
          prescricao_fgts?: boolean | null
          prescricao_quinquenal?: boolean | null
          projetar_aviso_indenizado?: boolean | null
          regime_trabalho?: string
          sabado_dia_util?: boolean | null
          ultima_remuneracao?: number | null
          updated_at?: string
          zerar_valor_negativo?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_parametros_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_parametros_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_pensao_config: {
        Row: {
          apurar: boolean | null
          base: string | null
          beneficiario: string | null
          case_id: string
          created_at: string | null
          id: string
          observacoes: string | null
          percentual: number | null
          valor_fixo: number | null
        }
        Insert: {
          apurar?: boolean | null
          base?: string | null
          beneficiario?: string | null
          case_id: string
          created_at?: string | null
          id?: string
          observacoes?: string | null
          percentual?: number | null
          valor_fixo?: number | null
        }
        Update: {
          apurar?: boolean | null
          base?: string | null
          beneficiario?: string | null
          case_id?: string
          created_at?: string | null
          id?: string
          observacoes?: string | null
          percentual?: number | null
          valor_fixo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_pensao_config_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_pensao_config_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_pisos_salariais: {
        Row: {
          categoria: string | null
          competencia: string
          created_at: string
          fonte_doc: string | null
          id: string
          nome: string
          sindicato: string | null
          uf: string
          valor: number
          version_id: string | null
        }
        Insert: {
          categoria?: string | null
          competencia: string
          created_at?: string
          fonte_doc?: string | null
          id?: string
          nome: string
          sindicato?: string | null
          uf: string
          valor: number
          version_id?: string | null
        }
        Update: {
          categoria?: string | null
          competencia?: string
          created_at?: string
          fonte_doc?: string | null
          id?: string
          nome?: string
          sindicato?: string | null
          uf?: string
          valor?: number
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_pisos_salariais_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "reference_table_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_salario_familia: {
        Row: {
          competencia: string
          created_at: string
          faixa: number
          id: string
          valor_cota: number
          valor_final: number
          valor_inicial: number
          version_id: string | null
        }
        Insert: {
          competencia: string
          created_at?: string
          faixa?: number
          id?: string
          valor_cota: number
          valor_final: number
          valor_inicial?: number
          version_id?: string | null
        }
        Update: {
          competencia?: string
          created_at?: string
          faixa?: number
          id?: string
          valor_cota?: number
          valor_final?: number
          valor_inicial?: number
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_salario_familia_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "reference_table_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_salario_familia_config: {
        Row: {
          apurar: boolean | null
          case_id: string
          created_at: string | null
          filhos_detalhes: Json | null
          id: string
          numero_filhos: number | null
          observacoes: string | null
        }
        Insert: {
          apurar?: boolean | null
          case_id: string
          created_at?: string | null
          filhos_detalhes?: Json | null
          id?: string
          numero_filhos?: number | null
          observacoes?: string | null
        }
        Update: {
          apurar?: boolean | null
          case_id?: string
          created_at?: string | null
          filhos_detalhes?: Json | null
          id?: string
          numero_filhos?: number | null
          observacoes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_salario_familia_config_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_salario_familia_config_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_salario_minimo: {
        Row: {
          competencia: string
          created_at: string
          id: string
          valor: number
          version_id: string | null
        }
        Insert: {
          competencia: string
          created_at?: string
          id?: string
          valor: number
          version_id?: string | null
        }
        Update: {
          competencia?: string
          created_at?: string
          id?: string
          valor?: number
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_salario_minimo_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "reference_table_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_seguro_config: {
        Row: {
          apurar: boolean | null
          case_id: string
          created_at: string
          id: string
          observacoes: string | null
          parcelas: number | null
          recebeu: boolean | null
          valor_parcela: number | null
        }
        Insert: {
          apurar?: boolean | null
          case_id: string
          created_at?: string
          id?: string
          observacoes?: string | null
          parcelas?: number | null
          recebeu?: boolean | null
          valor_parcela?: number | null
        }
        Update: {
          apurar?: boolean | null
          case_id?: string
          created_at?: string
          id?: string
          observacoes?: string | null
          parcelas?: number | null
          recebeu?: boolean | null
          valor_parcela?: number | null
        }
        Relationships: []
      }
      pjecalc_seguro_desemprego: {
        Row: {
          competencia: string
          created_at: string
          faixa: number
          id: string
          percentual: number
          valor_final: number
          valor_inicial: number
          valor_piso: number
          valor_soma: number | null
          valor_teto: number | null
          version_id: string | null
        }
        Insert: {
          competencia: string
          created_at?: string
          faixa?: number
          id?: string
          percentual: number
          valor_final: number
          valor_inicial?: number
          valor_piso: number
          valor_soma?: number | null
          valor_teto?: number | null
          version_id?: string | null
        }
        Update: {
          competencia?: string
          created_at?: string
          faixa?: number
          id?: string
          percentual?: number
          valor_final?: number
          valor_inicial?: number
          valor_piso?: number
          valor_soma?: number | null
          valor_teto?: number | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_seguro_desemprego_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "reference_table_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_vale_transporte: {
        Row: {
          created_at: string
          id: string
          linha: string
          max_desconto_pct: number
          municipio: string | null
          uf: string
          valor: number
          version_id: string | null
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          created_at?: string
          id?: string
          linha: string
          max_desconto_pct?: number
          municipio?: string | null
          uf: string
          valor: number
          version_id?: string | null
          vigencia_fim?: string | null
          vigencia_inicio: string
        }
        Update: {
          created_at?: string
          id?: string
          linha?: string
          max_desconto_pct?: number
          municipio?: string | null
          uf?: string
          valor?: number
          version_id?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_vale_transporte_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "reference_table_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_verba_ocorrencias: {
        Row: {
          ativa: boolean
          case_id: string | null
          competencia: string
          created_at: string
          data_final: string
          data_inicial: string
          devido: number
          diferenca: number
          divisor: number
          dobra: number
          id: string
          multiplicador: number
          pago: number
          quantidade: number
          tipo_divisor: string
          tipo_pago: string
          tipo_quantidade: string
          tipo_valor: string
          valor_base: number
          verba_id: string
        }
        Insert: {
          ativa?: boolean
          case_id?: string | null
          competencia: string
          created_at?: string
          data_final: string
          data_inicial: string
          devido?: number
          diferenca?: number
          divisor?: number
          dobra?: number
          id?: string
          multiplicador?: number
          pago?: number
          quantidade?: number
          tipo_divisor?: string
          tipo_pago?: string
          tipo_quantidade?: string
          tipo_valor?: string
          valor_base?: number
          verba_id: string
        }
        Update: {
          ativa?: boolean
          case_id?: string | null
          competencia?: string
          created_at?: string
          data_final?: string
          data_inicial?: string
          devido?: number
          diferenca?: number
          divisor?: number
          dobra?: number
          id?: string
          multiplicador?: number
          pago?: number
          quantidade?: number
          tipo_divisor?: string
          tipo_pago?: string
          tipo_quantidade?: string
          tipo_valor?: string
          valor_base?: number
          verba_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_verba_ocorrencias_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_verba_ocorrencias_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_verba_ocorrencias_verba_id_fkey"
            columns: ["verba_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_verbas"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_verbas: {
        Row: {
          assunto_cnj: string | null
          base_calculo: Json
          caracteristica: string
          case_id: string
          comentarios: string | null
          compor_principal: boolean
          comportamento_reflexo: string | null
          created_at: string
          divisor_cartao_colunas: Json | null
          divisor_informado: number | null
          dobrar_valor_devido: boolean | null
          exclusoes: Json
          gerar_verba_principal: string
          gerar_verba_reflexa: string
          id: string
          incidencias: Json
          juros_ajuizamento: string
          multiplicador: number
          nome: string
          ocorrencia_pagamento: string
          ordem: number
          periodo_fim: string
          periodo_inicio: string
          quantidade_calendario_tipo: string | null
          quantidade_cartao_colunas: Json | null
          quantidade_informada: number | null
          quantidade_proporcionalizar: boolean | null
          tipo: string
          tipo_divisor: string
          tipo_quantidade: string
          updated_at: string
          valor: string
          valor_informado_devido: number | null
          valor_informado_pago: number | null
          verba_principal_id: string | null
          verbas_reflexas_base: Json | null
          zerar_valor_negativo: boolean | null
        }
        Insert: {
          assunto_cnj?: string | null
          base_calculo?: Json
          caracteristica?: string
          case_id: string
          comentarios?: string | null
          compor_principal?: boolean
          comportamento_reflexo?: string | null
          created_at?: string
          divisor_cartao_colunas?: Json | null
          divisor_informado?: number | null
          dobrar_valor_devido?: boolean | null
          exclusoes?: Json
          gerar_verba_principal?: string
          gerar_verba_reflexa?: string
          id?: string
          incidencias?: Json
          juros_ajuizamento?: string
          multiplicador?: number
          nome: string
          ocorrencia_pagamento?: string
          ordem?: number
          periodo_fim: string
          periodo_inicio: string
          quantidade_calendario_tipo?: string | null
          quantidade_cartao_colunas?: Json | null
          quantidade_informada?: number | null
          quantidade_proporcionalizar?: boolean | null
          tipo?: string
          tipo_divisor?: string
          tipo_quantidade?: string
          updated_at?: string
          valor?: string
          valor_informado_devido?: number | null
          valor_informado_pago?: number | null
          verba_principal_id?: string | null
          verbas_reflexas_base?: Json | null
          zerar_valor_negativo?: boolean | null
        }
        Update: {
          assunto_cnj?: string | null
          base_calculo?: Json
          caracteristica?: string
          case_id?: string
          comentarios?: string | null
          compor_principal?: boolean
          comportamento_reflexo?: string | null
          created_at?: string
          divisor_cartao_colunas?: Json | null
          divisor_informado?: number | null
          dobrar_valor_devido?: boolean | null
          exclusoes?: Json
          gerar_verba_principal?: string
          gerar_verba_reflexa?: string
          id?: string
          incidencias?: Json
          juros_ajuizamento?: string
          multiplicador?: number
          nome?: string
          ocorrencia_pagamento?: string
          ordem?: number
          periodo_fim?: string
          periodo_inicio?: string
          quantidade_calendario_tipo?: string | null
          quantidade_cartao_colunas?: Json | null
          quantidade_informada?: number | null
          quantidade_proporcionalizar?: boolean | null
          tipo?: string
          tipo_divisor?: string
          tipo_quantidade?: string
          updated_at?: string
          valor?: string
          valor_informado_devido?: number | null
          valor_informado_pago?: number | null
          verba_principal_id?: string | null
          verbas_reflexas_base?: Json | null
          zerar_valor_negativo?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_verbas_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_verbas_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_verbas_verba_principal_id_fkey"
            columns: ["verba_principal_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_verbas"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_verbas_padrao: {
        Row: {
          ativo: boolean | null
          caracteristica: string
          created_at: string
          divisor_padrao: number | null
          id: string
          incidencia_cs: boolean | null
          incidencia_fgts: boolean | null
          incidencia_irpf: boolean | null
          multiplicador_padrao: number | null
          nome: string
          ocorrencia_pagamento: string
          tipo: string
          valor_tipo: string
        }
        Insert: {
          ativo?: boolean | null
          caracteristica?: string
          created_at?: string
          divisor_padrao?: number | null
          id?: string
          incidencia_cs?: boolean | null
          incidencia_fgts?: boolean | null
          incidencia_irpf?: boolean | null
          multiplicador_padrao?: number | null
          nome: string
          ocorrencia_pagamento?: string
          tipo?: string
          valor_tipo?: string
        }
        Update: {
          ativo?: boolean | null
          caracteristica?: string
          created_at?: string
          divisor_padrao?: number | null
          id?: string
          incidencia_cs?: boolean | null
          incidencia_fgts?: boolean | null
          incidencia_irpf?: boolean | null
          multiplicador_padrao?: number | null
          nome?: string
          ocorrencia_pagamento?: string
          tipo?: string
          valor_tipo?: string
        }
        Relationships: []
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
      reference_import_runs: {
        Row: {
          created_at: string
          errors: Json | null
          finished_at: string | null
          id: string
          performed_by: string | null
          raw_file_hash: string | null
          raw_file_path: string | null
          result: string
          started_at: string
          stats: Json | null
          table_slug: string
          trigger: string
        }
        Insert: {
          created_at?: string
          errors?: Json | null
          finished_at?: string | null
          id?: string
          performed_by?: string | null
          raw_file_hash?: string | null
          raw_file_path?: string | null
          result?: string
          started_at?: string
          stats?: Json | null
          table_slug: string
          trigger?: string
        }
        Update: {
          created_at?: string
          errors?: Json | null
          finished_at?: string | null
          id?: string
          performed_by?: string | null
          raw_file_hash?: string | null
          raw_file_path?: string | null
          result?: string
          started_at?: string
          stats?: Json | null
          table_slug?: string
          trigger?: string
        }
        Relationships: []
      }
      reference_sources: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          notes: string | null
          type: string
          url: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          type?: string
          url?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          type?: string
          url?: string | null
        }
        Relationships: []
      }
      reference_table_registry: {
        Row: {
          created_at: string
          id: string
          is_auto_importable: boolean
          last_import_at: string | null
          last_import_result: Json | null
          name: string
          requires_manual_input: boolean
          slug: string
          source_id: string | null
          status: string
          update_frequency: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_auto_importable?: boolean
          last_import_at?: string | null
          last_import_result?: Json | null
          name: string
          requires_manual_input?: boolean
          slug: string
          source_id?: string | null
          status?: string
          update_frequency?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_auto_importable?: boolean
          last_import_at?: string | null
          last_import_result?: Json | null
          name?: string
          requires_manual_input?: boolean
          slug?: string
          source_id?: string | null
          status?: string
          update_frequency?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_table_registry_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "reference_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_table_versions: {
        Row: {
          competency_month: number | null
          competency_year: number
          created_at: string
          created_by: string | null
          id: string
          import_run_id: string | null
          notes: string | null
          source_snapshot: Json | null
          status: string
          table_slug: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          competency_month?: number | null
          competency_year: number
          created_at?: string
          created_by?: string | null
          id?: string
          import_run_id?: string | null
          notes?: string | null
          source_snapshot?: Json | null
          status?: string
          table_slug: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          competency_month?: number | null
          competency_year?: number
          created_at?: string
          created_by?: string | null
          id?: string
          import_run_id?: string | null
          notes?: string | null
          source_snapshot?: Json | null
          status?: string
          table_slug?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reference_table_versions_import_run_id_fkey"
            columns: ["import_run_id"]
            isOneToOne: false
            referencedRelation: "reference_import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_tables: {
        Row: {
          ativo: boolean | null
          coletado_em: string | null
          competencia: string
          created_at: string
          dados_json: Json
          hash_integridade: string | null
          id: string
          nome: string
          notas: string | null
          source_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          coletado_em?: string | null
          competencia: string
          created_at?: string
          dados_json?: Json
          hash_integridade?: string | null
          id?: string
          nome: string
          notas?: string | null
          source_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          coletado_em?: string | null
          competencia?: string
          created_at?: string
          dados_json?: Json
          hash_integridade?: string | null
          id?: string
          nome?: string
          notas?: string | null
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reference_tables_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "legal_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      rubrica_requirements: {
        Row: {
          alerta_sem_prova: string | null
          created_at: string
          descricao_requisito: string | null
          documentos_requeridos: string[]
          fatos_requeridos: string[]
          id: string
          nivel_exigencia: string | null
          rubrica_codigo: string
          rubrica_nome: string
        }
        Insert: {
          alerta_sem_prova?: string | null
          created_at?: string
          descricao_requisito?: string | null
          documentos_requeridos?: string[]
          fatos_requeridos?: string[]
          id?: string
          nivel_exigencia?: string | null
          rubrica_codigo: string
          rubrica_nome: string
        }
        Update: {
          alerta_sem_prova?: string | null
          created_at?: string
          descricao_requisito?: string | null
          documentos_requeridos?: string[]
          fatos_requeridos?: string[]
          id?: string
          nivel_exigencia?: string | null
          rubrica_codigo?: string
          rubrica_nome?: string
        }
        Relationships: []
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
      test_scenarios: {
        Row: {
          ativo: boolean | null
          created_at: string
          descricao: string | null
          id: string
          inputs: Json
          nome: string
          resultados_esperados: Json
          ultima_execucao: string | null
          ultimo_diff: Json | null
          ultimo_resultado: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          id?: string
          inputs?: Json
          nome: string
          resultados_esperados?: Json
          ultima_execucao?: string | null
          ultimo_diff?: Json | null
          ultimo_resultado?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          id?: string
          inputs?: Json
          nome?: string
          resultados_esperados?: Json
          ultima_execucao?: string | null
          ultimo_diff?: Json | null
          ultimo_resultado?: string | null
        }
        Relationships: []
      }
      validations: {
        Row: {
          acao: Database["public"]["Enums"]["validation_action"]
          campo: string
          case_id: string
          extraction_id: string | null
          id: string
          justificativa: string | null
          metadata: Json | null
          snapshot_id: string | null
          usuario_id: string
          validated_at: string
          valor_anterior: string | null
          valor_validado: string | null
        }
        Insert: {
          acao: Database["public"]["Enums"]["validation_action"]
          campo: string
          case_id: string
          extraction_id?: string | null
          id?: string
          justificativa?: string | null
          metadata?: Json | null
          snapshot_id?: string | null
          usuario_id: string
          validated_at?: string
          valor_anterior?: string | null
          valor_validado?: string | null
        }
        Update: {
          acao?: Database["public"]["Enums"]["validation_action"]
          campo?: string
          case_id?: string
          extraction_id?: string | null
          id?: string
          justificativa?: string | null
          metadata?: Json | null
          snapshot_id?: string | null
          usuario_id?: string
          validated_at?: string
          valor_anterior?: string | null
          valor_validado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "validations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "validations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validations_extraction_id_fkey"
            columns: ["extraction_id"]
            isOneToOne: false
            referencedRelation: "extractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validations_snapshot_fk"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "calc_snapshots"
            referencedColumns: ["id"]
          },
        ]
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
      apply_correction: {
        Args: {
          p_from_date: string
          p_index?: string
          p_to_date: string
          p_value: number
        }
        Returns: Json
      }
      calc_inss: { Args: { p_base: number; p_date: string }; Returns: Json }
      calc_irrf: {
        Args: { p_base: number; p_date?: string; p_dependentes?: number }
        Returns: Json
      }
      calc_juros: {
        Args: {
          p_from_date: string
          p_rule?: string
          p_to_date: string
          p_value: number
        }
        Returns: Json
      }
      get_next_queued_document: {
        Args: never
        Returns: {
          case_id: string
          document_id: string
          priority: number
          queue_id: string
        }[]
      }
      get_reference_version: {
        Args: { p_date: string; p_table_slug: string }
        Returns: string
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
      party_type: "reclamante" | "reclamada"
      processing_status:
        | "pending"
        | "queued"
        | "processing"
        | "chunking"
        | "embedding"
        | "completed"
        | "failed"
        | "retrying"
      snapshot_status: "gerado" | "revisao" | "aprovado"
      termination_type:
        | "sem_justa_causa"
        | "justa_causa"
        | "pedido_demissao"
        | "rescisao_indireta"
        | "acordo"
      validation_action: "aprovar" | "editar" | "rejeitar"
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
      party_type: ["reclamante", "reclamada"],
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
      snapshot_status: ["gerado", "revisao", "aprovado"],
      termination_type: [
        "sem_justa_causa",
        "justa_causa",
        "pedido_demissao",
        "rescisao_indireta",
        "acordo",
      ],
      validation_action: ["aprovar", "editar", "rejeitar"],
    },
  },
} as const
