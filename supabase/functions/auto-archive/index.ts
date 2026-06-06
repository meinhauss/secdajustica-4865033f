import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let archivedCount = 0;
  let prescritosCount = 0;

  // ========================================================================
  // PARTE 1: Arquivamento por sentença (3 dias após sentença sem recursos)
  // ========================================================================
  const { data: sentenciados } = await supabase
    .from("processos")
    .select("id, numero")
    .eq("status", "sentenciado");

  if (sentenciados?.length) {
    for (const proc of sentenciados) {
      const { data: sentencas } = await supabase
        .from("sentencas")
        .select("created_at")
        .eq("processo_id", proc.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!sentencas?.length) continue;

      const sentencaDate = new Date(sentencas[0].created_at);
      if (sentencaDate.getTime() > Date.now() - 3 * 24 * 60 * 60 * 1000) continue;

      const { data: activeAppeals } = await supabase
        .from("apelacoes")
        .select("id")
        .eq("processo_id", proc.id)
        .not("status", "in", '("julgada","inadmitida")');

      if (activeAppeals?.length) continue;

      const { error: updateErr } = await supabase
        .from("processos")
        .update({ status: "arquivado" })
        .eq("id", proc.id);

      if (!updateErr) {
        await supabase.from("movimentacoes").insert({
          processo_id: proc.id,
          tipo: "arquivamento_automatico",
          descricao: "Processo arquivado automaticamente após 3 dias da sentença sem interposição de recurso.",
        });
        archivedCount++;
      }
    }
  }

  // ========================================================================
  // PARTE 2: Prescrição criminal — Decreto-Lei 011/2024, Art. 2º
  // 30 dias após abertura de processo criminal sem sentença => prescrição
  // ========================================================================
  const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: criminais } = await supabase
    .from("processos")
    .select("id, numero, juiz_id, advogado_autor_id, advogado_reu_id, autor_nome, reu_nome, created_at")
    .eq("classe", "criminal")
    .not("status", "in", '("arquivado","sentenciado","prescrito")')
    .lte("created_at", trintaDiasAtras);

  if (criminais?.length) {
    for (const proc of criminais) {
      // Texto da prescrição
      const descricaoPrescricao = `<h2>PRESCRIÇÃO DA PRETENSÃO PUNITIVA</h2>
<p>Decorrido o prazo de <strong>30 (trinta) dias</strong> desde a abertura do presente processo criminal sem prolação de sentença, declara-se de ofício a <strong>PRESCRIÇÃO</strong> da pretensão punitiva estatal, nos termos do <strong>art. 2º do Decreto-Lei nº 011, de 2024</strong>:</p>
<p><em>"Art. 2º Prescreve-se o direito de punir em 30 dias para qualquer crime cometido pelo infrator."</em></p>
<p>Em consequência, <strong>todos os atos praticados perdem sua validade</strong>, inclusive eventuais mandados expedidos, que ficam automaticamente <strong>revogados</strong>.</p>
<p>Arquivem-se os autos.</p>`;

      // 1. Arquivar o processo como prescrito e tornar público
      const { error: updErr } = await supabase
        .from("processos")
        .update({ status: "prescrito", sigilo: "publico" })
        .eq("id", proc.id);


      if (updErr) continue;

      // 2. Registrar movimentação de prescrição
      await supabase.from("movimentacoes").insert({
        processo_id: proc.id,
        tipo: "prescricao_automatica",
        descricao: descricaoPrescricao,
      });

      // 3. Cancelar mandados ativos do processo
      const { data: mandadosAtivos } = await supabase
        .from("mandados")
        .select("id")
        .eq("processo_id", proc.id)
        .not("status", "in", '("cumprido","cancelado","revogado")');

      if (mandadosAtivos?.length) {
        await supabase
          .from("mandados")
          .update({
            status: "revogado",
            observacoes: "Mandado revogado automaticamente em razão da prescrição da pretensão punitiva (Decreto-Lei 011/2024, art. 2º).",
          })
          .in("id", mandadosAtivos.map((m: any) => m.id));
      }

      // 4. Notificar partes envolvidas
      const destinatarios = new Set<string>();
      if (proc.juiz_id) destinatarios.add(proc.juiz_id);
      if (proc.advogado_autor_id) destinatarios.add(proc.advogado_autor_id);
      if (proc.advogado_reu_id) destinatarios.add(proc.advogado_reu_id);

      // Procuradores ativos
      const { data: procs } = await supabase
        .from("procuracoes")
        .select("advogado_id")
        .eq("processo_id", proc.id)
        .eq("status", "ativa");
      procs?.forEach((p: any) => p.advogado_id && destinatarios.add(p.advogado_id));

      // Interessados
      const { data: interessados } = await supabase
        .from("interessados_processo")
        .select("user_id")
        .eq("processo_id", proc.id);
      interessados?.forEach((i: any) => i.user_id && destinatarios.add(i.user_id));

      // Buscar autores/réus por id_personagem nos profiles
      const tryParse = (val: any): any[] => {
        if (!val) return [];
        if (typeof val !== "string") return Array.isArray(val) ? val : [];
        if (!val.trim().startsWith("[")) return [];
        try { return JSON.parse(val); } catch { return []; }
      };
      const idsPersonagens: string[] = [];
      [...tryParse(proc.autor_nome), ...tryParse(proc.reu_nome)].forEach((p: any) => {
        if (p?.id_personagem) idsPersonagens.push(String(p.id_personagem));
      });
      if (idsPersonagens.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id")
          .in("id_personagem", idsPersonagens);
        profs?.forEach((p: any) => p.user_id && destinatarios.add(p.user_id));
      }

      // Inserir notificações
      if (destinatarios.size) {
        const notifs = Array.from(destinatarios).map((uid) => ({
          user_id: uid,
          titulo: `Processo ${proc.numero} arquivado por prescrição`,
          mensagem: `O processo criminal ${proc.numero} foi arquivado automaticamente em razão da prescrição da pretensão punitiva (30 dias — Decreto-Lei 011/2024, art. 2º). Todos os atos praticados perdem a validade, inclusive mandados expedidos.`,
          tipo: "prescricao",
          link_secao: `processos:${proc.id}`,
        }));
        await supabase.from("notificacoes").insert(notifs);
      }

      prescritosCount++;
    }
  }

  return new Response(
    JSON.stringify({ archived: archivedCount, prescritos: prescritosCount }),
    { headers: { "Content-Type": "application/json" } }
  );
});
