import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RubricaExtraida {
  codigo: string;
  denominacao: string;
  classificacao: string;
  valores_mensais: { competencia: string; valor: number }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { texto_documento, tipo_documento, ano_referencia } = await req.json();

    if (!texto_documento) {
      return new Response(JSON.stringify({ error: "Texto do documento é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const tipoLabel = tipo_documento === "contracheque" ? "Demonstrativo de Pagamento (Contracheque)" : "Ficha Financeira";

    const systemPrompt = `Você é um especialista em análise de documentos trabalhistas brasileiros. 
Sua tarefa é extrair dados estruturados de ${tipoLabel}.

REGRAS FUNDAMENTAIS:
${tipo_documento === "contracheque" ? `
- Considere APENAS valores na coluna "VENCIMENTOS" (pagamentos ao empregado)
- IGNORE valores na coluna "DESCONTOS"
- Cada demonstrativo refere-se a um único mês (referência no cabeçalho)
- A referência do mês está no campo "REFERÊNCIA" (ex: JAN/2018)
` : `
- Considere APENAS linhas cuja 3ª coluna "Clas." contenha "PGTO" (pagamento)
- IGNORE linhas com classificação diferente de "PGTO" (como DESC, etc.)
- Cada coluna após "Clas." representa um mês do ano (Janeiro, Fevereiro, etc.)
- Valores em branco significam que não houve pagamento naquele mês
`}

CATEGORIZAÇÃO POR COR/NATUREZA:
- Comissões: códigos como 0620 (Comissões), 1307 (equivalentes)
- DSR: códigos como 0501 (DSR Comissão), 0502 (DSR H.Extra)
- Prêmios/Gratificações: códigos como 2377, 2477, 2481, 3290 (Prêmio, Antecipação Prêmio)
- Adicional Noturno: código 1800
- Horas Extras: códigos como 4001
- Salário Base/Fixo: quando houver
- Outros Vencimentos: demais rubricas PGTO

FORMATO DE SAÍDA:
Retorne um JSON com a seguinte estrutura:
{
  "ano": number,
  "empregado": string,
  "empresa": string,
  "rubricas": [
    {
      "codigo": "0620",
      "denominacao": "Comissões",
      "classificacao": "PGTO",
      "categoria": "comissao|dsr|premio|adicional_noturno|hora_extra|salario_base|outros",
      "valores_mensais": [
        { "competencia": "2018-01", "valor": 1908.91 },
        { "competencia": "2018-02", "valor": 1500.00 }
      ]
    }
  ],
  "resumo_mensal": [
    { "competencia": "2018-01", "total_vencimentos": 3500.00 }
  ]
}

IMPORTANTE:
- Valores monetários devem ser números (sem R$, sem pontos de milhar — use ponto para decimal)
- Competências no formato YYYY-MM
- Se o ano não estiver claro, use ${ano_referencia || "o ano mencionado no documento"}
- Não invente dados — se um valor estiver ilegível, omita-o`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analise o seguinte documento e extraia os dados conforme instruído:\n\n${texto_documento}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extrair_dados_financeiros",
            description: "Extrai dados estruturados de ficha financeira ou contracheque",
            parameters: {
              type: "object",
              properties: {
                ano: { type: "number" },
                empregado: { type: "string" },
                empresa: { type: "string" },
                rubricas: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      codigo: { type: "string" },
                      denominacao: { type: "string" },
                      classificacao: { type: "string" },
                      categoria: { type: "string", enum: ["comissao", "dsr", "premio", "adicional_noturno", "hora_extra", "salario_base", "outros"] },
                      valores_mensais: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            competencia: { type: "string" },
                            valor: { type: "number" }
                          },
                          required: ["competencia", "valor"]
                        }
                      }
                    },
                    required: ["codigo", "denominacao", "categoria", "valores_mensais"]
                  }
                },
                resumo_mensal: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      competencia: { type: "string" },
                      total_vencimentos: { type: "number" }
                    },
                    required: ["competencia", "total_vencimentos"]
                  }
                }
              },
              required: ["ano", "rubricas"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "extrair_dados_financeiros" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("Falha na análise do documento");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("IA não retornou dados estruturados");
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("parse-ficha-financeira error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
