import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scale, Mail, Lock, User, ArrowRight, Shield, BarChart3, FileCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Auth = React.forwardRef<HTMLDivElement, {}>(function Auth(_props, _ref) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) navigate("/");
    });
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate("/");
    };
    checkUser();
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      toast.error("Email ou senha incorretos");
    } else {
      toast.success("Bem-vindo de volta!");
      navigate("/");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Verifique seu email para confirmar a conta");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Digite seu email");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Email de recuperação enviado");
      setForgotMode(false);
    }
  };

  const features = [
    { icon: Shield, title: "Precisão Pericial", desc: "Cálculos auditáveis com rastreabilidade CLT completa" },
    { icon: FileCheck, title: "OCR Inteligente", desc: "Extração automática de dados de holerites, TRCT e contracheques" },
    { icon: BarChart3, title: "Snapshots & Auditoria", desc: "Versionamento imutável de cada cálculo com memória exportável" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left: Branding */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12"
        style={{
          background: 'linear-gradient(160deg, hsl(222 47% 14%) 0%, hsl(222 47% 20%) 50%, hsl(222 40% 26%) 100%)',
        }}
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-lg"
              style={{ background: 'linear-gradient(135deg, hsl(40 76% 52%), hsl(36 80% 46%))' }}
            >
              <Scale className="h-6 w-6" style={{ color: 'hsl(222 47% 11%)' }} />
            </div>
            <span className="text-2xl font-bold" style={{ color: 'hsl(213 31% 91%)' }}>
              JurisCálculo
            </span>
          </div>
          <p className="text-sm mt-1" style={{ color: 'hsl(213 31% 91% / 0.5)' }}>
            Sistema de Liquidação Trabalhista
          </p>
        </div>

        <div className="space-y-8">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-4">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0"
                style={{ backgroundColor: 'hsl(222 47% 20%)' }}
              >
                <f.icon className="h-5 w-5" style={{ color: 'hsl(40 76% 52%)' }} />
              </div>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'hsl(213 31% 91%)' }}>
                  {f.title}
                </h3>
                <p className="text-sm mt-0.5" style={{ color: 'hsl(213 31% 91% / 0.55)' }}>
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs" style={{ color: 'hsl(213 31% 91% / 0.3)' }}>
          © {new Date().getFullYear()} JurisCálculo. Todos os direitos reservados.
        </p>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-[420px] animate-fade-in">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ background: 'linear-gradient(135deg, hsl(40 76% 52%), hsl(36 80% 46%))' }}
            >
              <Scale className="h-5 w-5" style={{ color: 'hsl(222 47% 11%)' }} />
            </div>
            <span className="text-xl font-bold text-foreground">JurisCálculo</span>
          </div>

          {forgotMode ? (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-xl">Recuperar Senha</CardTitle>
                <CardDescription>Digite seu email para receber o link de recuperação.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Enviando..." : "Enviar Link"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-sm"
                    onClick={() => setForgotMode(false)}
                  >
                    Voltar ao login
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/60">
              <Tabs defaultValue="login" className="w-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl mb-1">Acesse sua conta</CardTitle>
                  <CardDescription>Entre ou crie uma nova conta para continuar.</CardDescription>
                  <TabsList className="grid w-full grid-cols-2 mt-3">
                    <TabsTrigger value="login">Entrar</TabsTrigger>
                    <TabsTrigger value="signup">Criar Conta</TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent>
                  <TabsContent value="login" className="mt-0">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="login-password">Senha</Label>
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline"
                            onClick={() => setForgotMode(true)}
                          >
                            Esqueceu a senha?
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="login-password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full gap-2" disabled={loading}>
                        {loading ? "Entrando..." : "Entrar"}
                        {!loading && <ArrowRight className="h-4 w-4" />}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="mt-0">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Nome Completo</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-name"
                            type="text"
                            placeholder="Dr. João da Silva"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="pl-10"
                            maxLength={100}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10"
                            maxLength={255}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Senha</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-password"
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10"
                            minLength={6}
                            required
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full gap-2" disabled={loading}>
                        {loading ? "Criando conta..." : "Criar Conta"}
                        {!loading && <ArrowRight className="h-4 w-4" />}
                      </Button>
                    </form>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
