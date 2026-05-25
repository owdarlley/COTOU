# COTOU — API REST de Cotação de Peças Automotivas

Sistema interno para comunicação entre o setor de **Vendas** e o setor de **Compras** de uma autopeças. O vendedor abre uma cotação, o comprador recebe alerta em tempo real via Socket.io, cota os valores e o vendedor envia o resultado ao cliente via WhatsApp.

Esta é uma API REST pura — todas as respostas são JSON. O frontend (SPA ou mobile) é um projeto separado.

---

## Stack Técnica

| Tecnologia | Versão | Uso |
|---|---|---|
| Node.js | 22+ | Runtime |
| Express | 4.x | Framework HTTP |
| SQLite (node:sqlite) | built-in | Banco de dados |
| Socket.io | 4.x | Notificações em tempo real |
| express-session + memorystore | — | Autenticação por sessão |
| bcryptjs | — | Hash de senhas |
| cors | — | CORS para SPA |
| helmet | — | Headers de segurança |
| compression | — | Compressão gzip |
| axios | — | Chamadas para APIs externas |

---

## Instalação e Execução

```bash
# 1. Clonar o repositório
git clone https://github.com/owdarlley/COTOU
cd COTOU
git checkout claude/parts-quotation-system-V7Nz1

# 2. Instalar dependências
npm install

# 3. Criar arquivo de configuração
cp .env.example .env
# Edite .env com suas configurações

# 4. Criar usuários iniciais
node scripts/seed-admin.js

# 5. (Opcional) Popular catálogo de peças
node scripts/seed-parts.js

# 6. Iniciar o servidor
npm start
```

O servidor fica disponível em: `http://localhost:3000`

Para desenvolvimento com auto-reload:

```bash
npm run dev
```

---

## Variáveis de Ambiente (`.env`)

```env
# Ambiente
NODE_ENV=development
PORT=3000

# Sessão
SESSION_SECRET=mude-para-uma-string-longa-e-aleatoria-em-producao

# Banco de dados
DB_PATH=./data/cotou.db

# URL do frontend (para CORS)
FRONTEND_URL=http://localhost:5173

# API de consulta de placa (wdapi2.com.br)
PLATE_API_BASE_URL=https://wdapi2.com.br
PLATE_API_TOKEN=seu_token_aqui

# Evolution API (WhatsApp)
WHATSAPP_API_URL=http://localhost:8080
WHATSAPP_API_KEY=sua_api_key_aqui
WHATSAPP_INSTANCE_NAME=cotou-instance

# Usuário admin inicial (usado pelo seed-admin.js)
ADMIN_EMAIL=admin@suaempresa.com.br
ADMIN_PASSWORD=admin123
```

---

## Seeds

### Usuários iniciais

```bash
node scripts/seed-admin.js
```

Cria (se não existirem):

| Nome | E-mail | Senha | Role |
|---|---|---|---|
| Administrador | admin@cotou.com.br | admin123 | admin |
| João Vendas | vendas@cotou.com.br | 123456 | vendas |
| Maria Compras | compras@cotou.com.br | 123456 | compras |

### Catálogo de peças

```bash
node scripts/seed-parts.js
```

Insere ~35 peças de exemplo (freios, suspensão, motor, elétrica, etc.).

### Cotações de exemplo

```bash
node scripts/seed-quotations.js
```

---

## Estrutura de Pastas

```
COTOU/
├── server.js                  # Ponto de entrada — HTTP server + Socket.io
├── src/
│   ├── app.js                 # Express app — middlewares, rotas, 404/500
│   ├── config/
│   │   ├── database.js        # Conexão SQLite + runMigrations()
│   │   └── socket.js          # Singleton do Socket.io
│   ├── middleware/
│   │   └── auth.js            # requireAuth, requireRole
│   ├── models/
│   │   ├── Customer.js
│   │   ├── Notification.js
│   │   ├── PartsCatalog.js
│   │   ├── Quotation.js
│   │   ├── QuotationItem.js
│   │   ├── User.js
│   │   └── Vehicle.js
│   ├── routes/
│   │   ├── admin.js           # /admin/*
│   │   ├── api.js             # /api/* (placa, autocomplete, whatsapp)
│   │   ├── auth.js            # /auth/*
│   │   ├── notifications.js   # /notificacoes/*
│   │   ├── parts.js           # /pecas/*
│   │   └── quotations.js      # /cotacoes/*
│   └── services/
│       ├── notificationService.js
│       ├── plateService.js
│       ├── quoteNumberService.js
│       └── whatsappService.js
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_customer_approval.sql
│   └── 003_quotation_photo.sql
├── scripts/
│   ├── seed-admin.js
│   ├── seed-parts.js
│   └── seed-quotations.js
├── public/
│   └── uploads/
│       └── quotations/        # Fotos das cotações (servidas em /uploads/...)
├── data/
│   └── cotou.db               # Banco SQLite (criado automaticamente)
├── .env
└── .env.example
```

---

## Esquema do Banco de Dados

### `users`

| Campo | Tipo | Descrição |
|---|---|---|
| id | INTEGER PK | — |
| name | TEXT | Nome do usuário |
| email | TEXT UNIQUE | E-mail (login) |
| password_hash | TEXT | Bcrypt hash |
| role | TEXT | `vendas`, `compras` ou `admin` |
| phone_whatsapp | TEXT | Telefone (opcional) |
| active | INTEGER | 1 = ativo, 0 = inativo |
| created_at | DATETIME | — |
| updated_at | DATETIME | — |

### `customers`

| Campo | Tipo | Descrição |
|---|---|---|
| id | INTEGER PK | — |
| name | TEXT | Nome do cliente |
| phone | TEXT | Telefone (WhatsApp) |
| created_at | DATETIME | — |
| updated_at | DATETIME | — |

### `vehicles`

| Campo | Tipo | Descrição |
|---|---|---|
| id | INTEGER PK | — |
| license_plate | TEXT UNIQUE | Placa |
| make | TEXT | Fabricante |
| model | TEXT | Modelo |
| year_model | INTEGER | Ano modelo |
| year_manuf | INTEGER | Ano de fabricação |
| color | TEXT | Cor |
| fuel | TEXT | Combustível |
| chassis | TEXT | Chassi |
| plate_data_json | TEXT | JSON completo da API de placa |
| created_at | DATETIME | — |
| updated_at | DATETIME | — |

### `parts_catalog`

| Campo | Tipo | Descrição |
|---|---|---|
| id | INTEGER PK | — |
| code | TEXT UNIQUE | Código da peça |
| name | TEXT | Nome |
| description | TEXT | Descrição |
| default_price | REAL | Preço padrão |
| created_at | DATETIME | — |
| updated_at | DATETIME | — |

### `quotations`

| Campo | Tipo | Descrição |
|---|---|---|
| id | INTEGER PK | — |
| quote_number | TEXT UNIQUE | Número da cotação |
| customer_id | INTEGER FK | Referência a `customers` |
| vehicle_id | INTEGER FK | Referência a `vehicles` |
| created_by_user_id | INTEGER FK | Usuário vendas que criou |
| assigned_buyer_id | INTEGER FK | Usuário compras que assumiu |
| status | TEXT | `pendente`, `em_cotacao`, `cotado`, `peca_chegou`, `cancelado` |
| notes_vendas | TEXT | Observações de vendas |
| notes_compras | TEXT | Observações de compras |
| photo_path | TEXT | Caminho da foto (ex: `/uploads/quotations/...`) |
| customer_approved | INTEGER | NULL, 1 (aprovado) ou 0 (recusado) |
| customer_approved_at | DATETIME | Data da resposta do cliente |
| whatsapp_sent_at | DATETIME | Data do envio WhatsApp |
| whatsapp_sent_by | INTEGER FK | Usuário que enviou o WhatsApp |
| created_at | DATETIME | — |
| updated_at | DATETIME | — |

### `quotation_items`

| Campo | Tipo | Descrição |
|---|---|---|
| id | INTEGER PK | — |
| quotation_id | INTEGER FK | Referência a `quotations` |
| part_catalog_id | INTEGER FK | Referência a `parts_catalog` (opcional) |
| part_name | TEXT | Nome da peça |
| part_code | TEXT | Código (se informado) |
| quantity | INTEGER | Quantidade |
| unit_price | REAL | Preço unitário (compras preenche) |
| total_price | REAL | Preço total (compras preenche) |
| labor_cost_vendas | REAL | Mão de obra (vendas) |
| labor_cost_compras | REAL | Mão de obra (compras) |
| delivery_days | INTEGER | Prazo em dias |
| delivery_deadline | DATETIME | Data de entrega |
| supplier_name | TEXT | Fornecedor |
| item_status | TEXT | `aguardando`, `em_cotacao`, `cotado`, `peca_chegou` |
| arrived_at | DATETIME | Data de chegada da peça |
| notes | TEXT | Observações do item |
| created_at | DATETIME | — |
| updated_at | DATETIME | — |

### `notifications`

| Campo | Tipo | Descrição |
|---|---|---|
| id | INTEGER PK | — |
| user_id | INTEGER FK | Destinatário |
| quotation_id | INTEGER FK | Cotação relacionada |
| type | TEXT | `nova_cotacao`, `cotacao_respondida`, `peca_chegou`, `status_atualizado`, `cotacao_atualizada` |
| title | TEXT | Título |
| message | TEXT | Mensagem |
| read_at | DATETIME | NULL = não lida |
| created_at | DATETIME | — |

### `audit_log`

| Campo | Tipo | Descrição |
|---|---|---|
| id | INTEGER PK | — |
| user_id | INTEGER FK | Usuário que fez a ação |
| quotation_id | INTEGER FK | Cotação relacionada |
| action | TEXT | Ação executada |
| old_value_json | TEXT | Estado anterior (JSON) |
| new_value_json | TEXT | Estado novo (JSON) |
| ip_address | TEXT | IP do cliente |
| created_at | DATETIME | — |

---

## Autenticação

A API usa **sessões HTTP** com cookie `connect.sid`.

1. Faça `POST /auth/login` com `{ email, password }`
2. O servidor define um cookie de sessão (`HttpOnly`, `SameSite`)
3. Todas as requisições subsequentes enviam o cookie automaticamente
4. Para invalidar, chame `POST /auth/logout`

Em produção (`NODE_ENV=production`), o cookie é `Secure` e `SameSite=none` (necessário para SPA em domínio diferente).

---

## Endpoints da API

### Saúde

#### `GET /health`
Verificação de saúde do servidor. Sem autenticação.

**Resposta 200:**
```json
{ "ok": true, "uptime": 123.45 }
```

---

### Dashboard

#### `GET /`
Resumo do painel do usuário autenticado.

**Auth:** Sim

**Resposta 200:**
```json
{
  "ok": true,
  "user": { "id": 1, "name": "João Vendas", "role": "vendas", "email": "vendas@cotou.com.br" },
  "statusMap": { "pendente": 3, "em_cotacao": 1, "cotado": 2 },
  "recentQuotations": [ ... ],
  "unreadCount": 2
}
```

---

### Autenticação (`/auth`)

#### `POST /auth/login`
Realiza login e cria a sessão.

**Body:**
```json
{ "email": "vendas@cotou.com.br", "password": "123456" }
```

**Resposta 200:**
```json
{ "ok": true, "user": { "id": 2, "name": "João Vendas", "role": "vendas" } }
```

**Erros:**
- `400` — campos faltando
- `401` — credenciais inválidas

---

#### `POST /auth/logout`
Encerra a sessão.

**Auth:** Não obrigatório

**Resposta 200:**
```json
{ "ok": true }
```

---

#### `GET /auth/me`
Retorna o usuário da sessão atual.

**Auth:** Sim

**Resposta 200:**
```json
{ "user": { "id": 2, "name": "João Vendas", "role": "vendas", "email": "vendas@cotou.com.br" } }
```

**Erros:**
- `401` — não autenticado

---

### Cotações (`/cotacoes`)

Todos os endpoints exigem autenticação. O acesso é filtrado por role automaticamente: vendas vê apenas suas cotações; compras e admin veem todas.

#### `GET /cotacoes`
Lista cotações paginadas.

**Auth:** Sim

**Query params:**
| Param | Padrão | Descrição |
|---|---|---|
| status | `todos` | Filtrar por status |
| page | `1` | Página |

**Resposta 200:**
```json
{
  "ok": true,
  "items": [ { "id": 1, "quote_number": "COT-001", "status": "pendente", ... } ],
  "total": 42,
  "page": 1,
  "totalPages": 3,
  "currentStatus": "todos"
}
```

---

#### `POST /cotacoes`
Cria nova cotação.

**Auth:** Sim | **Role:** `vendas`, `admin`

**Body (multipart/form-data ou application/json):**
```json
{
  "customer_name": "Carlos Silva",
  "customer_phone": "11999990000",
  "vehicle_plate": "ABC1234",
  "vehicle_model": "Gol",
  "vehicle_year_model": 2020,
  "vehicle_year_manuf": 2019,
  "vehicle_chassis": "",
  "notes_vendas": "Urgente",
  "part_names": ["Pastilha de Freio", "Amortecedor"],
  "part_codes": ["PF-1023", ""],
  "quantities": [1, 2],
  "photo_base64": "data:image/jpeg;base64,..."
}
```

> `photo_base64` é opcional. Quando enviado, a imagem é salva em `public/uploads/quotations/` e acessível via `/uploads/quotations/<filename>`.

**Resposta 201:**
```json
{ "ok": true, "quotationId": 15, "quoteNumber": "COT-015" }
```

**Erros:**
- `400` — campos obrigatórios ausentes ou nenhuma peça adicionada
- `403` — role sem permissão

---

#### `GET /cotacoes/:id`
Detalhe de uma cotação.

**Auth:** Sim

**Resposta 200:**
```json
{
  "ok": true,
  "quotation": { "id": 15, "quote_number": "COT-015", "status": "pendente", ... },
  "items": [ { "id": 1, "part_name": "Pastilha de Freio", "quantity": 1, "unit_price": null, ... } ],
  "partsTotal": 0,
  "laborTotal": 0,
  "grandTotal": 0
}
```

---

#### `POST /cotacoes/:id/status`
Altera o status da cotação.

**Auth:** Sim | **Role:** `compras`, `admin`

**Body:**
```json
{ "status": "em_cotacao" }
```

Valores aceitos: `em_cotacao`, `cancelado`.

**Resposta 200:**
```json
{ "ok": true, "status": "em_cotacao" }
```

---

#### `POST /cotacoes/:id/responder`
Compras preenche os valores dos itens e marca cotação como respondida.

**Auth:** Sim | **Role:** `compras`, `admin`

**Body:**
```json
{
  "notes_compras": "Peça disponível em 3 dias",
  "item_ids": [1, 2],
  "unit_prices": [89.90, 210.00],
  "total_prices": [89.90, 420.00],
  "labor_costs_compras": [0, 50],
  "delivery_days": [3, 3],
  "delivery_deadlines": ["2026-05-28", "2026-05-28"],
  "supplier_names": ["Fornecedor A", "Fornecedor B"],
  "item_notes": ["", "Verificar disponibilidade"]
}
```

**Resposta 200:**
```json
{ "ok": true }
```

---

#### `POST /cotacoes/:id/resposta-cliente`
Vendas registra se o cliente aprovou ou recusou a cotação.

**Auth:** Sim | **Role:** `vendas`, `admin`

**Body:**
```json
{ "approved": 1 }
```

`approved`: `1` ou `true` = aprovado; `0` ou `false` = recusado.

**Resposta 200:**
```json
{ "ok": true, "approved": true }
```

---

#### `POST /cotacoes/:id/peca-chegou`
Compras marca a chegada da peça.

**Auth:** Sim | **Role:** `compras`, `admin`

**Body (opcional):**
```json
{ "item_id": 1 }
```

Se `item_id` for omitido, todos os itens da cotação são marcados como chegados e a cotação passa para `peca_chegou`.

**Resposta 200:**
```json
{ "ok": true }
```

---

### Peças / Catálogo (`/pecas`)

#### `GET /pecas`
Lista peças do catálogo com paginação e busca.

**Auth:** Sim

**Query params:**
| Param | Padrão | Descrição |
|---|---|---|
| q | `""` | Busca por nome ou código |
| page | `1` | Página |

**Resposta 200:**
```json
{
  "ok": true,
  "items": [ { "id": 1, "code": "PF-1023", "name": "Pastilha de Freio Dianteira", ... } ],
  "total": 35,
  "page": 1,
  "totalPages": 3,
  "q": "freio"
}
```

---

#### `POST /pecas`
Cria uma nova peça no catálogo.

**Auth:** Sim | **Role:** `admin`, `compras`

**Body:**
```json
{
  "code": "PF-9999",
  "name": "Pastilha Nova",
  "description": "Kit 4 peças",
  "default_price": 99.90
}
```

**Resposta 201:**
```json
{ "ok": true, "id": 36 }
```

**Erros:**
- `400` — código e nome são obrigatórios
- `409` — código já existe no catálogo

---

#### `PUT /pecas/:id`
Atualiza uma peça.

**Auth:** Sim | **Role:** `admin`, `compras`

**Body:** (mesmos campos de POST, todos opcionais)

**Resposta 200:**
```json
{ "ok": true }
```

---

#### `DELETE /pecas/:id`
Remove uma peça do catálogo.

**Auth:** Sim | **Role:** `admin`, `compras`

**Resposta 200:**
```json
{ "ok": true }
```

---

#### `POST /pecas/:id/editar`
Alias legado para `PUT /pecas/:id`.

#### `POST /pecas/:id/excluir`
Alias legado para `DELETE /pecas/:id`.

---

### Notificações (`/notificacoes`)

#### `GET /notificacoes`
Lista notificações do usuário autenticado com paginação.

**Auth:** Sim

**Query params:**
| Param | Padrão | Descrição |
|---|---|---|
| page | `1` | Página |

**Resposta 200:**
```json
{
  "ok": true,
  "items": [
    {
      "id": 5,
      "type": "cotacao_respondida",
      "title": "Cotação #COT-003 respondida!",
      "message": "O setor de compras preencheu os valores.",
      "read_at": null,
      "created_at": "2026-05-25T10:00:00",
      "time_label": "2h atrás"
    }
  ],
  "total": 10,
  "page": 1,
  "totalPages": 1
}
```

---

#### `POST /notificacoes/marcar-todas`
Marca todas as notificações do usuário como lidas.

**Auth:** Sim

**Resposta 200:**
```json
{ "ok": true }
```

---

#### `POST /notificacoes/todas-lidas`
Alias para `/notificacoes/marcar-todas`.

---

### Administração (`/admin`)

Todos os endpoints exigem role `admin`.

#### `GET /admin/usuarios`
Lista todos os usuários.

**Auth:** Sim | **Role:** `admin`

**Resposta 200:**
```json
{ "ok": true, "users": [ { "id": 1, "name": "Administrador", "role": "admin", "active": 1, ... } ] }
```

---

#### `GET /admin/usuarios/:id`
Detalhe de um usuário.

**Auth:** Sim | **Role:** `admin`

**Resposta 200:**
```json
{ "ok": true, "user": { "id": 2, "name": "João Vendas", ... } }
```

**Erros:**
- `404` — usuário não encontrado

---

#### `POST /admin/usuarios`
Cria um novo usuário.

**Auth:** Sim | **Role:** `admin`

**Body:**
```json
{
  "name": "Ana Atendimento",
  "email": "ana@empresa.com",
  "password": "senha123",
  "role": "vendas",
  "phone_whatsapp": "11988887777"
}
```

**Resposta 201:**
```json
{ "ok": true, "user": { "id": 4, "name": "Ana Atendimento", "role": "vendas" } }
```

**Erros:**
- `400` — campos obrigatórios ausentes ou role inválida
- `409` — e-mail já cadastrado

---

#### `PUT /admin/usuarios/:id`
Atualiza dados de um usuário.

**Auth:** Sim | **Role:** `admin`

**Body (todos opcionais):**
```json
{
  "name": "Ana Silva",
  "email": "ana@empresa.com",
  "role": "compras",
  "phone_whatsapp": "11988887777",
  "active": 1,
  "new_password": "novasenha123"
}
```

**Resposta 200:**
```json
{ "ok": true }
```

---

#### `POST /admin/usuarios/:id/desativar`
Desativa um usuário (impede login).

**Auth:** Sim | **Role:** `admin`

**Resposta 200:**
```json
{ "ok": true }
```

**Erros:**
- `400` — não é possível desativar o próprio usuário

---

#### `POST /admin/usuarios/:id/ativar`
Reativa um usuário desativado.

**Auth:** Sim | **Role:** `admin`

**Resposta 200:**
```json
{ "ok": true }
```

---

#### `POST /admin/usuarios/:id/senha`
Redefine a senha de um usuário.

**Auth:** Sim | **Role:** `admin`

**Body:**
```json
{ "new_password": "novasenha123" }
```

**Resposta 200:**
```json
{ "ok": true }
```

**Erros:**
- `400` — senha deve ter pelo menos 6 caracteres

---

### API Utilitária (`/api`)

#### `GET /api/placa/:plate`
Consulta dados de um veículo pela placa (via API externa).

**Auth:** Sim

**Resposta 200 (sucesso):**
```json
{
  "ok": true,
  "data": {
    "MARCA": "VOLKSWAGEN",
    "MODELO": "GOL",
    "ANOMODELO": 2020,
    "ANOFAB": 2019,
    "COR": "BRANCA",
    "COMBUSTIVEL": "FLEX"
  }
}
```

**Resposta 200 (sem dados / token não configurado):**
```json
{ "ok": false, "message": "Placa não encontrada ou sem dados disponíveis." }
```

---

#### `GET /api/pecas`
Autocomplete de peças (busca por nome ou código).

**Auth:** Sim

**Query params:**
| Param | Descrição |
|---|---|
| q | Termo de busca (mínimo 1 caractere) |

**Resposta 200:**
```json
[
  { "id": 1, "code": "PF-1023", "name": "Pastilha de Freio Dianteira", "default_price": 89.90 }
]
```

---

#### `GET /api/notificacoes`
Últimas 10 notificações do usuário (para badge/dropdown em tempo real).

**Auth:** Sim

**Resposta 200:**
```json
[
  { "id": 5, "type": "nova_cotacao", "title": "Nova cotação #COT-010", "read_at": null, ... }
]
```

---

#### `POST /api/notificacoes/:id/lida`
Marca uma notificação específica como lida.

**Auth:** Sim

**Resposta 200:**
```json
{ "ok": true, "unreadCount": 3 }
```

---

#### `POST /api/notificacoes/todas-lidas`
Marca todas as notificações como lidas.

**Auth:** Sim

**Resposta 200:**
```json
{ "ok": true }
```

---

#### `POST /api/whatsapp/enviar/:id`
Envia a cotação para o cliente via WhatsApp (Evolution API).

**Auth:** Sim

A cotação deve estar no status `cotado` ou `peca_chegou`.

**Resposta 200 (sucesso):**
```json
{ "ok": true, "message": "Mensagem enviada com sucesso!" }
```

**Resposta 200 (falha):**
```json
{ "ok": false, "message": "Cotação ainda não foi respondida pelo setor de compras." }
```

---

### Arquivos (uploads)

#### `GET /uploads/quotations/:filename`
Serve a foto de uma cotação. Não requer autenticação (arquivo estático).

---

## Socket.io

O servidor emite eventos em tempo real para notificar usuários conectados.

### Conexão

```js
const socket = io('http://localhost:3000', { withCredentials: true });

// Registrar o userId para receber notificações direcionadas
socket.emit('registrar', { userId: 2 });
```

### Evento recebido: `nova_notificacao`

Emitido para o usuário destinatário quando uma notificação é criada.

```js
socket.on('nova_notificacao', (notification) => {
  console.log(notification);
  // { id, type, title, message, quotationId, created_at }
});
```

---

## Fluxo de Negócio

### Ciclo de vida de uma cotação

```
vendas cria          compras assume        compras responde
  pendente    →       em_cotacao    →          cotado
                                                  ↓
                                           peca_chegou   (compras confirma chegada)
                                               ou
              cancelado (compras/admin pode cancelar em qualquer etapa)
```

### Passo a passo

1. **Vendas** cria cotação via `POST /cotacoes` com dados do cliente, veículo e peças.
2. O sistema emite `nova_notificacao` em tempo real para todos os usuários de **compras**.
3. **Compras** assume via `POST /cotacoes/:id/status` com `{ "status": "em_cotacao" }`.
4. **Compras** preenche valores via `POST /cotacoes/:id/responder` — status muda para `cotado`.
5. O sistema emite `nova_notificacao` para o vendedor que abriu a cotação.
6. **Vendas** envia ao cliente via `POST /api/whatsapp/enviar/:id` e registra a resposta via `POST /cotacoes/:id/resposta-cliente`.
7. **Compras** confirma chegada via `POST /cotacoes/:id/peca-chegou` — status muda para `peca_chegou`.
8. **Vendas** recebe notificação para avisar o cliente que a peça está disponível.

---

## Papéis (roles)

| Role | Permissões |
|---|---|
| `vendas` | Criar cotações, ver suas próprias cotações, registrar resposta do cliente, enviar WhatsApp |
| `compras` | Ver todas as cotações, alterar status, responder cotações, marcar chegada de peças, gerenciar catálogo |
| `admin` | Tudo acima + gerenciar usuários |

---

## Respostas de Erro Padrão

| HTTP | Quando |
|---|---|
| 400 | Dados inválidos ou ausentes |
| 401 | Não autenticado (sessão expirada ou sem cookie) |
| 403 | Autenticado mas sem permissão para a operação |
| 404 | Recurso não encontrado |
| 409 | Conflito (ex: e-mail ou código já cadastrado) |
| 500 | Erro interno do servidor |

Formato:
```json
{ "ok": false, "error": "Descrição do erro" }
```

---

## Backup

O banco de dados fica em `data/cotou.db`. Para backup:

```bash
cp data/cotou.db backups/cotou-$(date +%Y%m%d).db
```
