import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import govLogo from "@/assets/gov-logo.png";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    // Also check URL hash for type=recovery
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha alterada com sucesso! Redirecionando...");
      setTimeout(() => navigate("/"), 2000);
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <div className="bg-institutional-dark">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center gap-3">
          <img src={govLogo} alt="gov.br" className="h-6" />
          <span className="text-[11px] text-sidebar-foreground/60">
            Governo da Cidade RP — Estado de São Paulo
          </span>
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-bold text-foreground">
              Redefinir Senha
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isRecovery
                ? "Digite sua nova senha abaixo."
                : "Aguardando verificação do link de recuperação..."}
            </p>
          </div>

          {isRecovery ? (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-1 block">
                  Nova Senha
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="rounded-lg h-11"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-1 block">
                  Confirmar Nova Senha
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="rounded-lg h-11"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-lg bg-institutional hover:bg-institutional-light text-gold-light font-semibold text-sm"
              >
                {loading ? "Processando..." : "Redefinir Senha"}
              </Button>
            </form>
          ) : (
            <div className="text-center p-8 rounded-lg bg-secondary/50 border border-border">
              <p className="text-muted-foreground text-sm">
                Se você chegou aqui por um link de recuperação, a verificação será processada automaticamente.
              </p>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Voltar ao início
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
