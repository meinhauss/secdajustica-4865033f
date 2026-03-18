import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  lida: boolean;
  link_secao: string | null;
  created_at: string;
}

interface NotificacoesBellProps {
  onNavigate?: (section: string) => void;
}

export default function NotificacoesBell({ onNavigate }: NotificacoesBellProps) {
  const { user } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotificacoes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notificacoes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotificacoes(data as any);
  };

  useEffect(() => {
    fetchNotificacoes();
    const channel = supabase
      .channel("notificacoes-bell")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificacoes", filter: `user_id=eq.${user?.id}` },
        () => fetchNotificacoes()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadCount = notificacoes.filter((n) => !n.lida).length;

  const markAsRead = async (id: string) => {
    await supabase.from("notificacoes").update({ lida: true } as any).eq("id", id);
    setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
  };

  const markAllAsRead = async () => {
    const unreadIds = notificacoes.filter((n) => !n.lida).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notificacoes").update({ lida: true } as any).in("id", unreadIds);
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
  };

  const handleClick = (n: Notificacao) => {
    markAsRead(n.id);
    if (n.link_secao && onNavigate) {
      onNavigate(n.link_secao);
      setOpen(false);
    }
  };

  const tipoColor = (tipo: string) => {
    const map: Record<string, string> = {
      info: "bg-blue-500", alerta: "bg-amber-500", sucesso: "bg-emerald-500",
      erro: "bg-destructive", sistema: "bg-primary",
    };
    return map[tipo] || "bg-muted-foreground";
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h4 className="font-display text-sm font-semibold text-foreground">Notificações</h4>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-primary hover:underline">
                Marcar todas como lidas
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notificacoes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma notificação.</p>
            ) : (
              <div className="divide-y divide-border">
                {notificacoes.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${!n.lida ? "bg-primary/5" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${tipoColor(n.tipo)}`} />
                      <div className="min-w-0">
                        <p className={`text-xs font-medium ${!n.lida ? "text-foreground" : "text-muted-foreground"}`}>
                          {n.titulo}
                        </p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.mensagem}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {new Date(n.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      {!n.lida && <Badge className="bg-primary text-primary-foreground text-[9px] px-1 py-0 ml-auto flex-shrink-0">Nova</Badge>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
