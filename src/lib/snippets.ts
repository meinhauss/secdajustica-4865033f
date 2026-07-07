/**
 * Atalhos rápidos que expandem no editor ao digitar /atalho + espaço.
 * O texto pode conter variáveis {{...}} que são substituídas via aplicarVariaveis.
 */
export const SNIPPETS_PADRAO: Record<string, string> = {
  desp: "Vistos.\n\n",
  sent: "Vistos, etc.\n\nTrata-se de {{classe}} envolvendo {{nome_autor}} em face de {{nome_reu}}.\n\n",
  int: "Intime-se.",
  cite: "Cite-se {{nome_reu}} para, no prazo legal, apresentar defesa.",
  conc: "Conclusos para decisão.",
  cump: "Cumpra-se.",
  arq: "Arquive-se com as cautelas de estilo.",
  data: "{{data_hoje}}",
  proc: "Processo nº {{numero_processo}}",
  ass: "{{nome_usuario}}\n{{juiz}}",
  parec: "MINISTÉRIO PÚBLICO\n\nProcesso nº {{numero_processo}}\n\nO MINISTÉRIO PÚBLICO, no uso de suas atribuições, manifesta-se nos seguintes termos:\n\n",
  pet: "EXCELENTÍSSIMO(A) SENHOR(A) JUIZ(A) DE DIREITO\n\nProcesso nº {{numero_processo}}\n\n{{nome_usuario}}, já qualificado nos autos, vem respeitosamente perante Vossa Excelência expor e requerer o que segue:\n\n",
};

export const SNIPPETS_INFO: { atalho: string; descricao: string }[] = [
  { atalho: "/desp", descricao: "Início de despacho (Vistos.)" },
  { atalho: "/sent", descricao: "Início de sentença" },
  { atalho: "/int", descricao: "Intime-se" },
  { atalho: "/cite", descricao: "Citação do réu" },
  { atalho: "/conc", descricao: "Conclusos" },
  { atalho: "/cump", descricao: "Cumpra-se" },
  { atalho: "/arq", descricao: "Arquivamento" },
  { atalho: "/data", descricao: "Data de hoje" },
  { atalho: "/proc", descricao: "Nº do processo" },
  { atalho: "/ass", descricao: "Assinatura" },
  { atalho: "/parec", descricao: "Parecer do MP" },
  { atalho: "/pet", descricao: "Petição inicial" },
];
