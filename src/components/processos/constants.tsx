import { FileText, Clock, Gavel, CheckCircle, File, AlertTriangle } from "lucide-react";

/* ─── Currency helpers ─── */
export const formatCurrency = (value: string) => {
  const digits = value.replace(/\D/g, "");
  const number = parseInt(digits || "0", 10) / 100;
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export const parseCurrencyToNumber = (value: string): number | null => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  return parseInt(digits, 10) / 100;
};

/* ─── Status Config ─── */
export const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  novo: { label: "Novo", color: "bg-institutional/10 text-institutional", icon: FileText },
  em_andamento: { label: "Em Andamento", color: "bg-gold/10 text-gold-dark", icon: Clock },
  concluso: { label: "Concluso", color: "bg-accent/20 text-accent-foreground", icon: Gavel },
  sentenciado: { label: "Sentenciado", color: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400", icon: CheckCircle },
  arquivado: { label: "Arquivado", color: "bg-muted text-muted-foreground", icon: File },
  suspenso: { label: "Suspenso", color: "bg-destructive/10 text-destructive", icon: AlertTriangle },
};

export const ATO_TIPOS = [
  { value: "despacho", label: "Despacho" },
  { value: "decisao", label: "Decisão Interlocutória" },
  { value: "sentenca", label: "Sentença" },
  { value: "mandado", label: "Mandado" },
  { value: "intimacao", label: "Intimação" },
  { value: "alvara", label: "Alvará" },
  { value: "certidao", label: "Certidão" },
  { value: "acordao", label: "Acórdão" },
];

export const ATO_TEMPLATES: Record<string, string> = {
  despacho: `DESPACHO\n\nVistos.\n\nCite-se o(a) réu(é) para que, no prazo legal, apresente contestação, sob pena de revelia.\n\nIntimem-se.\n\n[Comarca], [data].\n\n[Magistrado]\nJuiz(a) de Direito`,
  sentenca: `SENTENÇA\n\nVistos, relatados e discutidos estes autos.\n\n[RELATÓRIO]\n\n[FUNDAMENTAÇÃO]\n\n[DISPOSITIVO]\n\nAnte o exposto, JULGO [PROCEDENTE/IMPROCEDENTE] o pedido formulado na inicial.\n\nCustas na forma da lei. Sem condenação em honorários.\n\nP.R.I.\n\n[Comarca], [data].\n\n[Magistrado]\nJuiz(a) de Direito`,
  mandado: `MANDADO DE [CITAÇÃO/INTIMAÇÃO/BUSCA E APREENSÃO]\n\nO(A) Dr(a). [Magistrado], Juiz(a) de Direito da [Vara], da Comarca de [Comarca],\n\nMANDA ao(à) Sr(a). Oficial de Justiça que, em cumprimento ao presente, proceda à [diligência] em face de [parte].\n\nCumpra-se.\n\n[Comarca], [data].`,
  intimacao: `INTIMAÇÃO\n\nFica V.Sa. INTIMADO(A) para [finalidade], no prazo de [X] horas, sob pena de [consequência].\n\nProcesso nº [número]\n\n[Comarca], [data].`,
  alvara: `ALVARÁ DE [LEVANTAMENTO/SOLTURA]\n\nO(A) Dr(a). [Magistrado], Juiz(a) de Direito,\n\nAUTORIZA [beneficiário] a [finalidade], conforme decisão proferida nos autos do processo nº [número].\n\nValidade: [prazo].\n\n[Comarca], [data].`,
  certidao: `CERTIDÃO\n\nCertifico e dou fé que [conteúdo da certidão].\n\nO referido é verdade. Dou fé.\n\n[Comarca], [data].\n\n[Servidor]\nEscrivão(ã) Judicial`,
  decisao: `DECISÃO INTERLOCUTÓRIA\n\nVistos.\n\n[Fundamentação]\n\nAnte o exposto, [DEFIRO/INDEFIRO] o pedido de [objeto].\n\nIntimem-se.\n\n[Comarca], [data].\n\n[Magistrado]\nJuiz(a) de Direito`,
  acordao: `ACÓRDÃO\n\nVistos, relatados e discutidos estes autos.\n\nACORDAM os Desembargadores da [Câmara], por [unanimidade/maioria], em [dar/negar] provimento ao recurso.\n\n[Ementa]\n\n[Voto do Relator]\n\n[Comarca], [data].`,
};

export const CLASSE_VARA_MAP: Record<string, string> = {
  criminal: "Vara Criminal",
  civil: "Vara Cível",
  administrativo: "Vara da Fazenda Pública",
  constitucional: "Vara da Fazenda Pública",
};

export const CLASSES_ORIGINARIAS = [
  { value: "mandado_seguranca", label: "Mandado de Segurança", classe: "constitucional" },
  { value: "habeas_corpus", label: "Habeas Corpus", classe: "criminal" },
  { value: "acao_rescisoria", label: "Ação Rescisória", classe: "civil" },
  { value: "reclamacao", label: "Reclamação", classe: "civil" },
  { value: "conflito_competencia", label: "Conflito de Competência", classe: "civil" },
];

export const ORGAOS_JULGADORES = [
  "1ª Câmara de Direito Público",
  "2ª Câmara de Direito Público",
  "1ª Câmara Criminal",
  "2ª Câmara Criminal",
  "Câmara Cível",
  "Tribunal Pleno",
];

/** InfoCard simples reutilizável */
export function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card rounded-xl p-3 border border-border">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-medium text-foreground truncate">{value}</p>
    </div>
  );
}