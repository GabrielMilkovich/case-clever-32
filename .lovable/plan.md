
# Correção do INSS: Desconto Obrigatório sobre Verbas Rescisórias

## Problema Identificado

O INSS retorna R$ 0,00 por **dois motivos**:

1. **A rubrica INSS só percorre `dadosMensais`** (dados de contracheque mês a mês), mas as verbas rescisórias (Saldo de Salário, Férias, 13o, Aviso Prévio) são calculadas por rubricas separadas e **não estão em `dadosMensais`**. Por isso, o INSS nunca "enxerga" essas verbas.

2. **A tabela de faixas está com valores de 2024** (salário mínimo R$ 1.412,00). Para competências de 2025, a tabela correta é a da Portaria MPS/MF n. 6/2025 (salário mínimo R$ 1.518,00).

## Plano de Correção

### 1. Atualizar faixas INSS para 2025
No arquivo `src/lib/calculation/engine/RubricaEngine.ts`, atualizar o array `faixas` dentro de `INSSRubrica.calcular()` para incluir ambas as tabelas (2024 e 2025) e selecionar automaticamente com base na competência:

- **2024**: R$ 1.412,00 / R$ 2.666,68 / R$ 4.000,03 / R$ 7.786,02
- **2025**: R$ 1.518,00 / R$ 2.793,88 / R$ 4.190,83 / R$ 8.157,41

### 2. Incluir verbas rescisórias na base do INSS
Modificar `INSSRubrica.calcular()` para, alem de processar `dadosMensais`, também calcular INSS sobre as verbas rescisórias tributaveis:

- Saldo de Salario (`SALDO_SAL`) -- tributavel
- Aviso Previo Indenizado (`AVISO_PREVIO`) -- tributavel
- 13o Proporcional (`DECIMO_PROP`) -- tributavel em separado (tabela propria)
- Ferias Vencidas/Proporcionais -- **isentas de INSS** (Sumula 89 do extinto TFR / Art. 28, para. 9, "d", Lei 8.212/91)

O INSS sera aplicado sobre a soma de Saldo de Salario + Aviso Previo como uma "competencia de rescisao", usando a tabela vigente na data de demissao.

### 3. Adicionar dependencias de rescisao ao INSS
Atualizar o array `dependencias` da rubrica INSS para incluir `SALDO_SAL`, `AVISO_PREVIO`, `DECIMO_PROP`.

### 4. Gerar audit trail do desconto
Cada faixa aplicada sera registrada com `registrarPasso()` mostrando a formula completa, garantindo rastreabilidade total.

## Detalhes Tecnicos

**Arquivo**: `src/lib/calculation/engine/RubricaEngine.ts` (classe `INSSRubrica`)

```text
INSSRubrica.calcular()
  |
  +-- Loop 1: dadosMensais (existente, corrigir tabela por ano)
  |
  +-- Loop 2: [NOVO] Verbas rescisorias tributaveis
  |     |-- Saldo Salario
  |     |-- Aviso Previo Indenizado
  |     +-- base = soma dessas verbas
  |          |-- Aplicar faixas progressivas (tabela do ano de demissao)
  |          +-- Gerar CalcResultItem com competencia = mes rescisao
  |
  +-- Item separado: 13o Proporcional (tributacao isolada Art. 214, para. 6, RPS)
```

**Resultado esperado para o caso Jefferson** (salario R$ 3.159,63, justa causa jan/2025):
- Base INSS rescisoria: R$ 3.159,63 (saldo salario 30 dias)
- INSS progressivo 2025: R$ 1.518,00 x 7,5% + (R$ 1.641,63) x 9% = R$ 113,85 + R$ 147,75 = **R$ 261,60**
- Total liquido corrigido: R$ 7.625,39 - R$ 261,60 = **R$ 7.363,79**
