import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Sparkles, FileText, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Busca() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Busca Semântica</h1>
          <p className="text-muted-foreground">
            Pesquise em todos os documentos usando linguagem natural
          </p>
        </div>

        {/* Search Box */}
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="relative">
                <Textarea
                  placeholder="Ex: Quais são os valores de horas extras mencionados nos holerites?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-h-[100px] resize-none pr-12"
                />
                <Sparkles className="absolute right-4 top-4 h-5 w-5 text-accent" />
              </div>
              <div className="flex justify-end">
                <Button className="gap-2">
                  <Search className="h-4 w-4" />
                  Buscar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">IA Avançada</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Busca semântica usando embeddings vetoriais para encontrar informações relevantes.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <FileText className="h-5 w-5 text-accent" />
                </div>
                <CardTitle className="text-base">Todos os Documentos</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Pesquisa em petições, TRCTs, holerites, cartões de ponto e sentenças.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-status-calculated/10">
                  <Sparkles className="h-5 w-5 text-status-calculated" />
                </div>
                <CardTitle className="text-base">Linguagem Natural</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Faça perguntas em português como faria para um assistente.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Empty State */}
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Faça sua primeira busca
            </h3>
            <p className="text-muted-foreground text-center max-w-md">
              A busca semântica permite encontrar informações específicas em todos os seus documentos
              usando perguntas em linguagem natural.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
