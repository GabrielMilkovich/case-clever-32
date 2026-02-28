import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserCog, Shield, Eye, EyeOff, Info } from "lucide-react";

// =====================================================
// PERFIS DE ACESSO — PJe-Calc CSJT
// Define quais módulos e ações cada perfil pode ver/editar
// =====================================================

export type PerfilTipo = 'perito' | 'advogado_reclamante' | 'advogado_reclamada' | 'juiz' | 'administrador';

interface PerfilConfig {
  tipo: PerfilTipo;
  label: string;
  descricao: string;
  cor: string;
  modulos_visiveis: string[];
  modulos_editaveis: string[];
  pode_aprovar: boolean;
  pode_exportar: boolean;
  pode_comparar: boolean;
}

const PERFIS: PerfilConfig[] = [
  {
    tipo: 'perito',
    label: 'Perito Judicial',
    descricao: 'Acesso completo a todos os módulos. Pode editar, aprovar e exportar.',
    cor: 'bg-blue-500/10 text-blue-700',
    modulos_visiveis: ['*'],
    modulos_editaveis: ['*'],
    pode_aprovar: true,
    pode_exportar: true,
    pode_comparar: true,
  },
  {
    tipo: 'advogado_reclamante',
    label: 'Advogado do Reclamante',
    descricao: 'Pode visualizar todos os módulos, editar verbas e parâmetros. Não pode aprovar.',
    cor: 'bg-green-500/10 text-green-700',
    modulos_visiveis: ['*'],
    modulos_editaveis: ['parametros', 'faltas', 'ferias', 'historico', 'verbas', 'cartao_ponto', 'fgts', 'cs', 'ir', 'correcao', 'honorarios', 'custas', 'pensao', 'seguro', 'salario_familia', 'multas', 'prev_privada'],
    pode_aprovar: false,
    pode_exportar: true,
    pode_comparar: true,
  },
  {
    tipo: 'advogado_reclamada',
    label: 'Advogado da Reclamada',
    descricao: 'Visualização completa. Pode criar cenários alternativos e impugnações.',
    cor: 'bg-orange-500/10 text-orange-700',
    modulos_visiveis: ['*'],
    modulos_editaveis: ['comparacao', 'custas', 'honorarios'],
    pode_aprovar: false,
    pode_exportar: true,
    pode_comparar: true,
  },
  {
    tipo: 'juiz',
    label: 'Juiz / Magistrado',
    descricao: 'Acesso somente leitura com foco em resumo, revisão e aprovação.',
    cor: 'bg-purple-500/10 text-purple-700',
    modulos_visiveis: ['dados_processo', 'parametros', 'resumo', 'memoria', 'comparacao', 'revisao', 'rastreabilidade', 'auditoria'],
    modulos_editaveis: [],
    pode_aprovar: true,
    pode_exportar: true,
    pode_comparar: true,
  },
  {
    tipo: 'administrador',
    label: 'Administrador',
    descricao: 'Acesso total ao sistema incluindo configurações, tabelas e testes.',
    cor: 'bg-red-500/10 text-red-700',
    modulos_visiveis: ['*'],
    modulos_editaveis: ['*'],
    pode_aprovar: true,
    pode_exportar: true,
    pode_comparar: true,
  },
];

const TODOS_MODULOS = [
  'dados_processo', 'parametros', 'faltas', 'ferias', 'historico', 'cartao_ponto',
  'verbas', 'fgts', 'cs', 'ir', 'correcao', 'seguro', 'salario_familia', 'multas',
  'pensao', 'prev_privada', 'honorarios', 'custas', 'resumo', 'tabelas_regionais',
  'memoria', 'comparacao', 'revisao', 'rastreabilidade', 'auditoria', 'dashboard',
];

interface Props {
  currentPerfil: PerfilTipo;
  onChangePerfil: (perfil: PerfilTipo) => void;
}

export function PerfilAcesso({ currentPerfil, onChangePerfil }: Props) {
  const [open, setOpen] = useState(false);
  const perfil = PERFIS.find(p => p.tipo === currentPerfil) || PERFIS[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1.5">
          <UserCog className="h-3.5 w-3.5" />
          <Badge variant="secondary" className={`text-[9px] ${perfil.cor}`}>{perfil.label}</Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Perfil de Acesso ao Cálculo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-start gap-2 text-[10px] text-muted-foreground p-2 bg-muted/30 rounded">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>O perfil de acesso controla quais módulos são visíveis e editáveis. Selecione o perfil adequado para a função exercida no processo.</span>
          </div>

          <div className="space-y-2">
            {PERFIS.map(p => {
              const isActive = p.tipo === currentPerfil;
              const modulosVisiveis = p.modulos_visiveis[0] === '*' ? TODOS_MODULOS.length : p.modulos_visiveis.length;
              const modulosEditaveis = p.modulos_editaveis[0] === '*' ? TODOS_MODULOS.length : p.modulos_editaveis.length;

              return (
                <Card
                  key={p.tipo}
                  className={`cursor-pointer transition-all ${isActive ? 'border-primary ring-1 ring-primary/20' : 'hover:border-primary/30'}`}
                  onClick={() => { onChangePerfil(p.tipo); setOpen(false); }}
                >
                  <CardContent className="p-3 flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${p.cor}`}>
                      <UserCog className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{p.label}</span>
                        {isActive && <Badge variant="default" className="text-[9px]">Ativo</Badge>}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{p.descricao}</p>
                      <div className="flex gap-3 mt-1.5 text-[9px]">
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {modulosVisiveis} módulos</span>
                        <span className="flex items-center gap-1">{modulosEditaveis > 0 ? <Eye className="h-3 w-3 text-primary" /> : <EyeOff className="h-3 w-3" />} {modulosEditaveis} editáveis</span>
                        {p.pode_aprovar && <Badge variant="outline" className="text-[8px]">Pode aprovar</Badge>}
                        {p.pode_exportar && <Badge variant="outline" className="text-[8px]">Exportar</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Helper: check if a module is visible for a given profile */
export function isModuloVisivel(perfil: PerfilTipo, modulo: string): boolean {
  const p = PERFIS.find(pr => pr.tipo === perfil);
  if (!p) return true;
  return p.modulos_visiveis[0] === '*' || p.modulos_visiveis.includes(modulo);
}

/** Helper: check if a module is editable for a given profile */
export function isModuloEditavel(perfil: PerfilTipo, modulo: string): boolean {
  const p = PERFIS.find(pr => pr.tipo === perfil);
  if (!p) return true;
  return p.modulos_editaveis[0] === '*' || p.modulos_editaveis.includes(modulo);
}
