import React, { useState } from "react";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor, RichTextView } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Scale, Shield, ArrowLeft, Clock, Eye, ChevronRight,
  Gavel, Archive, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PodiumDestaque } from "@/components/PodiumDestaque";
import AISugerirDespacho from "@/components/AISugerirDespacho";
import { appendAiHtml } from "@/lib/ai/insertHtml";

/* ═══════════════════════════════════════════ */
/*  MAIN                                       */
/* ═══════════════════════════════════════════ */
export default function MPSection() {
  const [view, setView] = useState<"list" | "ouvidoria-detail">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (view === "ouvidoria-detail" && selectedId) {
    return <OuvidoriaDetail denunciaId={selectedId} onBack={() => { setView("list"); setSelectedId(null); }} />;
  }

  return (
    <MPDashboard
      onSelectOuvidoria={(id) => { setSelectedId(id); setView("ouvidoria-detail"); }}
    />
  );
}

/* ═══════════════════════════════════════════ */
/*  MP DASHBOARD                               */
/* ═══════════════════════════════════════════ */
function MPDashboard({ onSelectOuvidoria }: { onSelectOuvidoria: (id: string) => void }) {
  const [activeTab, setActiveTab] = useState("ouvidoria");

  const { data: denunciasOuvidoria } = useQuery({
    queryKey: ["mp-denuncias-ouvidoria"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("denuncias_ouvidoria" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Portal do Ministério Público</h2>
        <p className="text-sm text-muted-foreground">Ouvidoria e ranking de promotores</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start rounded-xl bg-secondary/50 p-1 h-auto gap-1 flex-wrap">
          <TabsTrigger value="ouvidoria" className="rounded-lg text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" /> Ouvidoria ({denunciasOuvidoria?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="ranking" className="rounded-lg text-xs">
            <Scale className="h-3 w-3 mr-1" /> Ranking
          </TabsTrigger>
        </TabsList>

        {/* OUVIDORIA TAB */}
        <TabsContent value="ouvidoria" className="mt-4">
          {!denunciasOuvidoria?.length ? (
            <EmptyState icon={AlertTriangle} text="Nenhuma denúncia recebida pela ouvidoria." />
          ) : (
            <div className="space-y-3">
              {denunciasOuvidoria.map((d: any, i: number) => {
                const envolvidos = Array.isArray(d.envolvidos) ? d.envolvidos : [];
                const STATUS_MAP: Record<string, { label: string; color: string }> = {
                  recebida: { label: "Recebida", color: "bg-gold/10 text-gold-dark" },
                  em_analise: { label: "Em Análise", color: "bg-institutional/10 text-institutional" },
                  encaminhada: { label: "Encaminhada", color: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" },
                  arquivada: { label: "Arquivada", color: "bg-muted text-muted-foreground" },
                };
                const st = STATUS_MAP[d.status] || STATUS_MAP.recebida;
                return (
                  <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    onClick={() => onSelectOuvidoria(d.id)}
                    className="bg-card rounded-xl p-5 border border-border shadow-institutional hover:border-institutional/30 transition-all cursor-pointer group">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(d.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                      <span className="text-xs font-medium text-foreground ml-auto">
                        {d.nome_denunciante || "Anônimo"}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-institutional transition-colors flex-shrink-0" />
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">{d.descricao}</p>
                    {envolvidos.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {envolvidos.map((e: any, j: number) => (
                          <span key={j} className="text-[10px] bg-secondary/80 px-1.5 py-0.5 rounded text-muted-foreground">
                            {e.nome}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* RANKING */}
        <TabsContent value="ranking" className="mt-4">
          <PromotorRanking />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  PROMOTOR RANKING                           */
/* ═══════════════════════════════════════════ */
function PromotorRanking() {
  const { data: ranking, isLoading } = useQuery({
    queryKey: ["promotor-ranking"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_promotor_ranking");
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const CARGO_LABELS: Record<string, string> = {
    ministerio_publico: "Promotor(a) de Justiça",
    procurador_geral: "Procurador(a)-Geral",
    procurador_geral_adjunto: "Procurador(a)-Geral Adjunto(a)",
  };

  if (isLoading) return <ListSkeleton rows={5} />;
  if (!ranking?.length) return <EmptyState icon={Scale} text="Nenhum promotor com atividade registrada." />;

  return (
    <div className="space-y-4">
      <PodiumDestaque tipoRanking="promotor" fallbackIcon={<Scale className="h-6 w-6 text-gold-dark" />} />

      <div className="bg-card rounded-xl p-4 border border-border shadow-institutional">
        <h3 className="font-display text-lg font-bold text-foreground mb-1">Sistema de Pontuação</h3>
        <p className="text-[10px] text-muted-foreground mb-2">Pontos zerados toda sexta-feira. O líder da semana recebe o título de Servidor Destaque.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
          <span>📋 Denúncia oferecida: <strong className="text-foreground">30 pts</strong></span>
          <span>📝 Parecer emitido: <strong className="text-foreground">15 pts</strong></span>
          <span>🔍 Requisição de diligência: <strong className="text-foreground">20 pts</strong></span>
          <span>⚖️ Trânsito em julgado: <strong className="text-foreground">50 pts</strong></span>
          <span>⚡ Denúncia rápida (&lt;24h): <strong className="text-foreground">+25 pts</strong></span>
          <span>📁 Arquivamento promovido: <strong className="text-foreground">10 pts</strong></span>
          <span>🤝 Manifestação de interesse: <strong className="text-foreground">15 pts</strong></span>
        </div>
      </div>

      <div className="space-y-2">
        {ranking.map((p: any, i: number) => (
          <motion.div key={p.user_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className={`bg-card rounded-xl p-4 border shadow-institutional ${i === 0 ? 'border-gold ring-1 ring-gold/20' : i === 1 ? 'border-gray-400 dark:border-gray-500' : i === 2 ? 'border-amber-600 dark:border-amber-700' : 'border-border'}`}>
            <div className="flex items-center gap-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-gold/20 text-gold-dark' : i === 1 ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300' : i === 2 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-secondary text-muted-foreground'}`}>
                {i + 1}º
              </div>
              {p.avatar_url ? (
                <img src={p.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-institutional/10 flex items-center justify-center">
                  <Scale className="h-5 w-5 text-institutional" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground text-sm">{p.nome_completo}</span>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-institutional/10 text-institutional font-semibold">
                    {CARGO_LABELS[p.cargo] || p.cargo}
                  </span>
                </div>
                {p.id_personagem && <span className="text-[10px] text-muted-foreground">ID: {p.id_personagem}</span>}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
                  <span>{p.denuncias} {Number(p.denuncias) === 1 ? 'denúncia' : 'denúncias'}</span>
                  <span>•</span>
                  <span>{p.pareceres} {Number(p.pareceres) === 1 ? 'parecer' : 'pareceres'}</span>
                  <span>•</span>
                  <span>{p.transito_julgado} trânsito(s) em julgado</span>
                  {Number(p.denuncias_rapidas) > 0 && <><span>•</span><span className="text-green-600 dark:text-green-400">⚡ {p.denuncias_rapidas} rápida(s)</span></>}
                  {Number(p.requisicoes) > 0 && <><span>•</span><span>{p.requisicoes} requisição(ões)</span></>}
                  {Number(p.arquivamentos) > 0 && <><span>•</span><span>{p.arquivamentos} arquivamento(s)</span></>}
                  {Number(p.manifestacoes) > 0 && <><span>•</span><span>🤝 {p.manifestacoes} manifestação(ões)</span></>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xl font-bold text-institutional">{Number(p.score)}</span>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">pontos</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  OUVIDORIA DETAIL                           */
/* ═══════════════════════════════════════════ */
function OuvidoriaDetail({ denunciaId, onBack }: { denunciaId: string; onBack: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeAction, setActiveAction] = useState<"none" | "denuncia" | "arquivamento">("none");

  const { data: denuncia } = useQuery({
    queryKey: ["ouvidoria-detail", denunciaId],
    queryFn: async () => {
      const { data, error } = await supabase.from("denuncias_ouvidoria" as any).select("*").eq("id", denunciaId).single();
      if (error) throw error;
      return data as any;
    },
  });

  // ── OFERECER DENÚNCIA (cria processo criminal direto) ──
  const [denForm, setDenForm] = useState({ resumo: "", fundamentacao: "", tipificacao: "" });
  const oferecerDenuncia = useMutation({
    mutationFn: async () => {
      if (!denForm.resumo || !denForm.fundamentacao) throw new Error("Preencha resumo e fundamentação.");
      const envolvidos = Array.isArray(denuncia?.envolvidos) ? denuncia.envolvidos : [];
      const reuArr = envolvidos.length
        ? envolvidos.map((e: any) => ({ name: e.nome, id_personagem: e.id_personagem || null }))
        : [{ name: "Réu a identificar", id_personagem: null }];
      const { data: juizData } = await supabase.rpc("sortear_magistrado");
      const juizId = juizData || null;
      const { data: processo, error: procErr } = await supabase.from("processos").insert({
        numero: "",
        classe: "criminal" as const,
        assunto: denForm.tipificacao || "Ação Penal",
        autor_nome: JSON.stringify([{ name: "Ministério Público", id_personagem: null }]),
        reu_nome: JSON.stringify(reuArr),
        descricao: denForm.resumo,
        sigilo: "segredo_justica",
        juiz_id: juizId,
      } as any).select("id, numero").single();
      if (procErr) throw procErr;
      await supabase.from("movimentacoes").insert({
        processo_id: processo.id,
        tipo: "denuncia",
        descricao: `DENÚNCIA OFERECIDA PELO MINISTÉRIO PÚBLICO\n\nTipificação: ${denForm.tipificacao || "Não informada"}\n\nResumo: ${denForm.resumo}\n\nFundamentação: ${denForm.fundamentacao}\n\nProcesso ${processo.numero} distribuído a partir de denúncia da ouvidoria.`,
        autor_id: user!.id,
        autor_nome: "Ministério Público",
      } as any);
      await supabase.from("denuncias_ouvidoria" as any).update({ status: "encaminhada" }).eq("id", denunciaId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ouvidoria-detail", denunciaId] });
      queryClient.invalidateQueries({ queryKey: ["mp-denuncias-ouvidoria"] });
      setActiveAction("none");
      setDenForm({ resumo: "", fundamentacao: "", tipificacao: "" });
      toast.success("Denúncia oferecida e processo criminal distribuído!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── ARQUIVAR ──
  const [arquivJust, setArquivJust] = useState("");
  const arquivarDenuncia = useMutation({
    mutationFn: async () => {
      if (!arquivJust) throw new Error("Justificativa obrigatória.");
      await supabase.from("denuncias_ouvidoria" as any).update({ status: "arquivada" }).eq("id", denunciaId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ouvidoria-detail", denunciaId] });
      queryClient.invalidateQueries({ queryKey: ["mp-denuncias-ouvidoria"] });
      setActiveAction("none");
      toast.success("Denúncia arquivada.");
    },
    onError: (err: any) => toast.error(err.message),
  });


  if (!denuncia) return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;

  const envolvidos = Array.isArray(denuncia.envolvidos) ? denuncia.envolvidos : [];
  const dLinks = Array.isArray(denuncia.links) ? denuncia.links : [];
  const STATUS_MAP: Record<string, { label: string; color: string }> = {
    recebida: { label: "Recebida", color: "bg-gold/10 text-gold-dark" },
    em_analise: { label: "Em Análise", color: "bg-institutional/10 text-institutional" },
    encaminhada: { label: "Encaminhada", color: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" },
    arquivada: { label: "Arquivada", color: "bg-muted text-muted-foreground" },
  };
  const st = STATUS_MAP[denuncia.status] || STATUS_MAP.recebida;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="rounded-lg"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-xl font-bold text-foreground">Denúncia da Ouvidoria</h2>
            <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Recebida em {format(new Date(denuncia.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            {denuncia.nome_denunciante && denuncia.nome_denunciante !== "Anônimo" ? ` — Denunciante: ${denuncia.nome_denunciante}` : " — Denúncia Anônima"}
          </p>
        </div>
      </div>

      <div className="bg-card rounded-xl p-5 border border-border shadow-institutional">
        <h3 className="font-display text-sm font-semibold text-foreground mb-3">Dados do Denunciante</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div><span className="text-xs text-muted-foreground uppercase">Nome:</span> <span className="text-foreground font-medium">{denuncia.nome_denunciante || "Anônimo"}</span></div>
          <div><span className="text-xs text-muted-foreground uppercase">Contato:</span> <span className="text-foreground">{denuncia.contato_denunciante || "Não informado"}</span></div>
        </div>
      </div>

      <div className="bg-card rounded-xl p-5 border border-border shadow-institutional">
        <h3 className="font-display text-sm font-semibold text-foreground mb-3">Relato da Denúncia</h3>
        <RichTextView html={denuncia.descricao} className="text-sm text-foreground" />
      </div>

      {envolvidos.length > 0 && (
        <div className="bg-card rounded-xl p-5 border border-border shadow-institutional">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">Envolvidos Identificados ({envolvidos.length})</h3>
          <div className="space-y-2">
            {envolvidos.map((e: any, i: number) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <AlertTriangle className="h-4 w-4 text-gold-dark flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{e.nome}</p>
                  {e.funcao && <p className="text-xs text-muted-foreground">Função/Cargo: {e.funcao}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {dLinks.length > 0 && (
        <div className="bg-card rounded-xl p-5 border border-border shadow-institutional">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">Links de Provas e Anexos ({dLinks.length})</h3>
          <div className="space-y-2">
            {dLinks.map((l: string, i: number) => (
              <a key={i} href={l} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gold hover:underline py-1">
                <Eye className="h-4 w-4 flex-shrink-0" /> {l}
              </a>
            ))}
          </div>
        </div>
      )}

      {denuncia.status !== "arquivada" && denuncia.status !== "encaminhada" && activeAction === "none" && (
        <div className="bg-card rounded-xl p-5 border border-border shadow-institutional">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4">Decisão Ministerial</h3>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setActiveAction("denuncia")} className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
              <Gavel className="h-4 w-4 mr-2" /> Oferecer Denúncia
            </Button>
            <Button onClick={async () => {
              await supabase.from("denuncias_ouvidoria" as any).update({ status: "em_analise" }).eq("id", denunciaId);
              queryClient.invalidateQueries({ queryKey: ["ouvidoria-detail", denunciaId] });
              queryClient.invalidateQueries({ queryKey: ["mp-denuncias-ouvidoria"] });
              toast.success("Status atualizado para Em Análise.");
            }} variant="outline" className="rounded-xl">
              <Clock className="h-4 w-4 mr-2" /> Marcar Em Análise
            </Button>
            <Button onClick={() => setActiveAction("arquivamento")} variant="outline" className="rounded-xl text-muted-foreground">
              <Archive className="h-4 w-4 mr-2" /> Arquivar
            </Button>
          </div>
        </div>
      )}

      {activeAction === "denuncia" && (
        <div className="bg-card rounded-xl p-5 border-2 border-institutional/30 shadow-institutional">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Gavel className="h-4 w-4 text-institutional" /> Oferecimento de Denúncia
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Será criado um processo criminal em segredo de justiça, com sorteio automático de magistrado.</p>
          <form onSubmit={(e) => { e.preventDefault(); oferecerDenuncia.mutate(); }} className="space-y-4">
            <Input placeholder="Tipificação penal (ex: Art. 155, CP — Furto)" value={denForm.tipificacao} onChange={(e) => setDenForm({ ...denForm, tipificacao: e.target.value })} className="rounded-xl" />
            <RichTextEditor placeholder="Resumo da denúncia..." value={denForm.resumo} onChange={(html) => setDenForm({ ...denForm, resumo: html })} minHeight="100px" />
            <div className="flex justify-end">
              <AISugerirDespacho
                tipoAto="parecer_mp"
                tituloAto={`Denúncia — ${denForm.tipificacao || "MP"}`}
                rascunhoAtual={denForm.fundamentacao}
                onInsert={(h) => setDenForm((f) => ({ ...f, fundamentacao: appendAiHtml(f.fundamentacao, h) }))}
                label="Sugerir fundamentação com IA"
              />
            </div>
            <RichTextEditor placeholder="Fundamentação jurídica..." value={denForm.fundamentacao} onChange={(html) => setDenForm({ ...denForm, fundamentacao: html })} minHeight="160px" />
            <div className="flex gap-2">
              <Button type="submit" disabled={oferecerDenuncia.isPending} className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
                {oferecerDenuncia.isPending ? "Processando..." : "Oferecer Denúncia e Distribuir Processo"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setActiveAction("none")} className="rounded-xl">Cancelar</Button>
            </div>
          </form>
        </div>
      )}

      {activeAction === "arquivamento" && (
        <div className="bg-card rounded-xl p-5 border-2 border-gold/30 shadow-institutional">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Archive className="h-4 w-4 text-gold-dark" /> Arquivamento da Denúncia
          </h3>
          <form onSubmit={(e) => { e.preventDefault(); arquivarDenuncia.mutate(); }} className="space-y-4">
            <div className="flex justify-end">
              <AISugerirDespacho
                tipoAto="parecer_mp"
                tituloAto="Promoção de arquivamento"
                rascunhoAtual={arquivJust}
                onInsert={(h) => setArquivJust((prev) => appendAiHtml(prev, h))}
                label="Sugerir arquivamento com IA"
              />
            </div>
            <RichTextEditor placeholder="Justificativa para o arquivamento..." value={arquivJust} onChange={(html) => setArquivJust(html)} minHeight="160px" />
            <div className="flex gap-2">
              <Button type="submit" disabled={arquivarDenuncia.isPending} className="rounded-xl bg-gold hover:bg-gold/90 text-foreground">
                {arquivarDenuncia.isPending ? "Processando..." : "Arquivar Denúncia"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setActiveAction("none")} className="rounded-xl">Cancelar</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Icon className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
