import jsPDF from "jspdf";

/** Parse JSON array partes or plain text for PDF display */
function formatPartesForPdf(value: string): string {
  if (!value) return "-";
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((p: any) => p.id_personagem ? `${p.nome} (ID: ${p.id_personagem})` : p.nome).join(", ");
    }
  } catch { /* not JSON */ }
  return value;
}

/* ─── Shared PDF helpers ─── */

/** Sanitize text for jsPDF standard fonts (Latin1 only) */
function sanitize(text: string): string {
  let s = String(text || "");
  // Common Unicode replacements
  s = s.replace(/\u2713|\u2714/g, "(OK)");
  s = s.replace(/\u2022|\u2023|\u25CF|\u25CB/g, "-");
  s = s.replace(/\u2014|\u2015/g, "-");
  s = s.replace(/\u2013/g, "-");
  s = s.replace(/\u2018|\u2019|\u02BC|\u0060|\u00B4/g, "'");
  s = s.replace(/\u201C|\u201D|\u201E|\u201F/g, '"');
  s = s.replace(/\u2026/g, "...");
  s = s.replace(/\u2192/g, "->");
  s = s.replace(/\u2190/g, "<-");
  s = s.replace(/\u00A0/g, " ");
  s = s.replace(/\u200B|\u200C|\u200D|\uFEFF/g, "");
  // Portuguese accented chars -> ASCII equivalents for Helvetica compatibility
  s = s.replace(/[àáâãä]/g, "a").replace(/[ÀÁÂÃÄ]/g, "A");
  s = s.replace(/[èéêë]/g, "e").replace(/[ÈÉÊË]/g, "E");
  s = s.replace(/[ìíîï]/g, "i").replace(/[ÌÍÎÏ]/g, "I");
  s = s.replace(/[òóôõö]/g, "o").replace(/[ÒÓÔÕÖ]/g, "O");
  s = s.replace(/[ùúûü]/g, "u").replace(/[ÙÚÛÜ]/g, "U");
  s = s.replace(/ç/g, "c").replace(/Ç/g, "C");
  s = s.replace(/ñ/g, "n").replace(/Ñ/g, "N");
  s = s.replace(/[ýÿ]/g, "y").replace(/Ý/g, "Y");
  // Remove any remaining non-printable or non-ASCII chars that could garble
  s = s.replace(/[^\x20-\x7E\n\r\t]/g, "");
  return s;
}

const MARGIN = 20;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const lines = doc.splitTextToSize(sanitize(text), maxWidth);
  for (const line of lines) {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

function drawSeparator(doc: jsPDF, y: number): number {
  doc.setDrawColor(180, 160, 120);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  return y + 4;
}

function addFooter(doc: jsPDF, text: string) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(sanitize(text), PAGE_W / 2, 290, { align: "center" });
    doc.text(sanitize(`Pagina ${i} de ${pages}`), PAGE_W - MARGIN, 290, { align: "right" });
  }
}

/* ─── TRIBUNAL DE JUSTIÇA PDF ─── */
export function generateProcessoPDF(params: {
  processo: any;
  juizNome: string;
  movimentacoes: any[];
  atos: any[];
  audiencias: any[];
  sentencas: any[];
  procuracoes: any[];
  interessados: any[];
  logoBase64: string;
}) {
  const { processo, juizNome, movimentacoes, atos, audiencias, sentencas, procuracoes, interessados, logoBase64 } = params;
  const doc = new jsPDF();

  // Header
  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", MARGIN, 8, 22, 22); } catch {}
  }
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 60, 90);
  doc.text("PODER JUDICIARIO", PAGE_W / 2, 14, { align: "center" });
  doc.setFontSize(9);
  doc.text("TRIBUNAL DE JUSTICA DO ESTADO DE SAO PAULO", PAGE_W / 2, 19, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text("Comarca de Sao Paulo - Jaguare RP", PAGE_W / 2, 24, { align: "center" });

  let y = 32;
  y = drawSeparator(doc, y);

  // Title
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 60, 90);
  doc.text("INTEGRA DO PROCESSO", PAGE_W / 2, y + 4, { align: "center" });
  y += 12;

  // Process info
  doc.setFontSize(9);
  doc.setTextColor(50);
  const infoRows = [
    ["No do Processo:", processo.numero],
    ["Classe:", processo.classe?.toUpperCase()],
    ["Assunto:", processo.assunto],
    ["Vara:", processo.vara || "-"],
    ["Juiz(a):", juizNome || "Nao atribuido"],
    ["Status:", processo.status?.replace(/_/g, " ").toUpperCase()],
    ["Data de Autuacao:", new Date(processo.created_at).toLocaleString("pt-BR")],
    ["Autor(es):", formatPartesForPdf(processo.autor_nome)],
    ["Reu(s):", formatPartesForPdf(processo.reu_nome)],
  ];
  if (processo.valor_causa) {
    infoRows.push(["Valor da Causa:", Number(processo.valor_causa).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })]);
  }
  if (processo.sigilo && processo.sigilo !== "publico") {
    infoRows.push(["Sigilo:", processo.sigilo === "segredo_justica" ? "Segredo de Justica" : "Sigilo Absoluto"]);
  }

  for (const [label, value] of infoRows) {
    doc.setFont("helvetica", "bold");
    doc.text(sanitize(label), MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.text(sanitize(String(value || "-")), MARGIN + 40, y);
    y += 5;
  }

  if (processo.descricao) {
    y += 3;
    doc.setFont("helvetica", "bold");
    doc.text("Sintese dos Fatos:", MARGIN, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    y = addWrappedText(doc, processo.descricao, MARGIN, y, CONTENT_W, 4);
    doc.setFontSize(9);
  }

  // Procurações
  if (procuracoes?.length) {
    y += 4;
    y = drawSeparator(doc, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 60, 90);
    doc.text("PROCURACOES", MARGIN, y + 3);
    y += 8;
    doc.setTextColor(50);
    for (const p of procuracoes) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold");
      doc.text(sanitize(`- ${p.advogado_nome}`), MARGIN + 2, y);
      doc.setFont("helvetica", "normal");
      const labelParte = p.parte === "autor" ? "Autor" : "Reu";
      doc.text(sanitize(` | ${labelParte} | ${p.status}`), MARGIN + 2 + doc.getTextWidth(sanitize(`- ${p.advogado_nome}`)), y);
      y += 6;
    }
  }

  // Interessados
  if (interessados?.length) {
    y += 4;
    y = drawSeparator(doc, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 60, 90);
    doc.text("INTERESSADOS", MARGIN, y + 3);
    y += 8;
    doc.setTextColor(50);
    for (const i of interessados) {
      doc.setFont("helvetica", "normal");
      doc.text(sanitize(`- ${i.orgao || ""} - ${i.nome || ""}`), MARGIN + 2, y);
      y += 5;
    }
  }

  // Atos Judiciais
  if (atos?.length) {
    y += 4;
    y = drawSeparator(doc, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 60, 90);
    doc.text("ATOS JUDICIAIS", MARGIN, y + 3);
    y += 8;
    doc.setTextColor(50);
    for (const a of atos) {
      if (y > 265) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(sanitize(`${a.tipo?.toUpperCase()} - ${a.titulo}`), MARGIN + 2, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(sanitize(`${new Date(a.created_at).toLocaleString("pt-BR")} - ${a.autor_nome || "Sistema"} ${a.assinado ? "(OK) Assinado" : ""}`), MARGIN + 2, y);
      y += 4;
      doc.setFontSize(8);
      y = addWrappedText(doc, a.conteudo || "", MARGIN + 2, y, CONTENT_W - 4, 3.5);
      y += 4;
    }
  }

  // Audiências
  if (audiencias?.length) {
    y += 4;
    y = drawSeparator(doc, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 60, 90);
    doc.text("AUDIENCIAS", MARGIN, y + 3);
    y += 8;
    doc.setTextColor(50);
    for (const a of audiencias) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(sanitize(`- ${a.tipo} - ${new Date(a.data_hora).toLocaleString("pt-BR")} - ${a.local || "-"} - ${a.status}`), MARGIN + 2, y);
      y += 5;
    }
  }

  // Sentenças
  if (sentencas?.length) {
    y += 4;
    y = drawSeparator(doc, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 60, 90);
    doc.text("SENTENCAS", MARGIN, y + 3);
    y += 8;
    doc.setTextColor(50);
    for (const s of sentencas) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(sanitize(`${s.tipo?.toUpperCase()} - ${s.assinado ? "(OK) Assinado" : "Pendente de assinatura"}`), MARGIN + 2, y);
      y += 4;
      if (s.ementa) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        y = addWrappedText(doc, `Ementa: ${s.ementa}`, MARGIN + 2, y, CONTENT_W - 4, 3.5);
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      y = addWrappedText(doc, `Fundamentacao: ${s.fundamentacao || "-"}`, MARGIN + 2, y, CONTENT_W - 4, 3.5);
      y = addWrappedText(doc, `Dispositivo: ${s.dispositivo || "-"}`, MARGIN + 2, y, CONTENT_W - 4, 3.5);
      y += 4;
    }
  }

  // Movimentações
  if (movimentacoes?.length) {
    y += 4;
    y = drawSeparator(doc, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 60, 90);
    doc.text("MOVIMENTACOES PROCESSUAIS", MARGIN, y + 3);
    y += 8;
    doc.setTextColor(50);
    for (const m of movimentacoes) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(sanitize(`${new Date(m.created_at).toLocaleString("pt-BR")} - ${m.tipo?.toUpperCase()}`), MARGIN + 2, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      y = addWrappedText(doc, `${m.autor_nome || "Sistema"}: ${m.descricao}`, MARGIN + 4, y, CONTENT_W - 6, 3.5);
      y += 3;
    }
  }

  addFooter(doc, `Processo no ${processo.numero} - Tribunal de Justica do Estado de Sao Paulo - Sistema Judiciario vBETA`);

  doc.save(`Processo_${processo.numero.replace(/\W/g, "_")}.pdf`);
}

/* ─── CARTÓRIO PDF ─── */
export function generateCartorioPDF(params: {
  registro: any;
  requerentes: { nome: string; id_personagem: string }[];
  envolvidos: { nome: string; id_personagem: string }[];
  links: string[];
  logoBase64: string;
}) {
  const { registro, requerentes, envolvidos, links, logoBase64 } = params;
  const doc = new jsPDF();

  // Header with cartório logo
  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", PAGE_W / 2 - 15, 6, 30, 22); } catch {}
  }
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 40, 40);
  doc.text("CARTÓRIO DE REGISTRO CIVIL", PAGE_W / 2, 32, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Comarca de Jaguare RP - Estado de Sao Paulo", PAGE_W / 2, 37, { align: "center" });

  let y = 43;
  y = drawSeparator(doc, y);

  // Document type title
  const tipoLabels: Record<string, string> = {
    certidao_nascimento: "CERTIDAO DE NASCIMENTO",
    certidao_casamento: "CERTIDAO DE CASAMENTO",
    certidao_obito: "CERTIDAO DE OBITO",
    divorcio: "CERTIDAO DE DIVORCIO",
    adocao: "TERMO DE ADOCAO",
    antecedentes: "CERTIDAO DE ANTECEDENTES",
    contrato: "REGISTRO DE CONTRATO",
    escritura: "ESCRITURA PUBLICA",
    procuracao: "PROCURACAO PUBLICA",
    reconhecimento_firma: "RECONHECIMENTO DE FIRMA",
    autenticacao: "AUTENTICACAO DE DOCUMENTO",
  };

  const requerenteLabels: Record<string, string> = {
    certidao_nascimento: "REGISTRANDO",
    certidao_casamento: "CONJUGE 1",
    certidao_obito: "SOLICITANTE (FAMILIAR/RESPONSAVEL)",
    certidao_distribuicao: "SOLICITANTE",
    divorcio: "CONJUGE 1",
    adocao: "ADOTANTE(S)",
    antecedentes: "PESSOA CONSULTADA",
    contrato: "PARTE 1",
    escritura: "OUTORGANTE(S)",
    procuracao: "OUTORGANTE(S)",
    reconhecimento_firma: "SOLICITANTE",
    autenticacao: "SOLICITANTE",
  };

  const envolvidosLabels: Record<string, string> = {
    certidao_nascimento: "PAIS / RESPONSAVEIS",
    certidao_casamento: "CONJUGE 2",
    certidao_obito: "FALECIDO(A)",
    divorcio: "CONJUGE 2",
    adocao: "ADOTADO(A)",
    contrato: "DEMAIS PARTES",
    escritura: "OUTORGADO(S) / ADQUIRENTE(S)",
    procuracao: "OUTORGADO(S)",
  };

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(sanitize(tipoLabels[registro.tipo] || registro.tipo.toUpperCase()), PAGE_W / 2, y + 6, { align: "center" });
  y += 14;

  // Registry info
  doc.setFontSize(9);
  doc.setTextColor(50);
  const rows = [
    ["No Registro:", registro.numero_registro],
    ["Status:", registro.status?.toUpperCase()],
    ["Data da Solicitacao:", new Date(registro.created_at).toLocaleString("pt-BR")],
  ];
  if (registro.emitido_por_nome) rows.push(["Emitido por:", registro.emitido_por_nome]);

  for (const [label, value] of rows) {
    doc.setFont("helvetica", "bold");
    doc.text(sanitize(label), MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.text(sanitize(String(value || "-")), MARGIN + 40, y);
    y += 5;
  }

  // Requerentes
  y += 3;
  y = drawSeparator(doc, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(requerenteLabels[registro.tipo] || "REQUERENTE(S)", MARGIN, y + 3);
  y += 8;
  doc.setTextColor(50);
  doc.setFont("helvetica", "normal");
  for (const r of requerentes) {
    doc.text(sanitize(`- ${r.nome} (ID: ${r.id_personagem})`), MARGIN + 2, y);
    y += 5;
  }
  if (!requerentes.length) {
    doc.text(sanitize(registro.requerente_nome || "-"), MARGIN + 2, y);
    y += 5;
  }

  // Envolvidos
  if (envolvidos.length) {
    y += 3;
    y = drawSeparator(doc, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(envolvidosLabels[registro.tipo] || "PARTES ENVOLVIDAS", MARGIN, y + 3);
    y += 8;
    doc.setTextColor(50);
    doc.setFont("helvetica", "normal");
    for (const e of envolvidos) {
      doc.text(sanitize(`- ${e.nome} (ID: ${e.id_personagem})`), MARGIN + 2, y);
      y += 5;
    }
  }

  // Descrição
  y += 3;
  y = drawSeparator(doc, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("DESCRICAO", MARGIN, y + 3);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50);
  doc.setFontSize(9);
  y = addWrappedText(doc, registro.descricao || "-", MARGIN, y, CONTENT_W, 4.5);

  // For procuração, show digital signatures section instead of raw JSON observacoes
  if (registro.tipo === "procuracao" && registro.observacoes) {
    let signatures: any[] = [];
    try { signatures = JSON.parse(registro.observacoes); } catch {}
    if (Array.isArray(signatures) && signatures.length > 0) {
      y += 4;
      y = drawSeparator(doc, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("ASSINATURAS DIGITAIS", MARGIN, y + 3);
      y += 8;
      doc.setTextColor(50);
      doc.setFont("helvetica", "normal");
      for (const sig of signatures) {
        const status = sig.confirmed ? "Confirmada" : "Pendente";
        doc.text(sanitize(`- ${sig.nome} (ID: ${sig.id_personagem}) - ${status}`), MARGIN + 2, y);
        y += 5;
      }
    }
  } else if (registro.tipo === "certidao_distribuicao" && registro.observacoes) {
    y += 4;
    y = drawSeparator(doc, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("PROCESSOS DISTRIBUIDOS", MARGIN, y + 3);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50);
    doc.setFontSize(8);
    y = addWrappedText(doc, registro.observacoes, MARGIN, y, CONTENT_W, 4);
    doc.setFontSize(9);
  } else if (registro.observacoes) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.text("Observacoes:", MARGIN, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    y = addWrappedText(doc, registro.observacoes, MARGIN, y, CONTENT_W, 4.5);
  }

  // Links
  if (links.length) {
    y += 4;
    y = drawSeparator(doc, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("DOCUMENTOS ANEXOS", MARGIN, y + 3);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50);
    doc.setFontSize(7);
    for (const url of links) {
      doc.textWithLink(url, MARGIN + 2, y, { url });
      y += 4;
    }
  }

  // Signature area
  y += 15;
  if (y > 250) { doc.addPage(); y = 40; }
  doc.setDrawColor(50);
  doc.line(PAGE_W / 2 - 35, y, PAGE_W / 2 + 35, y);
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(80);
  doc.text(sanitize(registro.emitido_por_nome || "Oficial de Justica / Cartorario"), PAGE_W / 2, y, { align: "center" });
  y += 4;
  doc.setFontSize(7);
  doc.text("Cartorio de Registro Civil - Comarca de Jaguare RP", PAGE_W / 2, y, { align: "center" });

  addFooter(doc, `Registro ${registro.numero_registro} - Cartorio de Registro Civil - Comarca de Jaguare RP`);

  doc.save(`Cartorio_${registro.numero_registro.replace(/\W/g, "_")}.pdf`);
}

/* ─── Logo to Base64 converter ─── */
export function imageToBase64(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve("");
    img.src = src;
  });
}
