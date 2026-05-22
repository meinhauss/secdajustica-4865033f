export interface ArtigoPenal {
  artigo: string;
  crime: string;
  penaMeses: number;
  multa: number;
  fianca: number | "sem_fianca" | null;
  descricao: string;
  categoria: string;
}

export const CODIGO_PENAL: ArtigoPenal[] = [
  // Trânsito
  { artigo: "Art. 162", crime: "Dirigir sem habilitação", penaMeses: 0, multa: 9000, fianca: null, descricao: "Conduzir veículo automotor sem possuir CNH.", categoria: "Trânsito" },
  { artigo: "Art. 165", crime: "Dirigir sob efeito de álcool", penaMeses: 30, multa: 9000, fianca: 30000, descricao: "Conduzir veículo embriagado ou sob efeito de substâncias.", categoria: "Trânsito" },
  { artigo: "Art. 165-A", crime: "Recusar bafômetro", penaMeses: 20, multa: 20000, fianca: 20000, descricao: "Recusar-se a realizar o teste de alcoolemia.", categoria: "Trânsito" },
  { artigo: "Art. 169", crime: "Direção desatenta", penaMeses: 0, multa: 6000, fianca: null, descricao: "Dirigir sem atenção ou sem os cuidados indispensáveis.", categoria: "Trânsito" },
  { artigo: "Art. 172", crime: "Arremessar objetos", penaMeses: 0, multa: 9000, fianca: null, descricao: "Atirar objetos ou fluidos do veículo em via pública.", categoria: "Trânsito" },
  { artigo: "Art. 175", crime: "Manobra perigosa", penaMeses: 0, multa: 24000, fianca: null, descricao: "Realizar exibição de perícia ou manobras arriscadas.", categoria: "Trânsito" },
  { artigo: "Art. 181", crime: "Estacionamento proibido", penaMeses: 0, multa: 12000, fianca: null, descricao: "Estacionar em locais não permitidos ou obstruindo vias.", categoria: "Trânsito" },
  { artigo: "Art. 186", crime: "Dirigir na contramão", penaMeses: 0, multa: 15000, fianca: null, descricao: "Transitar pela contramão de direção.", categoria: "Trânsito" },
  { artigo: "Art. 190", crime: "Seguir veículo emergencial", penaMeses: 0, multa: 15000, fianca: null, descricao: "Seguir viaturas em serviço de urgência.", categoria: "Trânsito" },
  { artigo: "Art. 192", crime: "Distância insegura", penaMeses: 0, multa: 6000, fianca: null, descricao: "Não manter distância segura frontal ou lateral de outros veículos.", categoria: "Trânsito" },
  { artigo: "Art. 194", crime: "Marcha ré indevida", penaMeses: 0, multa: 2000, fianca: null, descricao: "Transitar em marcha ré de forma perigosa ou prolongada.", categoria: "Trânsito" },
  { artigo: "Art. 218", crime: "Excesso de velocidade", penaMeses: 0, multa: 9000, fianca: null, descricao: "Transitar em velocidade superior à permitida para a via.", categoria: "Trânsito" },

  // Ordem Pública
  { artigo: "Art. 406", crime: "Perturbação do sossego", penaMeses: 0, multa: 8000, fianca: null, descricao: "Perturbar o trabalho ou o sossego alheio (ex: som alto).", categoria: "Ordem Pública" },
  { artigo: "Art. 407", crime: "Tumulto", penaMeses: 0, multa: 12000, fianca: null, descricao: "Promover ou participar de desordem em local público.", categoria: "Ordem Pública" },
  { artigo: "Art. 405", crime: "Recusar identificação", penaMeses: 0, multa: 20000, fianca: null, descricao: "Negar-se a apresentar documento de identidade à autoridade.", categoria: "Ordem Pública" },
  { artigo: "Art. 403", crime: "Ocultação facial", penaMeses: 0, multa: 25000, fianca: null, descricao: "Uso de máscaras ou itens que dificultem a identificação.", categoria: "Ordem Pública" },
  { artigo: "Art. 287", crime: "Apologia ao crime", penaMeses: 30, multa: 50000, fianca: 40000, descricao: "Ato público de elogiar, exaltar ou defender um crime ou seu autor.", categoria: "Ordem Pública" },

  // Crimes contra a Vida
  { artigo: "Art. 121", crime: "Homicídio", penaMeses: 60, multa: 25000, fianca: "sem_fianca", descricao: "Matar alguém.", categoria: "Contra a Vida" },
  { artigo: "Art. 121-A", crime: "Homicídio qualificado", penaMeses: 80, multa: 35000, fianca: "sem_fianca", descricao: "Matar alguém com agravantes (motivo fútil, emboscada, etc.).", categoria: "Contra a Vida" },
  { artigo: "Art. 121-B", crime: "Homicídio culposo", penaMeses: 40, multa: 25000, fianca: 40000, descricao: "Causar a morte de alguém sem a intenção de matar (negligência/imprudência).", categoria: "Contra a Vida" },
  { artigo: "Art. 121-C", crime: "Homicídio contra agente público", penaMeses: 120, multa: 120000, fianca: "sem_fianca", descricao: "Homicídio praticado contra autoridades no exercício da função.", categoria: "Contra a Vida" },
  { artigo: "Art. 129", crime: "Lesão corporal", penaMeses: 15, multa: 15000, fianca: 40000, descricao: "Ofender a integridade física ou a saúde de outrem.", categoria: "Contra a Vida" },
  { artigo: "Art. 129-A", crime: "Lesão seguida de morte", penaMeses: 40, multa: 20000, fianca: "sem_fianca", descricao: "Lesão corporal que resulta em óbito da vítima.", categoria: "Contra a Vida" },

  // Patrimônio
  { artigo: "Art. 155", crime: "Furto", penaMeses: 25, multa: 10000, fianca: 25000, descricao: "Subtrair coisa alheia móvel para si, sem uso de violência.", categoria: "Patrimônio" },
  { artigo: "Art. 157", crime: "Roubo", penaMeses: 40, multa: 20000, fianca: 40000, descricao: "Subtrair bem alheio mediante grave ameaça ou violência.", categoria: "Patrimônio" },
  { artigo: "Art. 157-A", crime: "Roubo qualificado", penaMeses: 50, multa: 25000, fianca: "sem_fianca", descricao: "Roubo com uso de arma de fogo ou restrição de liberdade.", categoria: "Patrimônio" },
  { artigo: "Art. 157-B", crime: "Latrocínio", penaMeses: 80, multa: 95000, fianca: "sem_fianca", descricao: "Roubo seguido de morte da vítima.", categoria: "Patrimônio" },
  { artigo: "Art. 168", crime: "Apropriação indébita", penaMeses: 20, multa: 12000, fianca: 30000, descricao: "Apropriar-se de bem alheio do qual tem a posse ou detenção.", categoria: "Patrimônio" },
  { artigo: "Art. 171", crime: "Estelionato", penaMeses: 60, multa: 80000, fianca: "sem_fianca", descricao: "Obter vantagem ilícita induzindo alguém ao erro (golpe).", categoria: "Patrimônio" },
  { artigo: "Art. 163", crime: "Dano", penaMeses: 15, multa: 10000, fianca: 20000, descricao: "Destruir, inutilizar ou deteriorar coisa alheia (patrimônio).", categoria: "Patrimônio" },
  { artigo: "Art. 180", crime: "Receptação", penaMeses: 20, multa: 15000, fianca: 30000, descricao: "Adquirir, receber ou ocultar produto de crime.", categoria: "Patrimônio" },

  // Liberdade Pessoal
  { artigo: "Art. 146", crime: "Constrangimento ilegal", penaMeses: 25, multa: 30000, fianca: 40000, descricao: "Constranger alguém, mediante violência ou ameaça, a fazer algo.", categoria: "Liberdade Pessoal" },
  { artigo: "Art. 147", crime: "Ameaça", penaMeses: 10, multa: 15000, fianca: 40000, descricao: "Ameaçar alguém de causar-lhe mal injusto e grave.", categoria: "Liberdade Pessoal" },
  { artigo: "Art. 148", crime: "Sequestro", penaMeses: 60, multa: 30000, fianca: "sem_fianca", descricao: "Privar alguém de sua liberdade (cárcere privado).", categoria: "Liberdade Pessoal" },
  { artigo: "Art. 150", crime: "Violação de domicílio", penaMeses: 20, multa: 15000, fianca: 30000, descricao: "Entrar ou permanecer clandestinamente em casa alheia.", categoria: "Liberdade Pessoal" },

  // Honra
  { artigo: "Art. 138", crime: "Calúnia", penaMeses: 10, multa: 7000, fianca: 7000, descricao: "Imputar falsamente a alguém a autoria de um crime.", categoria: "Honra" },
  { artigo: "Art. 139", crime: "Difamação", penaMeses: 10, multa: 10000, fianca: 7000, descricao: "Imputar fato ofensivo à reputação de alguém.", categoria: "Honra" },
  { artigo: "Art. 140", crime: "Injúria", penaMeses: 10, multa: 10000, fianca: 7000, descricao: "Ofender a dignidade ou o decoro de outrem.", categoria: "Honra" },

  // Fé Pública
  { artigo: "Art. 289", crime: "Moeda falsa", penaMeses: 50, multa: 25000, fianca: 70000, descricao: "Falsificar, fabricar ou portar dinheiro falso.", categoria: "Fé Pública" },
  { artigo: "Art. 298", crime: "Falsificação de documento", penaMeses: 40, multa: 20000, fianca: "sem_fianca", descricao: "Falsificar documento público ou particular.", categoria: "Fé Pública" },
  { artigo: "Art. 299", crime: "Falsidade ideológica", penaMeses: 40, multa: 20000, fianca: "sem_fianca", descricao: "Inserir declaração falsa em documento para alterar a verdade.", categoria: "Fé Pública" },

  // Administração da Justiça
  { artigo: "Art. 339", crime: "Denunciação caluniosa", penaMeses: 40, multa: 20000, fianca: "sem_fianca", descricao: "Dar causa à investigação policial contra inocente.", categoria: "Administração da Justiça" },
  { artigo: "Art. 340", crime: "Comunicação falsa de crime", penaMeses: 20, multa: 15000, fianca: 30000, descricao: "Provocar a ação de autoridade comunicando crime que não ocorreu.", categoria: "Administração da Justiça" },
  { artigo: "Art. 342", crime: "Falso testemunho", penaMeses: 30, multa: 20000, fianca: "sem_fianca", descricao: "Fazer afirmação falsa ou calar a verdade como testemunha.", categoria: "Administração da Justiça" },
  { artigo: "Art. 351", crime: "Fuga de preso", penaMeses: 40, multa: 25000, fianca: "sem_fianca", descricao: "Promover ou facilitar a fuga de pessoa legalmente presa.", categoria: "Administração da Justiça" },
  { artigo: "Art. 355", crime: "Obstrução de justiça", penaMeses: 50, multa: 70000, fianca: "sem_fianca", descricao: "Dificultar investigações ou o andamento de processos judiciais.", categoria: "Administração da Justiça" },

  // Administração Pública
  { artigo: "Art. 312", crime: "Peculato", penaMeses: 50, multa: 40000, fianca: "sem_fianca", descricao: "Apropriação de bem público por funcionário público.", categoria: "Administração Pública" },
  { artigo: "Art. 316", crime: "Concussão", penaMeses: 50, multa: 40000, fianca: "sem_fianca", descricao: "Exigir vantagem indevida em razão da função pública.", categoria: "Administração Pública" },
  { artigo: "Art. 317", crime: "Corrupção passiva", penaMeses: 70, multa: 200000, fianca: "sem_fianca", descricao: "Solicitar ou receber vantagem indevida (funcionário público).", categoria: "Administração Pública" },
  { artigo: "Art. 333", crime: "Corrupção ativa", penaMeses: 40, multa: 50000, fianca: "sem_fianca", descricao: "Oferecer vantagem indevida a funcionário público.", categoria: "Administração Pública" },
  { artigo: "Art. 319", crime: "Prevaricação", penaMeses: 40, multa: 70000, fianca: "sem_fianca", descricao: "Retardar ou deixar de praticar ato de ofício por interesse pessoal.", categoria: "Administração Pública" },
  { artigo: "Art. 330", crime: "Desobediência", penaMeses: 20, multa: 10000, fianca: 20000, descricao: "Desobedecer a ordem legal de funcionário público.", categoria: "Administração Pública" },
  { artigo: "Art. 331", crime: "Desacato", penaMeses: 30, multa: 20000, fianca: 30000, descricao: "Desacatar funcionário público no exercício da função.", categoria: "Administração Pública" },
  { artigo: "Art. 329", crime: "Resistência", penaMeses: 20, multa: 20000, fianca: 20000, descricao: "Opor-se à execução de ato legal mediante violência ou ameaça.", categoria: "Administração Pública" },
  { artigo: "Art. 307", crime: "Passar-se por funcionário", penaMeses: 50, multa: 40000, fianca: 80000, descricao: "Atribuir-se falsa identidade pública para obter vantagem.", categoria: "Administração Pública" },
  { artigo: "Art. 400", crime: "Uso de equipamento policial", penaMeses: 40, multa: 30000, fianca: "sem_fianca", descricao: "Posse ou uso não autorizado de viaturas/equipamentos táticos.", categoria: "Administração Pública" },
  { artigo: "Art. 401", crime: "Posse de dinheiro ilícito (< 75k)", penaMeses: 30, multa: 25000, fianca: 30000, descricao: "Portar consigo até R$ 75.000,00 em dinheiro sujo.", categoria: "Administração Pública" },
  { artigo: "Art. 402", crime: "Posse de ferramentas ilícitas (<10)", penaMeses: 20, multa: 15000, fianca: 30000, descricao: "Portar ATÉ 10 unidades de: algema, lockpick, bolsa de droga, capuz, placa clonada, ticket de corrida ilegal, chave mixa, explosivos C4, bloqueador de sinal, cartão hacking.", categoria: "Administração Pública" },

  // Armas e Tráfico
  { artigo: "Art. 12", crime: "Posse ilegal de arma de fogo", penaMeses: 25, multa: 25000, fianca: 50000, descricao: "Manter sob guarda arma de fogo de uso permitido ilegalmente.", categoria: "Armas e Tráfico" },
  { artigo: "Art. 14", crime: "Porte ilegal de arma de fogo", penaMeses: 40, multa: 50000, fianca: 100000, descricao: "Portar, deter ou transportar arma de fogo ilegalmente.", categoria: "Armas e Tráfico" },
  { artigo: "Art. 15", crime: "Disparo de arma", penaMeses: 40, multa: 30000, fianca: 50000, descricao: "Disparar arma de fogo em via pública ou adjacências.", categoria: "Armas e Tráfico" },
  { artigo: "Art. 16", crime: "Porte restrito", penaMeses: 90, multa: 100000, fianca: "sem_fianca", descricao: "Portar armamento de uso restrito das forças de segurança.", categoria: "Armas e Tráfico" },
  { artigo: "Art. 402-A", crime: "Tráfico de ferramentas ilícitas (>10)", penaMeses: 60, multa: 25000, fianca: "sem_fianca", descricao: "Portar mais de 10 unidades de algema, lockpick, bolsa de droga, capuz, placa clonada, ticket de corrida ilegal, chave mixa, explosivos C4, bloqueador de sinal, cartão hacking.", categoria: "Armas e Tráfico" },
  { artigo: "Art. 17", crime: "Tráfico de armas (>2 un)", penaMeses: 70, multa: 50000, fianca: "sem_fianca", descricao: "Comerciar, fabricar, fornecer ou portar mais de 2 armamentos ilegalmente.", categoria: "Armas e Tráfico" },
  { artigo: "Art. 18", crime: "Tráfico de munição (>50 un)", penaMeses: 70, multa: 35000, fianca: "sem_fianca", descricao: "Comerciar, fabricar, fornecer ou portar mais de 50 munições ilegalmente.", categoria: "Armas e Tráfico" },
  { artigo: "Art. 33", crime: "Tráfico de drogas (>10 un)", penaMeses: 60, multa: 25000, fianca: "sem_fianca", descricao: "Vender, guardar, transportar ou portar mais de 10 substâncias entorpecentes.", categoria: "Armas e Tráfico" },
  { artigo: "Art. 35", crime: "Associação criminosa", penaMeses: 60, multa: 40000, fianca: "sem_fianca", descricao: "Associarem-se três ou mais pessoas para o fim de cometer crimes.", categoria: "Armas e Tráfico" },
  { artigo: "Lei 9.613", crime: "Lavagem de dinheiro (> 75k)", penaMeses: 80, multa: 50000, fianca: "sem_fianca", descricao: "Portar consigo quantia maior que R$ 75.001,00 em dinheiro sujo.", categoria: "Armas e Tráfico" },
  { artigo: "Lei 13.260", crime: "Terrorismo", penaMeses: 150, multa: 300000, fianca: "sem_fianca", descricao: "Atos de terror generalizados para provocar pânico ou intimidação do Estado (sequestro de funcionários públicos, invasão armada a instituições, sabotar serviços essenciais, fazer reféns em massa, financiamento de organizações terroristas).", categoria: "Armas e Tráfico" },

  // Crimes Financeiros
  { artigo: "Art. 201-A", crime: "Crime financeiro", penaMeses: 40, multa: 30000, fianca: "sem_fianca", descricao: "Fraudes ou crimes contra a ordem tributária e econômica.", categoria: "Crimes Financeiros" },
  { artigo: "Art. 201-B", crime: "Crime financeiro grave", penaMeses: 50, multa: 40000, fianca: "sem_fianca", descricao: "Crimes financeiros de alta gravidade e impacto no erário.", categoria: "Crimes Financeiros" },
  { artigo: "Art. 201-C", crime: "Crime financeiro leve", penaMeses: 20, multa: 15000, fianca: 30000, descricao: "Crimes financeiros de menor potencial ofensivo.", categoria: "Crimes Financeiros" },

  // Receita Federal
  { artigo: "RF N2", crime: "Multa Receita Federal (N2)", penaMeses: 0, multa: 200000, fianca: null, descricao: "Autuação fiscal (Nível 2) por irregularidade junto à RF.", categoria: "Receita Federal" },
  { artigo: "RF N3", crime: "Multa Receita Federal (N3)", penaMeses: 0, multa: 400000, fianca: null, descricao: "Autuação fiscal (Nível 3) por irregularidade junto à RF.", categoria: "Receita Federal" },
  { artigo: "RF N4", crime: "Multa Receita Federal (N4)", penaMeses: 0, multa: 500000, fianca: null, descricao: "Autuação fiscal (Nível 4) por irregularidade junto à RF.", categoria: "Receita Federal" },
  { artigo: "RF N5", crime: "Multa Receita Federal (N5)", penaMeses: 0, multa: 700000, fianca: null, descricao: "Autuação fiscal (Nível 5) por irregularidade junto à RF.", categoria: "Receita Federal" },
  { artigo: "RF N6", crime: "Multa Receita Federal (N6)", penaMeses: 0, multa: 900000, fianca: null, descricao: "Autuação fiscal (Nível 6) por irregularidade junto à RF.", categoria: "Receita Federal" },
  { artigo: "RF N7", crime: "Multa Receita Federal (N7)", penaMeses: 0, multa: 1000000, fianca: null, descricao: "Autuação fiscal (Nível 7) por irregularidade junto à RF.", categoria: "Receita Federal" },
  { artigo: "RF N8", crime: "Multa Receita Federal (N8)", penaMeses: 0, multa: 2000000, fianca: null, descricao: "Autuação fiscal (Nível 8) por irregularidade junto à RF.", categoria: "Receita Federal" },
  { artigo: "RF N9", crime: "Multa Receita Federal (N9)", penaMeses: 0, multa: 3000000, fianca: null, descricao: "Autuação fiscal (Nível 9) por irregularidade junto à RF.", categoria: "Receita Federal" },
  { artigo: "RF N10", crime: "Multa Receita Federal (N10)", penaMeses: 0, multa: 4000000, fianca: null, descricao: "Autuação fiscal (Nível 10) por irregularidade junto à RF.", categoria: "Receita Federal" },
  { artigo: "RF N11", crime: "Multa Receita Federal (N11)", penaMeses: 0, multa: 5000000, fianca: null, descricao: "Autuação fiscal (Nível 11) por irregularidade junto à RF.", categoria: "Receita Federal" },
  { artigo: "RF N12", crime: "Multa Receita Federal (N12)", penaMeses: 0, multa: 6000000, fianca: null, descricao: "Autuação fiscal (Nível 12) por irregularidade junto à RF.", categoria: "Receita Federal" },
  { artigo: "RF N13", crime: "Multa Receita Federal (N13)", penaMeses: 0, multa: 7000000, fianca: null, descricao: "Autuação fiscal (Nível 13) por irregularidade junto à RF.", categoria: "Receita Federal" },
  { artigo: "RF N14", crime: "Multa Receita Federal (N14)", penaMeses: 0, multa: 8000000, fianca: null, descricao: "Autuação fiscal (Nível 14) por irregularidade junto à RF.", categoria: "Receita Federal" },
  { artigo: "RF N15", crime: "Multa Receita Federal (N15)", penaMeses: 0, multa: 9000000, fianca: null, descricao: "Autuação fiscal (Nível 15) por irregularidade junto à RF.", categoria: "Receita Federal" },

  // ANAC
  { artigo: "ANAC", crime: "Operação irregular", penaMeses: 0, multa: 70000, fianca: null, descricao: "Operar aeronave em desacordo com as normativas aéreas.", categoria: "ANAC" },
  { artigo: "ANAC", crime: "Plano de voo ausente", penaMeses: 0, multa: 75000, fianca: null, descricao: "Decolar aeronave sem aprovação prévia do plano de voo.", categoria: "ANAC" },
  { artigo: "ANAC", crime: "Condições inseguras", penaMeses: 0, multa: 100000, fianca: null, descricao: "Voar colocando em risco a vida dos passageiros ou tripulação.", categoria: "ANAC" },
  { artigo: "ANAC", crime: "Aeronave irregular", penaMeses: 0, multa: 115000, fianca: null, descricao: "Aeronave operando sem manutenção ou documentação em dia.", categoria: "ANAC" },
  { artigo: "ANAC", crime: "Transporte irregular", penaMeses: 0, multa: 110000, fianca: null, descricao: "Transporte de cargas ou pessoas sem devida autorização.", categoria: "ANAC" },
  { artigo: "ANAC", crime: "Manobra proibida", penaMeses: 0, multa: 120000, fianca: null, descricao: "Realizar acrobacias ou voos perigosos em área restrita.", categoria: "ANAC" },
  { artigo: "ANAC", crime: "Voo rasteiro perigoso", penaMeses: 0, multa: 130000, fianca: null, descricao: "Voar abaixo da altitude mínima de segurança permitida.", categoria: "ANAC" },
  { artigo: "ANAC", crime: "Desobediência aérea", penaMeses: 0, multa: 140000, fianca: null, descricao: "Ignorar ordens diretas da torre de controle ou interceptação.", categoria: "ANAC" },
  { artigo: "ANAC", crime: "Uso ilícito de aeronave", penaMeses: 0, multa: 150000, fianca: null, descricao: "Utilizar a aeronave para cometimento ou fuga de crimes.", categoria: "ANAC" },

  // Ajustes
  { artigo: "Ajuste", crime: "Majorar pena", penaMeses: 100, multa: 0, fianca: "sem_fianca", descricao: "Ajuste processual para aumento do tempo de reclusão.", categoria: "Ajustes Processuais" },
  { artigo: "Ajuste", crime: "Majorar multa", penaMeses: 0, multa: 100000, fianca: null, descricao: "Ajuste processual para acréscimo no valor de multas.", categoria: "Ajustes Processuais" },
];

export const CATEGORIAS_PENAL = Array.from(new Set(CODIGO_PENAL.map((a) => a.categoria)));

export function formatBRL(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}

export function formatFianca(f: ArtigoPenal["fianca"]): string {
  if (f === "sem_fianca") return "Sem fiança";
  if (f === null || f === 0) return "N/A";
  return formatBRL(f);
}

export function formatPena(meses: number): string {
  if (meses === 0) return "—";
  return `${meses} meses`;
}
