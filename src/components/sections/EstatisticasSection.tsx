import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, GitCommit, ChevronDown, ChevronUp, Gavel, FileText, Bell, Shield, Scale, BookOpen, AlertTriangle, Users, Shuffle, UserCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

import { CURRENT_VERSION } from "@/lib/version";

const CHANGELOG: { version: string; date: string; changes: string[] }[] = [
  {
    version: "2.10.0",
    date: "31/03/2026",
    changes: [
      "Embargos de Declaração como recurso pós-sentença (omissão, contradição, obscuridade)",
      "Juiz pode acolher, rejeitar ou acolher parcialmente embargos no Portal do Magistrado",
      "Embargos integrados à timeline do processo",
      "Aba 'Embargos' visível em processos sentenciados e arquivados",
      "Nomenclaturas do polo apelante atualizadas (Réu/Autor/Ambas as partes)",
      "Portal do MP simplificado (removidas abas Denúncias, Arquivamentos, Pareceres, Estatísticas)",
      "Concursos anteriores agora exibem todas as informações do edital",
      "Ranking OAB atualizado com pontos e bônus de velocidade",
      "Rankings de Magistrados e Promotores com pontuação por velocidade e trânsito em julgado",
      "Todos os prazos convertidos para horas",
    ],
  },
  {
    version: "2.9.0",
    date: "27/03/2026",
    changes: [
      "Arquivamento automático de processos 72 horas após sentença",
      "Prazo de 72 horas para interposição de recurso de apelação",
      "Bloqueio de apelações após expiração do prazo",
      "Processos arquivados exibem aba de apelações para consulta",
    ],
  },
  {
    version: "2.8.0",
    date: "26/03/2026",
    changes: [
      "Sistema de concessão de acesso a processos sigilosos pelo juiz via ID do Personagem",
      "Intimação por cargo com notificação para todos os usuários do cargo",
      "Sistema de notificações automáticas para movimentações, intimações e cartório",
      "Notificações respeitam sigilo e níveis de acesso",
      "Sino de notificações com contagem de não lidas e realtime",
      "Estatísticas agora exibem todos os processos (incluindo criminais sigilosos)",
      "Changelog do sistema visível para administradores",
    ],
  },
  {
    version: "2.7.0",
    date: "26/03/2026",
    changes: [
      "Correção de partes e representantes pelo juiz com registro na timeline",
      "Aba 'Meus Processos' para advogados e magistrados",
      "Abertura direta do processo a partir de 'Meus Processos'",
      "Correção de exibição de nomes nos portais do MP e Magistrado",
    ],
  },
  {
    version: "2.6.0",
    date: "26/03/2026",
    changes: [
      "Possibilidade de definir segredo de justiça na abertura do processo",
      "Inquéritos recebidos pela API seguem padrão do sistema (denúncia, arquivamento, requerimentos)",
      "Comunicações externas atreladas ao respectivo inquérito",
    ],
  },
  {
    version: "2.5.0",
    date: "25/03/2026",
    changes: [
      "API de comunicação externa para Polícia Civil, Federal e Receita com o MP",
      "Envio e recebimento de inquéritos e denúncias via API externa",
      "Acompanhamento de andamento de inquéritos pelo órgão externo",
    ],
  },
  {
    version: "2.4.0",
    date: "25/03/2026",
    changes: [
      "Presidente da OAB pode instaurar Processo Administrativo Disciplinar",
      "Gestão completa de PAD (instrução, parecer, sanção)",
    ],
  },
  {
    version: "2.3.0",
    date: "25/03/2026",
    changes: [
      "Suporte a múltiplos autores e réus na abertura de processos",
      "Campos dinâmicos para adicionar/remover partes",
    ],
  },
  {
    version: "2.2.0",
    date: "25/03/2026",
    changes: [
      "Correção na distribuição de processos via denúncia direta do MP",
      "Processos abertos pelo MP agora iniciam em segredo de justiça",
      "Exibição de links da denúncia da ouvidoria no portal do promotor",
    ],
  },
  {
    version: "2.1.0",
    date: "25/03/2026",
    changes: [
      "Tratamento de denúncias da ouvidoria similar a inquéritos",
      "Ações de abrir inquérito, emitir parecer e fazer requisições a partir de denúncias",
      "Correção do fluxo de denúncias chegando ao portal do MP",
    ],
  },
  {
    version: "2.0.0",
    date: "25/03/2026",
    changes: [
      "Portal da Ouvidoria do MP na página inicial (sem login)",
      "Formulário de denúncia com envolvidos, links e tutorial de anexos",
      "Correção de caracteres especiais na impressão da íntegra do processo",
    ],
  },
  {
    version: "1.0.0",
    date: "24/03/2026",
    changes: [
      "Lançamento inicial do sistema judicial",
      "Portal do Magistrado, Ministério Público, OAB e Cartório",
      "Gestão de processos, audiências, intimações e mandados",
      "Sistema de autenticação e controle de acesso por cargos",
      "Consulta pública e portal da transparência",
      "Gestão de concursos públicos",
      "Delegacia Virtual com boletins de ocorrência e inquéritos",
      "Sistema de jurisprudência e apelações",
    ],
  },
];

export default function EstatisticasSection() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set([CURRENT_VERSION]));

  const { data: stats } = useQuery({
    queryKey: ["stats-processos"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_processo_stats");
      return data as {
        por_classe: Record<string, number>;
        por_status: Record<string, number>;
        total: number;
        audiencias_total: number;
        audiencias_agendadas: number;
        audiencias_realizadas: number;
        intimacoes_total: number;
        intimacoes_pendentes: number;
        intimacoes_lidas: number;
        mandados_total: number;
        mandados_pendentes: number;
        mandados_cumpridos: number;
        sentencas_total: number;
        apelacoes_total: number;
        inqueritos_total: number;
        inqueritos_abertos: number;
        boletins_total: number;
        denuncias_mp_total: number;
        jurisprudencias_total: number;
      } | null;
    },
  });

  const classeCount = stats?.por_classe ?? {};
  const statusCount = stats?.por_status ?? {};
  const total = stats?.total ?? Object.values(classeCount).reduce((a, b) => a + b, 0);

  const toggleVersion = (version: string) => {
    setExpandedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(version)) next.delete(version);
      else next.add(version);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Estatísticas</h2>
        <p className="text-sm text-muted-foreground">Dados institucionais da Comarca</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl p-6 border border-border shadow-institutional">
          <h3 className="font-display text-lg font-semibold mb-4">Processos por Classe</h3>
          {Object.keys(classeCount).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sem dados.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(classeCount).map(([classe, count]) => (
                <div key={classe} className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground w-28">{classe}</span>
                  <div className="flex-1 h-6 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full gradient-gold"
                      style={{ width: `${Math.min(((count as number) / (total || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-foreground w-8 text-right">{count as number}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl p-6 border border-border shadow-institutional">
          <h3 className="font-display text-lg font-semibold mb-4">Processos por Status</h3>
          {Object.keys(statusCount).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sem dados.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(statusCount).map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground w-28">{status.replace(/_/g, " ")}</span>
                  <div className="flex-1 h-6 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-institutional"
                      style={{ width: `${Math.min(((count as number) / (total || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-foreground w-8 text-right">{count as number}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Indicadores gerais */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-xl p-6 border border-border shadow-institutional">
        <h3 className="font-display text-lg font-semibold mb-4">Indicadores Gerais da Comarca</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[
            { label: "Processos", value: stats?.total ?? 0, icon: FileText },
            { label: "Audiências", value: stats?.audiencias_total ?? 0, icon: Users, sub: `${stats?.audiencias_agendadas ?? 0} agendadas · ${stats?.audiencias_realizadas ?? 0} realizadas` },
            { label: "Intimações", value: stats?.intimacoes_total ?? 0, icon: Bell, sub: `${stats?.intimacoes_pendentes ?? 0} pendentes · ${stats?.intimacoes_lidas ?? 0} lidas` },
            { label: "Mandados", value: stats?.mandados_total ?? 0, icon: Shield, sub: `${stats?.mandados_pendentes ?? 0} pendentes · ${stats?.mandados_cumpridos ?? 0} cumpridos` },
            { label: "Sentenças", value: stats?.sentencas_total ?? 0, icon: Gavel },
            { label: "Apelações", value: stats?.apelacoes_total ?? 0, icon: Scale },
            { label: "Inquéritos", value: stats?.inqueritos_total ?? 0, icon: AlertTriangle, sub: `${stats?.inqueritos_abertos ?? 0} em andamento` },
            { label: "Boletins de Ocorrência", value: stats?.boletins_total ?? 0, icon: FileText },
            { label: "Denúncias (MP)", value: stats?.denuncias_mp_total ?? 0, icon: AlertTriangle },
            { label: "Jurisprudências", value: stats?.jurisprudencias_total ?? 0, icon: BookOpen },
          ].map((item) => (
            <div key={item.label} className="bg-secondary/50 rounded-lg p-4 text-center space-y-1">
              <item.icon className="h-5 w-5 mx-auto text-institutional mb-1" />
              <p className="text-2xl font-bold text-foreground">{item.value}</p>
              <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
              {item.sub && <p className="text-[10px] text-muted-foreground">{item.sub}</p>}
            </div>
          ))}
        </div>
      </motion.div>

      {isAdmin && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-xl p-6 border border-border shadow-institutional">
          <div className="flex items-center gap-3 mb-6">
            <GitCommit className="h-5 w-5 text-institutional" />
            <h3 className="font-display text-lg font-semibold">Changelog do Sistema</h3>
            <Badge variant="outline" className="ml-auto text-xs font-mono border-institutional text-institutional">
              v{CURRENT_VERSION}
            </Badge>
          </div>

          <div className="space-y-2">
            {CHANGELOG.map((entry) => {
              const isExpanded = expandedVersions.has(entry.version);
              const isCurrent = entry.version === CURRENT_VERSION;
              return (
                <div key={entry.version} className={`rounded-lg border ${isCurrent ? "border-institutional/30 bg-institutional/5" : "border-border"}`}>
                  <button
                    onClick={() => toggleVersion(entry.version)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 rounded-lg transition-colors"
                  >
                    <Badge variant={isCurrent ? "default" : "secondary"} className={`font-mono text-xs ${isCurrent ? "bg-institutional" : ""}`}>
                      v{entry.version}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{entry.date}</span>
                    {isCurrent && (
                      <Badge variant="outline" className="text-[10px] border-green-500/50 text-green-600">ATUAL</Badge>
                    )}
                    <span className="ml-auto text-muted-foreground">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3">
                      <ul className="space-y-1.5 ml-2">
                        {entry.changes.map((change, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="text-institutional mt-1.5 shrink-0 h-1.5 w-1.5 rounded-full bg-institutional" />
                            {change}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
