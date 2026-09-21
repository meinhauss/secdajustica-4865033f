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
import { TesteDiscordDM } from "@/components/admin/TesteDiscordDM";
import { EnvioMassaDiscord } from "@/components/admin/EnvioMassaDiscord";

import { CURRENT_VERSION } from "@/lib/version";

const CHANGELOG: { version: string; date: string; changes: string[] }[] = [
  {
    version: "3.6.6",
    date: "10/07/2026",
    changes: [
      "Gerador de minutas IA agora coleta dados completos do processo (valor da causa, partes, OAB) e formata HTML com quebras de linha, negritos e prazos em horas",
      "Comarca fixada como São Paulo/SP — TJSP em toda geração de peças por IA",
      "Assinatura digital automática ao final das peças, com data de elaboração",
      "Remoção do campo redundante 'título do despacho' e do botão 'Copiar Texto' (que copiava HTML) do gerador de minutas",
      "Editor de texto rico corrigido: cursor não é mais jogado para o final ao digitar em petições coladas",
      "Correção do link 'Abrir movimento' na aba de movimentação processual",
      "Assistente Proativo global unificado no chatbot institucional (fim dos dois assistentes na lateral) com barramento de eventos e dicas contextuais",
      "Botão 'Sugerir com IA' nas ações do magistrado",
      "IA de sentença agora respeita rigorosamente os campos 'fundamentação' e 'dispositivo'",
      "Novo gerador automático de ementa (AIGerarEmenta)",
      "Assistente com dosimetria trifásica de pena, cálculo de honorários e sugestão de precedentes/jurisprudências internas via tokens [PROC:] e [JUR:]",
      "Nova seção 'Ordenamento Jurídico Federal' com Decretos 001-020/2024 e filtros reorganizados",
      "LoginPage remodelada com foco em mobile (filtros não tomam mais a tela toda)",
      "Cargo Defensor Público adicionado; aviso de porte de arma institucional nas credenciais",
      "Portal da Transparência restrito a funcionários públicos; calculadora de custas com valores reduzidos em 50%",
      "Correção do ranking de concursos: candidatos sem nota/prova são ignorados",
      "Integração completa Discord: Edge Function discord-notify, trigger em notificacoes via pg_net, DM automática de intimações e movimentos",
      "Painel de teste de DM Discord no admin (Estatísticas) com modelos pré-definidos (intimação, movimentação, prazo 6h, jurado, cartório)",
      "Policy RLS notif_insert_admin permitindo admins criarem notificações para qualquer usuário",
      "Campo 'ID do Discord' unificado em Meu Perfil e cadastro, com instruções detalhadas, validação snowflake (17-20 dígitos) e bloqueio obrigatório para IDs inválidos",
      "Correção do relator para 'Mein Haus' nas jurisprudências e súmulas recentes",
    ],
  },
  {
    version: "3.1.0",
    date: "08/07/2026",
    changes: [
      "Edge function gemini com suporte a múltiplas chaves de API (rotação automática em caso de falha/quota)",
      "AIResumoSemanal com renderização Markdown completa (react-markdown) e tipografia alinhada ao design system em modo claro/escuro",
      "Correções de contraste e formatação de textos gerados por IA",
      "Ajustes de estabilidade no fluxo de resposta do Gemini",
      "Atualização de versão e changelog do sistema",
    ],
  },
  {
    version: "3.0.0",
    date: "07/07/2026",
    changes: [
      "Notificações em tempo real via canal do backend, substituindo polling e recargas manuais",
      "Cache global com React Query nas seções Processos, MP, Ranking, Cartório, Meus Processos e TCO (~60% menos chamadas)",
      "AuthProvider agora expõe refreshProfile() — fim dos window.location.reload() após editar perfil",
      "Novos índices no banco para queries pesadas (processos, movimentacoes, notificacoes, intimacoes)",
      "Skeleton loaders substituindo spinners genéricos nas listas principais",
      "Hook useDebounce e validação centralizada com Zod (schemas de Processo, TCO e Cartório)",
      "Code-splitting por rota com React.lazy nas seções pesadas (Tribunal, Cartório, Estatísticas) — bundle inicial ~30-40% menor",
      "EmptyState ilustrado com CTA substituindo mensagens genéricas de 'Nenhum registro'",
      "Command Palette global (⌘K / Ctrl+K) com atalhos estilo Vim (g p, g d, g m, g a, g t, g o, g c, g x, g n)",
      "Consolidação de policies RLS de notificações (8 → 5) e políticas de retenção para cargo_historico e ranking_destaques",
      "Hardening de funções SECURITY DEFINER: EXECUTE revogado de PUBLIC/anon em 13 funções sensíveis",
      "Procurações: prazo de 24h para assinatura por todas as partes e validade de 30 dias após emissão, com cron horário de expiração e avisos visuais no formulário",
    ],
  },
  {
    version: "2.29.0",
    date: "06/05/2026",
    changes: [
      "Calculadora de Custas: nova pré-visualização de orçamento com design institucional luxuoso",
      "Opções de exportação: geração de PDF com layout de documento oficial, download em JPG e função de impressão direta",
      "Calculadora de Custas: interface modernizada com ordenação alfabética e integração total com o Decreto-Lei 001/2024",
      "Alerta Ético: aviso visual impeditivo ('ABAIXO DO PISO') para honorários advocatícios fora do parâmetro legal",
    ],
  },
  {
    version: "2.28.0",
    date: "06/05/2026",
    changes: [
      "Calculadora Penal: ferramenta interativa para somar penas, multas e fianças de múltiplos crimes",
      "Catálogo pesquisável com adição de crimes em um clique e ajuste de quantidade",
      "Ajustes percentuais de majoração e atenuação da pena base",
      "Resumo do cálculo copiável para uso em peças processuais",
      "Indicação automática de crimes inafiançáveis no resultado consolidado",
    ],
  },
  {
    version: "2.27.0",
    date: "06/05/2026",
    changes: [
      "Código Penal Integrado: nova página pública (/codigo-penal) com todos os artigos, penas, multas e fianças",
      "Banner de destaque do Código Penal na página pública principal com link para visitas externas",
      "Filtros por categoria e busca por artigo, crime ou descrição no Código Penal",
      "Preparação para a Calculadora Penal (em breve)",
    ],
  },
  {
    version: "2.26.0",
    date: "06/05/2026",
    changes: [
      "Apelações: razões de admissão e inadmissão agora aparecem nas movimentações do processo originário",
      "Intimações: tratamento adequado dos cargos exibidos (sem texto cru)",
      "Apelações: qualquer parte (advogado/MP) pode solicitar destaque com justificativa, retirando do julgamento virtual",
      "Apelações: designação de Relator e início de julgamento geram movimentação no processo originário",
      "Votos de Desembargadores: possibilidade de registrar ressalvas mesmo ao acompanhar o Relator; todos os votos sincronizam com a timeline do processo",
      "Apelações: fundamentação exibida com formatação rica (links e quebras), corrigindo exibição de HTML cru",
    ],
  },
  {
    version: "2.25.0",
    date: "02/05/2026",
    changes: [
      "Ranking do MP: ajustes na fórmula de pontuação semanal dos Promotores",
      "Novo cargo DETRAN com permissões equivalentes ao Hospital",
      "Quebras de linha agora visíveis nas movimentações em Processos e no Portal do Juiz",
      "Modo escuro mobile: corrigido fundo branco que tornava textos ilegíveis na landing page",
      "Modo escuro: números de processos, ícones e badges institucionais agora visíveis (token --institutional-fg adaptativo)",
      "RichTextView: parágrafos vazios e tags <br> renderizam como linhas em branco visíveis, com mais espaçamento vertical",
    ],
  },
  {
    version: "2.24.0",
    date: "30/04/2026",
    changes: [
      "Notificações: conteúdo do editor rico é exibido como texto limpo, sem tags HTML",
      "Links em movimentações e atos agora são detectados automaticamente e abrem em nova aba (Processos e Portal do Magistrado)",
      "Página pública (login): paleta repaginada priorizando o preto, com melhor contraste no cabeçalho institucional",
      "Modo escuro: garantida a ausência de fontes pretas — todos os textos respeitam o token de foreground",
    ],
  },
  {
    version: "2.23.2",
    date: "28/04/2026",
    changes: [
      "Portal do Magistrado: movimentações e atos com texto formatado agora renderizam corretamente (sem exibir tags HTML)",
      "Exportação em PDF: conteúdo de movimentações, atos e despachos é convertido para texto limpo, preservando quebras de linha",
    ],
  },
  {
    version: "2.23.1",
    date: "28/04/2026",
    changes: [
      "TCO: novo campo para colar o relato do Boletim de Ocorrência, lançado automaticamente como movimentação de informação policial",
      "Editor de texto rico: cores e fundos forçados são removidos ao colar, garantindo legibilidade no modo escuro",
      "Detalhe do TCO: 'Processo vinculado' agora exibe o número do processo em vez do ID interno",
    ],
  },
  {
    version: "2.23.0",
    date: "27/04/2026",
    changes: [
      "Cartório: novos fluxos automáticos para Procuração e Certidão de Distribuição, com gatilhos personalizados de notificação para assinaturas",
      "Atos do Cartório assinados pelo magistrado como 'Escrevente Técnico', com janela de consolidação de 2 minutos",
      "Mandados com múltiplos destinatários concatenados com '+' gerando registros individuais",
      "Embargos de Declaração: novo fluxo dedicado com prazo de 72h e UI específica para decisões",
      "Audiências: agendamento com alertas em tempo real e finalização com registro de ata ('Realizada')",
      "Distribuição/sorteio automático com lock FOR UPDATE e ordenação por carga de trabalho; status 'Recesso' remove magistrado do sorteio",
      "Oficial de Justiça pode registrar movimentações em qualquer fase do processo",
      "PGE (nível 11): novas permissões atuando como custos legis",
      "Ouvidoria pública do MP: portal para denúncias anônimas ou identificadas",
      "Limpeza de notificações: exclusão global por administradores e cron de 24h removendo alertas lidos",
      "Estatísticas gerais da comarca restritas a usuários autenticados",
      "Retificação de partes do processo permitida a qualquer juiz/admin, com evento na timeline",
      "Timeline policial passa a exibir o texto completo da descrição com anexos",
      "Validação obrigatória de upload quando há descrição de anexo preenchida",
      "Vinculação granular de advogados via 'autor:Nome' ou 'reu:Nome'",
      "Exclusões em cascata revisadas para inquéritos, embargos e TCOs (SET NULL/CASCADE conforme o caso)",
      "Cabeçalho centralizado da versão do sistema em src/lib/version.ts",
    ],
  },
  {
    version: "2.14.0",
    date: "24/04/2026",
    changes: [
      "Rankings: novo bloco com o pódio (Top 3) da semana anterior, exibindo 1º, 2º e 3º colocados com medalhas",
      "Edge function de reset semanal agora salva os 3 primeiros de cada ranking (magistrados, promotores e advogados)",
      "Correção de fuso horário no cálculo do reset semanal (agora respeita o horário de Brasília)",
      "Painel de distribuição: processos suspensos não são mais contabilizados como ativos",
      "Tribunal do Júri: jurados podem alterar profissão e disponibilidade na aba 'Minha Inscrição'",
    ],
  },
  {
    version: "2.13.0",
    date: "22/04/2026",
    changes: [
      "Portal do Tribunal do Júri: cidadãos podem se cadastrar como jurados voluntários",
      "Termo de Ciência e Compromisso obrigatório com sanções legais (crime de desobediência e multa de R$ 50 mil a R$ 500 mil)",
      "Sorteio automático de jurados pelo Presidente do Tribunal de Justiça",
      "Convocações de jurados via intimação oficial vinculadas a processos",
      "Notificação de convocação encaminha para a aba 'Convocações' com acesso ao processo (respeitando sigilos)",
      "Opção de cadastro como Jurado Voluntário no formulário de criação de conta com confirmação do termo",
      "Página pública: novo banner anunciando inscrições abertas para jurados",
      "Portal da UNISP migrado para endereço próprio (unisp.lovable.app) com redirecionamento automático",
      "Limpeza global de notificações de todos os usuários (administradores)",
    ],
  },
  {
    version: "2.12.0",
    date: "09/04/2026",
    changes: [
      "Rankings semanais: pontuação zera toda sexta-feira com registro do Servidor Destaque da semana",
      "Badge de Servidor Destaque exibido nos rankings de Magistrados, Promotores e Advogados",
      "Tabela ranking_destaques para histórico de vencedores semanais",
      "Cron job automático para reset semanal e premiação dos destaques",
      "Ranking da advocacia reformulado com layout visual padronizado (avatares, badges, métricas)",
      "Foto de perfil nos rankings com fallback automático entre carteira OAB e perfil",
      "Atos do cartório assinados pelo Escrevente Técnico Judiciário no Portal do Juiz",
      "Suporte a múltiplos links nos atos do cartório",
      "Intimações visíveis na timeline do processo para todos os usuários com acesso",
      "Correção de duplicidade na timeline ao juntar procuração",
      "Correção de duplicidade nos atos do cartório na timeline",
      "Ranking de promotores contabilizando trânsito em julgado, pareceres e requisições",
      "Sistema de recesso para magistrados com exclusão do sorteio de processos",
    ],
  },
  {
    version: "2.11.0",
    date: "03/04/2026",
    changes: [
      "Sistema de TCO (Termo Circunstanciado de Ocorrência) exclusivo para polícias",
      "Tipificação penal automática com base na natureza da infração no TCO",
      "Encaminhamento de TCO ao JECrim com geração automática de processo",
      "Campos de busca por ID do Personagem em todos os formulários com preenchimento automático",
      "Mandados com suporte a múltiplos tipos e múltiplos destinatários",
      "Distribuição de processos corrigida para balanceamento justo entre magistrados",
      "Painel de previsão de sorteio e seleção manual do próximo juiz nas Estatísticas",
      "Cidadãos agora visualizam apenas processos onde estão envolvidos",
      "Cidadãos bloqueados de acessar processos com segredo de justiça",
      "Exclusão de processos gerados por TCO corrigida (constraint ON DELETE SET NULL)",
      "Autor do processo via TCO agora exibe o cargo policial corretamente",
      "Correção de atos judiciais assinados com nome do juiz ao invés de cargo genérico",
      "Correção de duplicidade de publicações entre Portal do Juiz e aba Processos",
    ],
  },
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

  const queryClient = useQueryClient();
  const [selectedJudge, setSelectedJudge] = useState<string>("");

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
        jurisprudencias_total: number;
      } | null;
    },
  });

  // Distribution data
  const { data: magistrados } = useQuery({
    queryKey: ["magistrados-distribuicao"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("role", ["magistrado", "desembargador"]);
      if (!roles?.length) return [];
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, nome_completo, id_personagem, recesso").in("user_id", userIds);
      const { data: processos } = await supabase.from("processos").select("juiz_id, status");
      return (profiles || []).map(p => {
        const total = processos?.filter(pr => pr.juiz_id === p.user_id).length || 0;
        const ativos = processos?.filter(pr => pr.juiz_id === p.user_id && !["arquivado", "sentenciado", "suspenso"].includes(pr.status)).length || 0;
        return { ...p, total, ativos, role: roles.find(r => r.user_id === p.user_id)?.role, recesso: !!(p as any).recesso };
      }).sort((a, b) => {
        if (a.recesso !== b.recesso) return a.recesso ? 1 : -1;
        return a.ativos - b.ativos;
      });
    },
    enabled: isAdmin,
  });

  const { data: overrideConfig } = useQuery({
    queryKey: ["config-proximo-juiz"],
    queryFn: async () => {
      const { data } = await supabase.from("config_sistema").select("valor").eq("chave", "proximo_juiz_id").maybeSingle();
      return data?.valor || null;
    },
    enabled: isAdmin,
  });

  const setOverride = useMutation({
    mutationFn: async (juizId: string | null) => {
      if (!juizId) {
        await supabase.from("config_sistema").delete().eq("chave", "proximo_juiz_id");
      } else {
        const { data: existing } = await supabase.from("config_sistema").select("chave").eq("chave", "proximo_juiz_id").maybeSingle();
        if (existing) {
          await supabase.from("config_sistema").update({ valor: juizId, updated_at: new Date().toISOString() } as any).eq("chave", "proximo_juiz_id");
        } else {
          await supabase.from("config_sistema").insert({ chave: "proximo_juiz_id", valor: juizId } as any);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-proximo-juiz"] });
      toast.success("Próximo juiz atualizado");
    },
  });

  const magistradosDisponiveis = magistrados?.filter(m => !m.recesso) ?? [];
  const proximoJuizNatural = magistradosDisponiveis.length ? magistradosDisponiveis[0] : null;
  const proximoJuiz = overrideConfig
    ? magistrados?.find(m => m.user_id === overrideConfig) || null
    : proximoJuizNatural;

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

      {/* Distribuição de Processos - Admin only */}
      {isAdmin && magistrados && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="bg-card rounded-xl p-6 border border-border shadow-institutional">
          <div className="flex items-center gap-3 mb-4">
            <Shuffle className="h-5 w-5 text-institutional" />
            <h3 className="font-display text-lg font-semibold">Distribuição de Processos</h3>
          </div>

          {/* Next judge info */}
          <div className="bg-institutional/5 border border-institutional/20 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Próximo juiz a receber processo</p>
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-institutional" />
                  <span className="font-semibold text-foreground">
                    {proximoJuiz?.nome_completo || "Nenhum magistrado disponível"}
                  </span>
                  {proximoJuiz?.id_personagem && (
                    <Badge variant="outline" className="text-[10px]">ID {proximoJuiz.id_personagem}</Badge>
                  )}
                  {overrideConfig && (
                    <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30 text-[10px]">MANUAL</Badge>
                  )}
                  {!overrideConfig && (
                    <Badge className="bg-green-500/20 text-green-700 border-green-500/30 text-[10px]">AUTOMÁTICO</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Manual override */}
          <div className="flex items-center gap-3 mb-4">
            <Select
              value={selectedJudge}
              onValueChange={setSelectedJudge}
            >
              <SelectTrigger className="flex-1 rounded-xl">
                <SelectValue placeholder="Selecionar próximo juiz manualmente..." />
              </SelectTrigger>
              <SelectContent>
                {magistrados.filter(m => !m.recesso).map(m => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.nome_completo} ({m.ativos} ativos)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="rounded-xl"
              disabled={!selectedJudge || setOverride.isPending}
              onClick={() => {
                setOverride.mutate(selectedJudge);
                setSelectedJudge("");
              }}
            >
              Definir
            </Button>
            {overrideConfig && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                disabled={setOverride.isPending}
                onClick={() => setOverride.mutate(null)}
              >
                Limpar
              </Button>
            )}
          </div>

          {/* Distribution table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-2 font-medium text-muted-foreground">Magistrado</th>
                  <th className="text-center p-2 font-medium text-muted-foreground">Ativos</th>
                  <th className="text-center p-2 font-medium text-muted-foreground">Total</th>
                  <th className="text-center p-2 font-medium text-muted-foreground">Cargo</th>
                </tr>
              </thead>
              <tbody>
                {magistrados.map((m, i) => (
                  <tr key={m.user_id} className={`border-t border-border ${!m.recesso && i === 0 && !overrideConfig ? "bg-institutional/5" : ""} ${overrideConfig === m.user_id ? "bg-institutional/5" : ""} ${m.recesso ? "opacity-60" : ""}`}>
                    <td className="p-2 font-medium text-foreground">
                      {m.nome_completo}
                      {m.id_personagem && <span className="text-xs text-muted-foreground ml-1">(ID {m.id_personagem})</span>}
                      {m.recesso && <Badge className="ml-2 bg-amber-500/20 text-amber-700 border-amber-500/30 text-[10px]">RECESSO</Badge>}
                    </td>
                    <td className="p-2 text-center text-foreground">{m.ativos}</td>
                    <td className="p-2 text-center text-muted-foreground">{m.total}</td>
                    <td className="p-2 text-center">
                      <Badge variant="secondary" className="text-[10px]">
                        {m.role === "desembargador" ? "Desembargador" : "Magistrado"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {isAdmin && <TesteDiscordDM />}

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
