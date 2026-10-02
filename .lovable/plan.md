# Outorga de cargos por liderança institucional

Cada cargo de liderança pode dar e tirar, de qualquer usuário, os cargos da própria instituição. Ninguém mexe nos próprios cargos. O administrador continua podendo tudo. Cada nomeação e remoção fica no histórico de cargos.

## Quem nomeia quem (proposta)

| Quem nomeia | Cargos que pode dar/tirar |
|---|---|
| Presidente do Tribunal | Desembargador, Juiz de Direito, Oficial de Justiça, Analista |
| Desembargador | Juiz de Direito, Analista |
| Juiz de Direito | Analista |
| Procurador-Geral | Promotor de Justiça, Analista |
| Promotor de Justiça | Analista |
| Chefe GAECO | GAECO, Analista |
| Defensor(a) Público(a)-Geral | Defensor(a) Público(a), Analista |
| Defensor(a) Público(a) | Analista |
| Procurador Geral do Estado | Analista |
| Presidente da OAB | Advogado, Bacharel em Direito |
| Delegado(a) | Delegado, Polícia Civil, Polícia Federal, Investigador(a), Analista |
| Corregedor(a) + instituição | Cargo da própria instituição e Corregedor (como hoje) |

Regras extras:
- Ao nomear um Analista, quem nomeia passa a ser automaticamente o superior vinculado dele (aparece em Aprovações). Só pode tirar o cargo de Analista quem tem o mesmo cargo de liderança.
- Cargos sensíveis (Administrador, Presidente do Tribunal, Procurador-Geral, Presidente da OAB, Defensor-Geral, Chefe GAECO, Corregedor fora da regra atual) continuam só com o administrador.

## Onde aparece

Na página "Usuários", cada líder passa a ver todos os usuários, com a caixa "+ Dar cargo" listando apenas os cargos que ele pode outorgar e o "×" só nos cargos que ele pode retirar. O item "Usuários" no menu passa a aparecer para todos esses cargos de liderança.

## Detalhes técnicos

- Uma tabela de regras única (quem pode outorgar qual cargo) no banco, usada por novas funções genéricas `outorgar_cargo` / `retirar_cargo` (security definer, validam regra, bloqueiam o próprio usuário, gravam `cargo_historico`, criam `analista_vinculos` ao nomear analista). As funções atuais de delegado/corregedor passam a delegar para elas.
- No frontend, `UsuariosSection` busca as regras e calcula `assignableFor` / `canRemoveRole` a partir delas, em vez das listas fixas atuais; `DashboardLayout` libera o menu para os líderes.
