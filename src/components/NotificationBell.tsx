import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NotificationBellProps {
  onNavigate?: (section: string, processoId?: string) => void;
}

export default function NotificationBell({ onNavigate }: NotificationBellProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notificacoes = [] } = useQuery({
    queryKey: ["notificacoes", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notificacoes")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notificacoes-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificacoes",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notificacoes", user.id] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const unreadCount = notificacoes.filter((n) => !n.lida).length;

  const markAsRead = async (id: string) => {
    await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["notificacoes", user?.id] });
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from("notificacoes")
      .update({ lida: true })
      .eq("user_id", user.id)
      .eq("lida", false);
    queryClient.invalidateQueries({ queryKey: ["notificacoes", user.id] });
  };

  const handleClick = (notif: any) => {
    markAsRead(notif.id);
    if (notif.link_secao && onNavigate) {
      // Format: "section:processoId" or just "section"
      const parts = notif.link_secao.split(":");
      if (parts.length === 2) {
        onNavigate(parts[0], parts[1]);
      } else {
        onNavigate(parts[0]);
      }
    }
    setOpen(false);
  };

  const getTypeIcon = (tipo: string) => {
    switch (tipo) {
      case "movimentacao": return "📋";
      case "intimacao": return "⚖️";
      case "cartorio": return "🏛️";
      default: return "🔔";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-accent/50 transition-colors text-foreground">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 max-h-[80vh] overflow-hidden" align="end" side="bottom" avoidCollisions={true} collisionPadding={16}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm text-foreground">Notificações</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-primary hover:underline"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>
        <ScrollArea className="max-h-[400px]">
          {notificacoes.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma notificação
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notificacoes.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`w-full text-left px-4 py-3 hover:bg-accent/30 transition-colors ${
                    !notif.lida ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex gap-2">
                    <span className="text-base mt-0.5">{getTypeIcon(notif.tipo)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm truncate ${!notif.lida ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                          {notif.titulo}
                        </p>
                        {!notif.lida && (
                          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notif.mensagem}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {format(new Date(notif.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
