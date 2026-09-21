# Envio em massa de DMs no Discord por cargo

## Objetivo

Permitir que administradores disparem uma mensagem direta no Discord, de forma individual, para todos os integrantes de um ou mais cargos do servidor do Discord (ID 1483576897995804897), com pré-visualização dos destinatários e confirmação antes do envio real.

O painel fica em **Estatísticas**, logo abaixo do card "Teste de DM Discord", visível apenas para administradores.

## Como vai funcionar

```text
Estatísticas (admin)
   |
   +-- novo card "Envio em massa no Discord"
          |
          |  1. carrega cargos do servidor
          |  2. pré-visualiza destinatários
          |  3. confirma e envia
          v
   Edge Function  discord-broadcast  (só admin)
          |
          |  lista membros do servidor  ->  filtra pelos cargos escolhidos
          v
   API do Discord: DM individual para cada pessoa
```

## Passos

### 1. Nova função `discord-broadcast`

Arquivo `supabase/functions/discord-broadcast/index.ts`, com três ações no mesmo corpo de requisição:

- **`roles`** — lista os cargos do servidor (ID, nome, cor) para montar o seletor.
- **`preview`** — resolve quem receberia a mensagem e devolve a contagem, uma amostra de nomes e quantos foram excluídos (sem cadastro, DM desativada, bots). Nada é enviado.
- **`send`** — envia as DMs de fato e devolve o resumo: enviados, falhas com motivo e pulados.

Regras da função:

- **Somente administradores**: valida o token de quem chama (`getClaims`) e confirma o cargo `admin` pela função `has_role` do banco, igual à função de exclusão de usuários. Sem isso responde 401/403.
- **Servidor**: lido do secret `DISCORD_GUILD_ID`, com valor padrão `1483576897995804897` no código.
- **Membros**: consulta `GET /guilds/{id}/members` com paginação (servidores com mais de 1000 integrantes), sem duplicar quem tem mais de um cargo selecionado, ignorando bots.
- **Respeito à configuração de perfil**: quem tem "Receber DMs" desativado no perfil é excluído; quem não tem cadastro no sistema é contado separadamente e só recebe se a opção "incluir não cadastrados" estiver marcada.
- **Ritmo seguro**: envio sequencial com pequena pausa, tratando bloqueio de tempo do Discord (espera o tempo indicado e tenta de novo uma vez). Se o tempo limite da função se aproximar, devolve o que já foi enviado e quantos faltam, para reexecutar.
- **Formato da mensagem**: mesmo padrão das notificações atuais (título, categoria, corpo, link clicável apontando para "meus processos").

### 2. Reaproveitar o gerador de mensagens

O montagem do convite de DM (limpeza de HTML, embutido formatado, abertura do canal privado e envio) sai de `discord-notify` para um arquivo compartilhado `supabase/functions/_shared/discord.ts`, usado pelas duas funções. Assim o envio em massa e as notificações automáticas continuam com exatamente o mesmo visual, sem duplicar código. O comportamento do `discord-notify` não muda.

### 3. Painel em Estatísticas

Novo arquivo `src/components/admin/EnvioMassaDiscord.tsx`, montado em `EstatisticasSection.tsx` logo abaixo do `<TesteDiscordDM />`, dentro do mesmo bloco que já é restrito a administradores.

Conteúdo do card:

- Lista de cargos do servidor com caixas de seleção (busca por nome).
- Campo "Somente quem tem cadastro no sistema" (liga/desliga).
- Campos Título, Mensagem, Categoria e "Link da seção" (mesmos formatos do teste atual, com a mesma explicação de uso).
- Botão **"Pré-visualizar destinatários"**: mostra quantas pessoas serão alcançadas, uma amostra dos nomes e os avisos de quem ficou de fora.
- Botão **"Enviar para N pessoas"**: abre a caixa de confirmação; durante o envio barra de progresso; ao final, resumo com enviados, falhas (com motivo) e opção de reenviar só para quem falhou.

Tudo é chamado por `supabase.functions.invoke("discord-broadcast", ...)`, então o login de quem está na tela já é enviado junto e a checagem de admin acontece no servidor.

### 4. Configuração

- Adicionar o secret `DISCORD_GUILD_ID` com o valor `1483576897995804897`.
- Nenhuma alteração no banco de dados (nenhuma tabela nova, nenhuma política nova). O envio é só no Discord e não cria itens no sino de notificações.

### 5. Passo manual no Discord (necessário uma vez)

No **Portal do Desenvolvedor do Discord** → sua aplicação → **Bot** → **Privileged Gateway Intents**, ativar **"Server Members Intent"** e salvar. Sem isso o Discord bloqueia a listagem de membros e o painel mostrará um aviso explicando o que ativar.

### 6. Verificação

- Testar `roles` e `preview` contra o servidor real e conferir a contagem de destinatários.
- Enviar para um cargo pequeno e conferir a chegada da DM e o resumo exibido.
- Disparar um DM de teste avulso pelo card atual para confirmar que o compartilhamento do gerador de mensagens não quebrou as notificações automáticas.
- Conferir os registros da função no painel do backend.

## Detalhes técnicos

- **Bloqueio de tempo do Discord**: cada envio espera `retry_after` em caso de 429; pausa de ~300 ms entre destinatários para não disparar limite global.
- **Servidores grandes**: a listagem de membros vem em blocos de 1000; a paginação segue até esgotar.
- **Alcance**: o bot só consegue escrever no privado de quem compartilha um servidor com ele — os integrantes do servidor 1483576897995804897 atendem a isso.
- **Limites de texto**: título até 250 caracteres, corpo do recado até ~3800, com link absoluto `https://secdajustica.lovable.app/?section=meus-processos...`.
- **Segurança**: a restrição a administradores é feita no servidor (cargo `admin` no banco), nunca apenas na tela.
- **Reexecução**: o resumo do envio traz a lista de pendentes/falhas, permitindo reenviar sem atingir duas vezes quem já recebeu.
