# 📋 API do Ministério Público — Documentação v2.1

## Visão Geral

API RESTful para integração de órgãos externos (Polícia Civil, Polícia Federal, Receita, etc.) com o sistema do Ministério Público. Permite envio de inquéritos, denúncias e comunicações, além de acompanhamento de andamento processual e atualização de diligências requisitadas.

**Base URL:**
```
https://xmijvtkexbdduvwgwpsk.supabase.co/functions/v1/api-mp
```

---

## 🔑 Autenticação

Todas as requisições devem incluir o header `X-API-Key` com uma chave válida cadastrada no sistema.

```
X-API-Key: sua-chave-api-aqui
```

| Código | Descrição |
|--------|-----------|
| `401` | Header `X-API-Key` ausente |
| `403` | API Key inválida ou inativa |

---

## 📌 Endpoints

### 1. `POST /enviar-inquerito`
Envia um inquérito policial ao MP. Cria automaticamente um registro de inquérito no sistema com envolvidos e links inclusos na descrição.

**Body (JSON):**
```json
{
  "titulo": "Inquérito sobre furto qualificado",
  "conteudo": "Descrição detalhada dos fatos apurados...",
  "numero_referencia": "IP-2026/001234",
  "envolvidos": [
    {
      "nome": "João da Silva",
      "id_personagem": "12345",
      "tipo": "investigado",
      "qualificacao": "Suspeito principal",
      "observacoes": "Possui antecedentes"
    },
    {
      "nome": "Maria Santos",
      "tipo": "vitima"
    }
  ],
  "links": [
    "https://exemplo.com/documento-anexo.pdf"
  ]
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:-----------:|-----------|
| `titulo` | string | ✅ | Título do inquérito |
| `conteudo` | string | ✅ | Descrição completa dos fatos |
| `numero_referencia` | string | ❌ | Número de referência no sistema de origem |
| `envolvidos` | array | ❌ | Lista de pessoas envolvidas (inseridas também na tabela de envolvidos do inquérito) |
| `envolvidos[].nome` | string | ✅* | Nome do envolvido |
| `envolvidos[].id_personagem` | string | ❌ | ID do personagem no sistema |
| `envolvidos[].tipo` | string | ❌ | `investigado`, `vitima`, `testemunha` (padrão: `investigado`) |
| `envolvidos[].qualificacao` | string | ❌ | Qualificação jurídica |
| `envolvidos[].observacoes` | string | ❌ | Observações adicionais |
| `links` | array | ❌ | URLs de documentos anexos (inclusos na descrição do inquérito) |

**Resposta de sucesso (200):**
```json
{
  "sucesso": true,
  "mensagem": "Inquérito enviado ao MP com sucesso e registrado no sistema",
  "id": "uuid-da-comunicacao",
  "inquerito_id": "uuid-do-inquerito",
  "inquerito_numero": "IP-0001/2026",
  "criado_em": "2026-03-26T10:00:00.000Z"
}
```

> **Comportamento:** O sistema cria um inquérito com status `remetido_mp`, insere todos os envolvidos na tabela `envolvidos_inquerito` e registra uma comunicação externa vinculada.

---

### 2. `POST /enviar-denuncia`
Envia uma denúncia ao MP. Cria automaticamente um inquérito vinculado com prefixo `[DENÚNCIA]` na descrição.

**Body (JSON):** Mesmo formato de `/enviar-inquerito`.

**Resposta de sucesso (200):**
```json
{
  "sucesso": true,
  "mensagem": "Denúncia enviada ao MP com sucesso e inquérito instaurado",
  "id": "uuid-da-comunicacao",
  "inquerito_id": "uuid-do-inquerito",
  "inquerito_numero": "IP-0002/2026",
  "criado_em": "2026-03-26T10:00:00.000Z"
}
```

---

### 3. `POST /enviar-comunicacao`
Envia uma comunicação genérica ao MP. Funciona como um **chat** — pode ser vinculada a um inquérito existente ou ser uma resposta a outra comunicação.

**Body (JSON):**
```json
{
  "titulo": "Complemento de informações",
  "conteudo": "Segue complemento solicitado...",
  "envolvidos": [],
  "links": [],
  "numero_referencia": "OF-2026/5678",
  "resposta_a": "uuid-da-comunicacao-original",
  "inquerito_id": "uuid-do-inquerito"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:-----------:|-----------|
| `titulo` | string | ✅ | Título da comunicação |
| `conteudo` | string | ✅ | Conteúdo da comunicação |
| `envolvidos` | array | ❌ | Lista de envolvidos |
| `links` | array | ❌ | URLs de documentos |
| `numero_referencia` | string | ❌ | Referência no sistema de origem |
| `resposta_a` | string (UUID) | ❌ | ID de comunicação sendo respondida |
| `inquerito_id` | string (UUID) | ❌ | ID do inquérito vinculado |

> **Nota:** Se `resposta_a` for informado e `inquerito_id` não, o sistema tenta vincular automaticamente ao inquérito da comunicação original. As comunicações enviadas via este endpoint aparecem na aba de **comunicações/chat** do inquérito no sistema do MP.

**Resposta de sucesso (200):**
```json
{
  "sucesso": true,
  "mensagem": "Comunicação enviada ao MP com sucesso",
  "id": "uuid-da-comunicacao",
  "inquerito_id": "uuid-do-inquerito-ou-null",
  "criado_em": "2026-03-26T10:00:00.000Z"
}
```

---

### 4. `GET /comunicacoes`
Lista comunicações enviadas pelo MP para o seu órgão (direção: `saida`).

**Query Parameters:**
| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `status` | string | — | Filtrar por status (`pendente`, `lido`, `respondido`) |
| `desde` | string (ISO 8601) | — | Filtrar a partir de uma data |
| `limite` | number | `50` | Quantidade por página |
| `pagina` | number | `1` | Número da página |

**Exemplo:**
```
GET /comunicacoes?status=pendente&limite=10&pagina=1
```

**Resposta (200):**
```json
{
  "comunicacoes": [
    {
      "id": "uuid",
      "tipo": "comunicacao",
      "direcao": "saida",
      "titulo": "Requisição de diligência",
      "conteudo": "Solicita-se a realização de...",
      "envolvidos": [],
      "links": [],
      "numero_referencia": null,
      "status": "pendente",
      "resposta_a": null,
      "inquerito_id": "uuid-do-inquerito",
      "created_at": "2026-03-26T10:00:00.000Z",
      "updated_at": "2026-03-26T10:00:00.000Z"
    }
  ],
  "total": 1,
  "pagina": 1,
  "limite": 10
}
```

---

### 5. `GET /comunicacoes/:id`
Busca uma comunicação específica pelo ID (somente comunicações pertencentes ao seu órgão).

**Resposta (200):** Objeto completo da comunicação com todos os campos.

**Resposta (404):**
```json
{ "error": "Comunicação não encontrada" }
```

---

### 6. `GET /meus-inqueritos`
Lista inquéritos enviados pelo seu órgão (via inquérito ou denúncia).

**Query Parameters:**
| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `limite` | number | `50` | Quantidade por página |
| `pagina` | number | `1` | Número da página |

**Resposta (200):**
```json
{
  "inqueritos": [
    {
      "id": "uuid",
      "numero": "IP-0001/2026",
      "tipo": "criminal",
      "descricao": "[POLICIA_CIVIL] Inquérito sobre furto...",
      "status": "remetido_mp",
      "remetido_mp": true,
      "data_instauracao": "2026-03-26T10:00:00.000Z",
      "data_conclusao": null,
      "created_at": "2026-03-26T10:00:00.000Z",
      "updated_at": "2026-03-26T10:00:00.000Z"
    }
  ],
  "total": 1,
  "pagina": 1,
  "limite": 50
}
```

**Status possíveis do inquérito:**
| Status | Descrição |
|--------|-----------|
| `remetido_mp` | Inquérito recebido pelo MP |
| `em_andamento` | Sob análise do MP |
| `diligencias_pendentes` | Aguardando cumprimento de diligências |
| `concluido` | Inquérito concluído |
| `arquivado` | Inquérito arquivado |
| `denuncia_oferecida` | MP ofereceu denúncia (processo criminal instaurado) |

---

### 7. `GET /inquerito/:id`
Acompanha o andamento completo de um inquérito específico. Retorna todas as informações relacionadas: envolvidos, diligências, requisições do MP, comunicações (chat), denúncias e arquivamentos.

**Resposta (200):**
```json
{
  "inquerito": {
    "id": "uuid",
    "numero": "IP-0001/2026",
    "tipo": "criminal",
    "descricao": "[POLICIA_CIVIL] Inquérito sobre furto...",
    "status": "em_andamento",
    "remetido_mp": true,
    "data_instauracao": "2026-03-26T10:00:00.000Z",
    "data_conclusao": null,
    "relatorio_final": "Descrição dos fatos...",
    "created_at": "...",
    "updated_at": "..."
  },
  "envolvidos": [
    {
      "nome": "João da Silva",
      "tipo": "investigado",
      "id_personagem": "12345",
      "qualificacao": "Suspeito principal",
      "observacoes": null
    }
  ],
  "diligencias": [
    {
      "tipo": "oitiva",
      "descricao": "Oitiva do investigado",
      "status": "pendente",
      "resultado": null,
      "created_at": "..."
    }
  ],
  "requisicoes_mp": [
    {
      "descricao": "Solicita-se perícia no local",
      "prazo_dias": 48,
      "status": "pendente",
      "resposta": null,
      "created_at": "..."
    }
  ],
  "comunicacoes": [
    {
      "id": "uuid",
      "tipo": "comunicacao",
      "direcao": "saida",
      "titulo": "Requisição",
      "conteudo": "...",
      "status": "pendente",
      "created_at": "..."
    }
  ],
  "denuncias": [
    {
      "numero_protocolo": "DEN-0001/2026",
      "resumo": "Denúncia por furto qualificado",
      "tipificacao": "Art. 155, §4º, CP",
      "status": "oferecida",
      "processo_id": "uuid-do-processo",
      "created_at": "..."
    }
  ],
  "arquivamentos": [
    {
      "justificativa": "...",
      "status": "aprovado",
      "created_at": "..."
    }
  ]
}
```

> **Nota:** `prazo_dias` nas requisições está em **horas**, não em dias.

**Resposta (404):**
```json
{ "error": "Inquérito não encontrado ou não pertence a este órgão" }
```

---

### 8. `PUT /marcar-lido/:id`
Marca uma comunicação de saída (enviada pelo MP) como lida. Atualiza o status para `lido` e registra o horário da leitura.

**Resposta (200):**
```json
{ "sucesso": true, "mensagem": "Marcado como lido" }
```

**Resposta (404):**
```json
{ "error": "Comunicação não encontrada" }
```

---

### 9. `PUT /atualizar-diligencia/:id`
Atualiza o status e/ou resultado de uma requisição de diligência feita pelo MP ao órgão externo. Se `resultado` for informado, atualiza também a diligência vinculada mais recente.

**Body (JSON):**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `status` | string | Não* | Novo status (`pendente`, `em_andamento`, `cumprida`, `nao_cumprida`) |
| `resposta` | string | Não* | Resposta/relatório da diligência |
| `resultado` | string | Não | Resultado detalhado (atualiza também a diligência vinculada mais recente) |

> *Ao menos um dos campos (`status`, `resposta` ou `resultado`) deve ser informado.

**Resposta (200):**
```json
{ "sucesso": true, "mensagem": "Diligência atualizada com sucesso" }
```

**Resposta (403):**
```json
{ "error": "Requisição não pertence a um inquérito deste órgão" }
```

**Resposta (404):**
```json
{ "error": "Requisição de diligência não encontrada" }
```

---

### 10. `GET /status`
Verifica o status da API e informações do órgão autenticado.

**Resposta (200):**
```json
{
  "status": "online",
  "orgao": "policia_civil",
  "sistema": "Delegacia Virtual",
  "versao_api": "2.1.0"
}
```

---

## ⚠️ Erros Comuns

| Código | Corpo | Causa |
|--------|-------|-------|
| `400` | `{ "error": "titulo e conteudo são obrigatórios" }` | Campos obrigatórios ausentes |
| `400` | `{ "error": "Informe ao menos status, resposta ou resultado" }` | Nenhum campo informado na atualização de diligência |
| `401` | `{ "error": "Header X-API-Key é obrigatório" }` | Header de autenticação ausente |
| `403` | `{ "error": "API Key inválida ou inativa" }` | Chave inválida ou desativada |
| `403` | `{ "error": "Requisição não pertence a um inquérito deste órgão" }` | Tentativa de atualizar diligência de outro órgão |
| `404` | `{ "error": "Rota não encontrada." }` | Endpoint inexistente (retorna lista de rotas disponíveis) |
| `404` | `{ "error": "Comunicação não encontrada" }` | ID não encontrado ou não pertence ao órgão |
| `404` | `{ "error": "Inquérito não encontrado ou não pertence a este órgão" }` | Inquérito inexistente ou de outro órgão |
| `404` | `{ "error": "Requisição de diligência não encontrada" }` | ID de requisição inexistente |
| `500` | `{ "error": "Erro interno do servidor", "detalhes": "..." }` | Erro inesperado |

---

## 🔄 Fluxo Típico de Integração

```
1. Órgão envia inquérito ──────► POST /enviar-inquerito
2. Órgão acompanha status ─────► GET /meus-inqueritos
3. Órgão consulta detalhes ─────► GET /inquerito/:id
4. MP envia requisições ────────► (visível em GET /comunicacoes e GET /inquerito/:id)
5. Órgão lê comunicação ───────► PUT /marcar-lido/:id
6. Órgão responde (chat) ──────► POST /enviar-comunicacao (com resposta_a e/ou inquerito_id)
7. Órgão atualiza diligência ──► PUT /atualizar-diligencia/:id
8. MP oferece denúncia ─────────► (visível em GET /inquerito/:id → denuncias)
9. MP arquiva ──────────────────► (visível em GET /inquerito/:id → arquivamentos)
```

---

## 📝 Exemplo Completo (cURL)

```bash
# 1. Verificar status
curl -X GET \
  "https://xmijvtkexbdduvwgwpsk.supabase.co/functions/v1/api-mp/status" \
  -H "X-API-Key: sua-chave-aqui"

# 2. Enviar inquérito com envolvidos e links
curl -X POST \
  "https://xmijvtkexbdduvwgwpsk.supabase.co/functions/v1/api-mp/enviar-inquerito" \
  -H "X-API-Key: sua-chave-aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "IP - Furto Qualificado",
    "conteudo": "No dia 25/03/2026, às 14h, na Rua Principal...",
    "numero_referencia": "IP-2026/001234",
    "envolvidos": [
      { "nome": "João da Silva", "id_personagem": "12345", "tipo": "investigado", "qualificacao": "Suspeito principal" },
      { "nome": "Maria Santos", "tipo": "vitima" }
    ],
    "links": [
      "https://exemplo.com/boletim.pdf",
      "https://exemplo.com/laudo-pericial.pdf"
    ]
  }'

# 3. Listar comunicações do MP (chat)
curl -X GET \
  "https://xmijvtkexbdduvwgwpsk.supabase.co/functions/v1/api-mp/comunicacoes?status=pendente" \
  -H "X-API-Key: sua-chave-aqui"

# 4. Acompanhar inquérito (com envolvidos, diligências, comunicações, denúncias e arquivamentos)
curl -X GET \
  "https://xmijvtkexbdduvwgwpsk.supabase.co/functions/v1/api-mp/inquerito/UUID_DO_INQUERITO" \
  -H "X-API-Key: sua-chave-aqui"

# 5. Marcar comunicação como lida
curl -X PUT \
  "https://xmijvtkexbdduvwgwpsk.supabase.co/functions/v1/api-mp/marcar-lido/UUID_DA_COMUNICACAO" \
  -H "X-API-Key: sua-chave-aqui"

# 6. Responder comunicação (chat bidirecional)
curl -X POST \
  "https://xmijvtkexbdduvwgwpsk.supabase.co/functions/v1/api-mp/enviar-comunicacao" \
  -H "X-API-Key: sua-chave-aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Resposta à requisição",
    "conteudo": "Segue o relatório solicitado...",
    "resposta_a": "UUID_DA_COMUNICACAO_ORIGINAL",
    "inquerito_id": "UUID_DO_INQUERITO",
    "links": ["https://exemplo.com/relatorio.pdf"]
  }'

# 7. Atualizar status de diligência requisitada pelo MP
curl -X PUT \
  "https://xmijvtkexbdduvwgwpsk.supabase.co/functions/v1/api-mp/atualizar-diligencia/UUID_DA_REQUISICAO" \
  -H "X-API-Key: sua-chave-aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "cumprida",
    "resposta": "Diligência realizada com sucesso. Evidências coletadas.",
    "resultado": "Foram encontrados vestígios no local indicado."
  }'
```

---

## 🏷️ Versão

**API v2.1.0** — Sistema Judiciário v2.8.0
