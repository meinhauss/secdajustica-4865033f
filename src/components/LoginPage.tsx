import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scale, Shield, Gavel, BookOpen } from "lucide-react";
import logoTjsp from "@/assets/logo-tjsp.png";
import { toast } from "sonner";

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [discord, setDiscord] = useState("");
  const [idPersonagem, setIdPersonagem] = useState("");
  const [telefoneIngame, setTelefoneIngame] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, nome, {
          discord,
          id_personagem: idPersonagem,
          telefone_ingame: telefoneIngame,
        });
        if (error) throw error;
        toast.success("Conta criada com sucesso! Bem-vindo ao sistema.");
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success("Login realizado com sucesso!");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Scale, label: "Processos Eletrônicos" },
    { icon: Shield, label: "Delegacia Virtual" },
    { icon: Gavel, label: "Portal do Magistrado" },
    { icon: BookOpen, label: "Consulta Pública" },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Branding */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
        className="lg:w-1/2 gradient-institutional flex flex-col items-center justify-center p-8 lg:p-16 text-center"
      >
        <motion.img
          src={logoTjsp}
          alt="Tribunal de Justiça - SP"
          className="w-32 h-auto mb-8 drop-shadow-lg"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        />
        <h1 className="font-display text-3xl lg:text-5xl font-bold text-gold-light mb-4 leading-tight">
          Poder Judiciário
        </h1>
        <p className="text-gold/80 text-lg mb-2 font-display italic">
          Comarca de São Paulo — Cidade RP
        </p>
        <p className="text-sidebar-foreground/60 text-sm mb-12 max-w-md">
          Sistema Integrado de Gestão Jurídica — Processamento eletrônico, delegacia virtual e serviços judiciais.
        </p>

        <div className="grid grid-cols-2 gap-4 max-w-sm w-full">
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="flex items-center gap-3 rounded-xl bg-sidebar-accent/50 p-3"
            >
              <f.icon className="h-5 w-5 text-gold flex-shrink-0" />
              <span className="text-xs text-sidebar-foreground/80 font-medium">{f.label}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Right Panel - Auth Form */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
        className="lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-background"
      >
        <div className="w-full max-w-md">
          <h2 className="font-display text-2xl font-semibold text-foreground mb-2">
            {isSignUp ? "Criar Conta" : "Acessar Sistema"}
          </h2>
          <p className="text-muted-foreground text-sm mb-8">
            {isSignUp
              ? "Preencha os dados para registrar-se no sistema jurídico."
              : "Informe suas credenciais para acessar o sistema."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                <label className="text-xs uppercase tracking-widest font-medium text-muted-foreground mb-1 block">
                  Nome Completo
                </label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                  className="rounded-xl h-12"
                />
              </motion.div>
            )}
            <div>
              <label className="text-xs uppercase tracking-widest font-medium text-muted-foreground mb-1 block">
                E-mail
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="rounded-xl h-12"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-medium text-muted-foreground mb-1 block">
                Senha
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="rounded-xl h-12"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-institutional hover:bg-institutional-light text-gold-light font-semibold text-sm tracking-wide transition-all"
            >
              {loading ? "Processando..." : isSignUp ? "Registrar" : "Entrar"}
            </Button>
          </form>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-center"
          >
            {isSignUp ? "Já possui conta? Faça login" : "Não possui conta? Registre-se"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
