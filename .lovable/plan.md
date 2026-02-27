

# Reestruturação: Sidebar PJe-Calc + Cálculo Integrado

## Visão Geral

A sidebar será simplificada para conter apenas **Casos** (fluxo principal) e **Tabelas** (referência do PJe-Calc), conforme a imagem de referência. O fluxo dentro de cada caso permanece: Upload → OCR → Validação → Cálculo (agora usando a metodologia PJe-Calc diretamente na tela do caso).

---

## 1. Nova Sidebar

Remover: Dashboard, Regras & Tabelas, Busca, Biblioteca, e todo o bloco Administração.

Manter/Adicionar:
- **Casos** (fluxo principal)
- **Tabelas** (submenu colapsável com os itens do PJe-Calc):
  - Salário Mínimo
  - Pisos Salariais
  - Salário-família
  - Seguro-desemprego
  - Vale-transporte
  - Feriados e Pontos Facultativos
  - Verbas
  - Contribuição Social
  - Imposto de Renda
  - Custas Judiciais
  - Correção Monetária
  - Juros de Mora
  - Atualização de Tabelas e Índices

Cada item de Tabelas abrirá uma sub-rota `/tabelas/:tipo` que exibe os dados de referência correspondentes.

---

## 2. Nova Página de Tabelas

Criar uma página única `/tabelas/:tipo` que renderiza a tabela de referência selecionada, buscando dados das tabelas existentes no banco (`reference_tables`, `tax_tables`, `index_series`). Os 13 tipos de tabela compartilham o mesmo layout (grid com filtro por vigência/ano).

---

## 3. Integração PJe-Calc no Caso

O fluxo do caso fica:
1. **Documentos** - Upload + OCR (sem mudança)
2. **Validação** - Extração e confirmação de fatos (sem mudança)
3. **Cálculo** - Substituir o motor atual pela interface completa do PJe-Calc (10 módulos: Parâmetros, Faltas, Férias, Histórico Salarial, Verbas, FGTS, CS, IR, Correção/Juros, Resumo) renderizada inline na aba de cálculo do caso, sem precisar navegar para `/pjecalc/:id`

Os fatos validados alimentam automaticamente os Parâmetros do PJe-Calc (datas, salário, jornada, tipo de demissão).

---

## 4. Limpeza de Rotas

- Remover rotas: `/` (Index/Dashboard), `/documentos`, `/busca`, `/configuracoes`, `/regras-tabelas`, `/admin/*`
- Redirecionar `/` para `/casos`
- Manter `/pjecalc/:id` como fallback mas o acesso principal será inline no caso
- Adicionar `/tabelas/:tipo`

---

## Detalhes Técnicos

### Arquivos a modificar:
| Arquivo | Ação |
|---------|------|
| `src/components/layout/SidebarPremium.tsx` | Reescrever com Casos + Tabelas (submenu colapsável) |
| `src/App.tsx` | Remover rotas desnecessárias, adicionar `/tabelas/:tipo`, redirecionar `/` para `/casos` |
| `src/pages/CasoDetalhe.tsx` | Embutir o PJe-Calc completo na aba "Cálculo" (importar módulos do PjeCalcPage inline) |

### Arquivos a criar:
| Arquivo | Descrição |
|---------|-----------|
| `src/pages/Tabelas.tsx` | Página unificada de tabelas de referência com sub-navegação por tipo |

### Páginas que deixam de ser usadas (rotas removidas):
- `Index.tsx`, `Documentos.tsx`, `Busca.tsx`, `Configuracoes.tsx`, `RegrasTabelas.tsx`
- `admin/Calculadoras.tsx`, `admin/Perfis.tsx`, `admin/Indices.tsx`, `admin/Testes.tsx`

Esses arquivos **não serão deletados** (evitar perda), apenas desconectados das rotas.

