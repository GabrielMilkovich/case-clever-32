

# Plano: Implementar Paridade MRDcalc = PJe-Calc 1:1 (Caso Maria Madalena)

## Diagnóstico do Caso Real (extraído do PJC XML em `src/data/caso-real.pjc`)

**Caso:** Maria Madalena Alves Ferreira vs. Grupo Casas Bahia S.A.
- Admissão: 07/03/2015 | Demissão: 02/03/2021 | Ajuizamento: 16/04/2021
- Carga: 220h | Sábado=dia útil | Projeta aviso | Feriados estadual+municipal
- Líquido exequente: R$ 46.426,51 | INSS reclamante: R$ 3.299,38 | INSS reclamado: R$ 9.151,51 | IR: R$ 0,00
- Honorários: R$ 4.853,99 (Marcos Roberto Dias)

**Verbas no PJC (DAG):**
```text
COMISSÕES ESTORNADAS (8337) ── Calculada, VARIAVEL, MENSAL
  Base: HISTORICO_SALARIAL | Div: 1 | Mult: 1 | Qtd: 1 INFORMADA | Pago: 0
  excluirFaltas=true, excluirFerias=true
  └── ARTIGO 384 DA CLT (8378) ── Calculada, VARIAVEL, MENSAL
        Base: HISTORICO_SALARIAL + BaseVerba[8337, integralizar=NAO]
        Div: CARGA_HORARIA(220) | Mult: 1.5 | Qtd: CARTAO_PONTO(ART384)
        excluirFaltas=true, excluirFerias=true
        └── 13º SOBRE ART 384 (8379) ── Reflexo
              Base: BaseVerba[8378, integralizar=SIM]
              Comportamento: MEDIA_PELA_QUANTIDADE | Período: ANO_CIVIL
              Fração: MANTER | Característica: DECIMO_TERCEIRO_SALARIO
        └── FÉRIAS+1/3 SOBRE ART 384 (8380) ── Reflexo
              Base: BaseVerba[8378, integralizar=SIM]
              Comportamento: MEDIA_PELA_QUANTIDADE | Período: PERIODO_AQUISITIVO
```

## Gaps Críticos Identificados no Engine Atual

### GAP 1 — `MEDIA_PELA_QUANTIDADE` ausente (P0)
**Evidência:** `engine.ts:2355-2368` — O case `media_quantidade` calcula média das quantidades e gera 1 ocorrência global. O PJe-Calc `MEDIA_PELA_QUANTIDADE` faz: soma(diferenças) / soma(quantidades) = média ponderada, agrupado por ANO_CIVIL ou PERIODO_AQUISITIVO, gerando 1 ocorrência por grupo.

### GAP 2 — Agrupamento ANO_CIVIL / PERIODO_AQUISITIVO ausente (P0)
**Evidência:** `engine.ts:2321-2332` — Todos os comportamentos de reflexo geram apenas 1 ocorrência global. O PJC do caso real gera 1 ocorrência por ano (13º) ou por período aquisitivo (férias).

### GAP 3 — Campos integral (baseIntegral, quantidadeIntegral, devidoIntegral) ausentes (P0)
**Evidência:** `engine.ts:402-417` — `PjeOcorrenciaResult` não tem campos `_integral`. O PJC armazena pares fracionário/integral em cada ocorrência (ex: base=3.25, baseIntegral=48.75).

### GAP 4 — Art. 384 CLT não registrado (P1)
**Evidência:** `RubricaRegistry.ts` — 16 rubricas registradas, nenhuma é Art. 384. A fórmula `(HistSal + Comissões) × 1.5 / 220 × HorasArt384` deve ser suportada pelo engine genérico (já funciona via parâmetros PjeVerba), mas precisa de template/preset.

### GAP 5 — Import PJC → Tabelas v2 desconectado (P1)
**Evidência:** `pjc-analyzer.ts` parseia o XML corretamente mas não persiste nas tabelas `pjecalc_*`. O import real deveria popular: `pjecalc_calculos`, `pjecalc_verba_base`, `pjecalc_reflexo`, `pjecalc_hist_salarial`, `pjecalc_evento_intervalo`, `pjecalc_apuracao_diaria`.

### GAP 6 — Export PJC gera JSON, não XML (P1)
**Evidência:** `pjc-export.ts` gera formato JSON proprietário. `pjc-xml-real.ts` tem gerador XML compatível mas não está wired à UI.

## Plano de Implementação (por prioridade)

### Fase 1 — Engine de Reflexos com Paridade (P0, 3-4 dias)

**1.1 — Adicionar `MEDIA_PELA_QUANTIDADE` ao engine**
- **Arquivo:** `src/lib/pjecalc/engine.ts`, método `calcularVerbaReflexa()`
- **Lógica:** Novo case que:
  - Pega ocorrências da verba base
  - Agrupa por ANO_CIVIL (para 13º) ou PERIODO_AQUISITIVO (para férias) conforme `periodo_media`
  - Para cada grupo: `média = soma(diferenças_integralizadas) / soma(quantidades)` × avos
  - Gera 1 ocorrência por grupo (não 1 global)
- **Teste:** Comparar com ocorrências do PJC real

**1.2 — Agrupamento por período**
- **Arquivo:** `src/lib/pjecalc/engine.ts`
- **Lógica:** Helper `agruparPorPeriodo(ocorrencias, modo)` que retorna Map<string, OcorrenciaResult[]>:
  - `ANO_CIVIL`: chave = ano (ex: "2016", "2017")
  - `PERIODO_AQUISITIVO`: chave = período aquisitivo das férias

**1.3 — Campos integral no PjeOcorrenciaResult**
- **Arquivo:** `src/lib/pjecalc/engine.ts`, interface `PjeOcorrenciaResult`
- Adicionar: `base_integral?: number`, `quantidade_integral?: number`, `devido_integral?: number`
- **Arquivo:** `calcularOcorrencia()` — calcular e armazenar valores integrais quando mês é fracionário

**1.4 — Integralização na BaseVerba**
- **Arquivo:** `src/lib/pjecalc/engine.ts`, `calcularVerbaReflexa()`
- Quando `integralizar=SIM`: usar `baseIntegral` e `quantidadeIntegral` da ocorrência base antes de calcular média

### Fase 2 — Preset Art. 384 e Templates (P1, 1-2 dias)

**2.1 — Template Art. 384 CLT**
- **Arquivo:** Novo preset em `reflexo-engine.ts` ou como verba parametrizável
- Fórmula: `(HistSal + ComissõesBase) × 1.5 / 220 × HorasArt384_CartaoPonto`
- Flags: excluirFaltas=true, excluirFerias=true

**2.2 — Atualizar reflexo-engine.ts**
- Adicionar template `MEDIA_PELA_QUANTIDADE` no `REFLEXO_TEMPLATES`
- Adicionar campo `periodo_media_reflexo` aos templates

### Fase 3 — Import PJC → Persistência v2 (P1, 2-3 dias)

**3.1 — Criar função `persistirPJCAnalysis()`**
- **Arquivo:** Novo `src/lib/pjecalc/pjc-persist.ts`
- Mapeia `PJCAnalysis` → inserts nas tabelas v2
- Cria `pjecalc_calculos`, popula `pjecalc_verba_base`, `pjecalc_reflexo`, `pjecalc_hist_salarial_mes`, etc.

**3.2 — Wiring na UI**
- Botão "Importar PJC" na tela do analisador chama `persistirPJCAnalysis()` e navega ao cálculo

### Fase 4 — Export PJC XML Real (P1, 1-2 dias)

**4.1 — Unificar export**
- Wiring: botão "Exportar .PJC" usa `pjc-xml-real.ts` generatePJCXml() ao invés do JSON
- Separar "MRDSTATE JSON" como export interno distinto

### Fase 5 — Golden Test Runner (P2, 1-2 dias)

**5.1 — Teste automatizado de paridade**
- **Arquivo:** `src/test/pjc-golden-test.test.ts`
- Importar caso-real.pjc → parsear com pjc-analyzer → executar engine → comparar ocorrência a ocorrência
- Critério: Δ ≤ R$ 0,01 por linha, Δ total ≤ R$ 0,05

### Fase 6 — Integridade e Segurança (P0, 1 dia)

**6.1 — Foreign Keys**
- Migration SQL: adicionar FKs com ON DELETE CASCADE em todas tabelas filhas de `pjecalc_calculos`

**6.2 — Bloqueio FECHADO no banco**
- Trigger: impedir UPDATE/DELETE em tabelas filhas quando `pjecalc_calculos.status = 'FECHADO'`

## Resumo Executivo

O engine atual (`engine.ts`, 2396 linhas) cobre ~80% da lógica do PJe-Calc: fórmula oficial com Decimal.js, ADC 58/59, INSS progressivo, IRRF RRA, FGTS com prescrição. Os 3 gaps que impedem paridade com o caso real são todos no método `calcularVerbaReflexa()`: (1) comportamento MEDIA_PELA_QUANTIDADE, (2) agrupamento por ANO_CIVIL/PA, e (3) integralização de base. Com essas 3 correções no engine + persistência do import PJC, o sistema poderá reproduzir o caso Maria Madalena com tolerância de centavos.

