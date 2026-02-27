

# Reconstrução Completa: Replica PJe-Calc CSJT

## Visao Geral

Reconstruir o sistema do zero para ser uma replica fiel do PJe-Calc do CSJT, mantendo a mesma estrutura de navegacao, modulos, fluxo de dados e logica de calculo. O backend (engines) ja implementado sera preservado e conectado a uma nova UI identica.

## Arquitetura do PJe-Calc (Modulos Oficiais)

O PJe-Calc organiza um calculo em torno de um **Processo** com os seguintes modulos:

```text
+------------------------------------------------------+
|                    PROCESSO (Caso)                    |
+------------------------------------------------------+
| 1. Dados do Processo (partes, vara, datas)            |
| 2. Parametros do Calculo                              |
| 3. Historico Salarial                                 |
| 4. Faltas                                             |
| 5. Ferias                                             |
| 6. Cartao de Ponto                                    |
| 7. Verbas (principal + reflexas + ocorrencias)        |
| 8. FGTS                                               |
| 9. Contribuicao Social (segurado + empregador)        |
| 10. Imposto de Renda (Art. 12-A, Lei 7.713/88)       |
| 11. Correcao Monetaria + Juros de Mora                |
| 12. Resumo / Relatorio                                |
+------------------------------------------------------+
```

## O Que Existe Hoje vs O Que Precisa Mudar

### Engines (Backend) - PRESERVAR
- `src/lib/pjecalc/engine-verbas.ts` - OK, formula identica
- `src/lib/pjecalc/engine-fgts.ts` - OK
- `src/lib/pjecalc/engine-contribuicao-social.ts` - OK
- `src/lib/pjecalc/engine-correcao-juros.ts` - OK
- `src/lib/pjecalc/types.ts` - OK

### UI/Paginas - REFAZER COMPLETAMENTE
A UI atual e um "Case Workspace" generico com abas (Documentos, Validacao, Calculo, Roteiro). Precisa virar uma interface identica ao PJe-Calc com navegacao lateral por modulo.

### Engine de IR (Art. 12-A) - CRIAR
Modulo de IRRF ainda nao existe no pjecalc/.

## Plano de Implementacao (Modulo por Modulo)

### Fase 1: Estrutura Base e Navegacao

**1.1 - Nova pagina PJeCalc (rota /pjecalc/:caseId)**
- Layout com sidebar esquerda listando os 12 modulos
- Area principal que renderiza o modulo selecionado
- Barra superior com nome do processo e acoes (Salvar, Calcular, Exportar)
- Visual inspirado no PJe-Calc: tabelas densas, formularios compactos

**1.2 - Componente PjeCalcLayout**
- Sidebar com icones e labels para cada modulo
- Indicador de progresso/status por modulo
- Navegacao sequencial (Anterior/Proximo)

### Fase 2: Modulos de Entrada de Dados

**2.1 - Dados do Processo**
- Formulario: partes (reclamante/reclamada), vara, tribunal
- Datas: admissao, demissao, ajuizamento
- Tipo de demissao, regime de trabalho
- Conecta com tabelas `cases`, `parties`, `employment_contracts`

**2.2 - Parametros do Calculo**
- Formulario identico ao PJe-Calc: prescricao, aviso previo, carga horaria
- Sabado util, feriados estaduais/municipais
- Salva em `pjecalc_parametros`

**2.3 - Historico Salarial**
- Tabela editavel com periodos e valores
- Tipo: informado vs calculado (salario minimo, piso)
- Flags de incidencia (FGTS, CS)
- Geracao automatica de ocorrencias mensais
- Salva em `pjecalc_historico_salarial` + `pjecalc_historico_ocorrencias`

**2.4 - Faltas**
- Tabela de periodos de falta
- Justificada/nao justificada
- Salva em `pjecalc_faltas`

**2.5 - Ferias**
- Tabela de periodos aquisitivos/concessivos
- Situacao: gozadas, indenizadas, perdidas
- Dobra, abono, periodos de gozo
- Nova tabela `pjecalc_ferias`

**2.6 - Cartao de Ponto** (futuro)
- Upload de planilha CSV com horas por dia
- Parsing automatico de colunas

### Fase 3: Modulo de Verbas (Core)

**3.1 - Lista de Verbas**
- Tabela principal com todas as verbas do calculo
- Botoes: Adicionar Verba Principal, Adicionar Verba Reflexa
- Drag-and-drop para reordenar
- Cada verba mostra: nome, tipo, periodo, total devido, total pago, diferenca

**3.2 - Editor de Verba**
- Dialog/painel lateral com TODOS os campos do PJe-Calc:
  - Tipo (principal/reflexa), Caracteristica (comum/13o/ferias/aviso)
  - Base de calculo (selecionar historicos + verbas)
  - Divisor (carga horaria, dias uteis, informado)
  - Multiplicador (ate 8 casas decimais)
  - Quantidade (informada, avos, calendario)
  - Incidencias (FGTS, IRPF, CS)
  - Exclusoes (faltas, ferias gozadas)
  - Juros, dobra, zerar negativo

**3.3 - Ocorrencias da Verba (mes a mes)**
- Tabela com uma linha por competencia
- Colunas: Competencia, Base, Divisor, Mult, Qtd, Dobra, Devido, Pago, Diferenca
- Celulas editaveis (override manual como no PJe-Calc)
- Recalculo automatico ao editar

### Fase 4: Modulos de Encargos

**4.1 - FGTS**
- Painel com parametros (tipo demissao, aliquota, multa)
- Tabela de depositos por competencia
- Separacao de base comum vs 13o
- Multa 40%/20%, LC 110
- Conecta com `engine-fgts.ts`

**4.2 - Contribuicao Social**
- Abas: Segurado / Empregador
- Segurado: tabela progressiva por competencia
- Empregador: empresa + SAT + terceiros
- Conecta com `engine-contribuicao-social.ts`

**4.3 - Imposto de Renda (Art. 12-A)**
- NOVO ENGINE: `src/lib/pjecalc/engine-irrf.ts`
- RRA (Rendimentos Recebidos Acumuladamente)
- Tabela progressiva acumulada (meses de acumulacao)
- 13o com tributacao exclusiva
- Deducoes: dependentes, pensao alimenticia, previdencia

### Fase 5: Correcao e Resultado

**5.1 - Correcao Monetaria + Juros**
- Seletor de regime (ADC 58/59, TR+1%, IPCA-E, SELIC, personalizado)
- Tabela mês a mês: nominal, fator, corrigido, juros, atualizado
- Multa 523 CPC, honorarios
- Conecta com `engine-correcao-juros.ts`

**5.2 - Resumo / Relatorio**
- Visao consolidada identica ao PJe-Calc
- Secoes: Verbas Principais, Reflexas, FGTS, CS, IR, Correcao
- Totais parciais e total geral
- Exportar PDF/Excel

### Fase 6: Banco de Dados

**Nova tabela necessaria:**
- `pjecalc_ferias` - periodos aquisitivos/concessivos
- `pjecalc_verba_ocorrencias` - ocorrencias editadas pelo usuario

**Tabelas existentes a usar:**
- `pjecalc_parametros` (ja existe)
- `pjecalc_historico_salarial` (ja existe)
- `pjecalc_historico_ocorrencias` (ja existe)
- `pjecalc_faltas` (ja existe)
- `pjecalc_verbas` (ja existe)

### Fase 7: Integracao com Sistema Existente

- Manter o fluxo atual de Casos (upload de documentos, extracao, etc.)
- Adicionar botao "Abrir no PJe-Calc" dentro do CasoDetalhe
- Rota: `/pjecalc/:caseId`
- Os dados extraidos dos documentos pre-preenchem os formularios do PJe-Calc

## Detalhes Tecnicos

### Componentes Novos (UI)
```text
src/pages/PjeCalc.tsx                          -- Pagina principal
src/components/pjecalc/PjeCalcLayout.tsx        -- Layout com sidebar
src/components/pjecalc/PjeCalcSidebar.tsx       -- Navegacao lateral
src/components/pjecalc/modules/
  DadosProcesso.tsx                             -- Modulo 1
  ParametrosCalculo.tsx                         -- Modulo 2
  HistoricoSalarial.tsx                         -- Modulo 3
  Faltas.tsx                                    -- Modulo 4
  Ferias.tsx                                    -- Modulo 5
  CartaoPonto.tsx                               -- Modulo 6 (placeholder)
  Verbas.tsx                                    -- Modulo 7 (lista)
  VerbaEditor.tsx                               -- Editor de verba
  VerbaOcorrencias.tsx                          -- Ocorrencias mes a mes
  FGTSPanel.tsx                                 -- Modulo 8
  ContribuicaoSocial.tsx                        -- Modulo 9
  ImpostoRenda.tsx                              -- Modulo 10
  CorrecaoJuros.tsx                             -- Modulo 11
  Resumo.tsx                                    -- Modulo 12
```

### Engine Novo
```text
src/lib/pjecalc/engine-irrf.ts                 -- IRRF Art. 12-A
```

### Ordem de Execucao
Vou implementar modulo por modulo, apresentando cada um para aprovacao antes de ir ao proximo:
1. Layout + Navegacao
2. Dados do Processo + Parametros
3. Historico Salarial + Faltas + Ferias
4. Verbas (core) com ocorrencias
5. FGTS + CS + IR
6. Correcao + Resumo

