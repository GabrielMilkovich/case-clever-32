// =====================================================
// COMPONENTE: SELETOR DE PERFIL DE CÁLCULO
// =====================================================

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  Settings,
  Plus,
  Check,
  DollarSign,
  Percent,
  Clock,
} from "lucide-react";

interface ProfileConfig {
  atualizacao: string;
  juros: string;
  arredondamento: string;
}

interface CalculationProfile {
  id: string;
  nome: string;
  descricao: string | null;
  config: ProfileConfig;
  calculadoras_incluidas: string[];
}

interface ProfileSelectorProps {
  selectedProfileId: string | null;
  onProfileSelect: (profileId: string, profile: CalculationProfile) => void;
  onCreateCustom?: () => void;
}

const atualizacaoLabels: Record<string, string> = {
  ipca_e: "IPCA-E",
  inpc: "INPC",
  tr: "TR",
  selic: "SELIC",
  nenhum: "Sem atualização",
};

const jurosLabels: Record<string, string> = {
  selic: "SELIC",
  "1_am": "1% ao mês",
  "0.5_am": "0,5% ao mês",
  nenhum: "Sem juros",
};

const arredondamentoLabels: Record<string, string> = {
  competencia: "Por competência",
  final: "No total final",
  nenhum: "Sem arredondamento",
};

export function ProfileSelector({
  selectedProfileId,
  onProfileSelect,
  onCreateCustom,
}: ProfileSelectorProps) {
  const [showPreview, setShowPreview] = useState<string | null>(null);

  // Buscar perfis
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["calculation_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calculation_profiles")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data.map((p) => ({
        ...p,
        config: (p.config as unknown as ProfileConfig) || { atualizacao: "ipca_e", juros: "selic", arredondamento: "competencia" },
        calculadoras_incluidas: p.calculadoras_incluidas || [],
      })) as CalculationProfile[];
    },
  });

  const previewProfile = profiles.find((p) => p.id === showPreview);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Perfil de Cálculo
              </CardTitle>
              <CardDescription>
                Escolha um perfil pré-configurado ou crie um customizado
              </CardDescription>
            </div>
            {onCreateCustom && (
              <Button variant="outline" onClick={onCreateCustom} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar Perfil Customizado
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum perfil cadastrado. Crie um perfil para começar.
            </div>
          ) : (
            <RadioGroup
              value={selectedProfileId || ""}
              onValueChange={(value) => {
                const profile = profiles.find((p) => p.id === value);
                if (profile) onProfileSelect(value, profile);
              }}
            >
              <div className="space-y-3">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className={`relative flex items-start gap-4 p-4 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                      selectedProfileId === profile.id
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                    onClick={() => onProfileSelect(profile.id, profile)}
                  >
                    <RadioGroupItem value={profile.id} id={profile.id} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Label htmlFor={profile.id} className="font-semibold cursor-pointer">
                          {profile.nome}
                        </Label>
                        {selectedProfileId === profile.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      {profile.descricao && (
                        <p className="text-sm text-muted-foreground">{profile.descricao}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs gap-1">
                          <DollarSign className="h-3 w-3" />
                          {atualizacaoLabels[profile.config.atualizacao] || profile.config.atualizacao}
                        </Badge>
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Percent className="h-3 w-3" />
                          {jurosLabels[profile.config.juros] || profile.config.juros}
                        </Badge>
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Clock className="h-3 w-3" />
                          {arredondamentoLabels[profile.config.arredondamento] || profile.config.arredondamento}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPreview(profile.id);
                      }}
                    >
                      Ver detalhes
                    </Button>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}
        </CardContent>
      </Card>

      {/* Modal de preview */}
      <Dialog open={!!showPreview} onOpenChange={(open) => !open && setShowPreview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{previewProfile?.nome}</DialogTitle>
          </DialogHeader>
          {previewProfile && (
            <div className="space-y-4">
              {previewProfile.descricao && (
                <p className="text-muted-foreground">{previewProfile.descricao}</p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Atualização Monetária</p>
                  <p className="font-semibold">
                    {atualizacaoLabels[previewProfile.config.atualizacao]}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Juros</p>
                  <p className="font-semibold">
                    {jurosLabels[previewProfile.config.juros]}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Arredondamento</p>
                  <p className="font-semibold">
                    {arredondamentoLabels[previewProfile.config.arredondamento]}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Calculadoras</p>
                  <p className="font-semibold">
                    {previewProfile.calculadoras_incluidas.length || "Todas"}
                  </p>
                </div>
              </div>
              {previewProfile.calculadoras_incluidas.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Calculadoras incluídas:</p>
                  <div className="flex flex-wrap gap-1">
                    {previewProfile.calculadoras_incluidas.map((calc) => (
                      <Badge key={calc} variant="outline">
                        {calc}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <Button
                className="w-full"
                onClick={() => {
                  onProfileSelect(previewProfile.id, previewProfile);
                  setShowPreview(null);
                }}
              >
                Selecionar este perfil
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Perfil selecionado */}
      {selectedProfileId && (
        <Card className="bg-primary/5 border-primary">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">
                  Perfil selecionado: {profiles.find((p) => p.id === selectedProfileId)?.nome}
                </p>
                <p className="text-sm text-muted-foreground">
                  Pronto para executar o cálculo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
