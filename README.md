# COTOU — ERP de Cotação de Peças Automotivas

Sistema interno para gestão do ciclo de cotação entre o setor de **Vendas** e o setor de **Compras** de uma autopeças. O vendedor abre uma cotação, o comprador é notificado em tempo real via Socket.io, cota os valores e o cliente aprova via link WhatsApp.

**Produção:** https://cotou.darlley.dev.br

---

## Índice

- [Stack Técnica](#stack-técnica)
- [Arquitetura](#arquitetura)
- [Instalação](#instalação)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Banco de Dados](#banco-de-dados)
- [Autenticação e Segurança](#autenticação-e-segurança)
- [Papéis de Usuário](#papéis-de-usuário)
- [Fluxo de Negócio](#fluxo-de-negócio)
- [API — Endpoints](#api--endpoints)
- [Socket.io](#socketio)
- [WhatsApp (Evolution API)](#whatsapp-evolution-api)
- [Frontend](#frontend)
- [Testes](#testes)
- [Logging](#logging)
- [Scripts e Manutenção](#scripts-e-manutenção)
- [Nginx e HTTPS](#nginx-e-https)
- [Backup](#backup)

---

## Stack Técnica

| Tecnologia | Versão | Uso |
|---|---|---|
| Node.js | 22+ | Runtime |
| Express | 4.x | Framework HTTP |
| SQLite (`node:sqlite`) | built-in | Banco de dados (API síncrona nativa) |
| Socket.io | 4.x | Notificações em tempo real |
| express-session + session-file-store | — | Autenticação por sessão HTTP |
| bcryptjs | — | Hash de senhas |
| Pino + pino-http | 10.x | Logging estruturado (JSON) |
| Evolution API | 2.3.7 | WhatsApp via Baileys (Docker) |
| React 18 | CDN | Frontend SPA (sem build step) |
| Babel Standalone | CDN | Transpile JSX em runtime |
| Nginx | — | Proxy reverso + HTTPS |
| PM2 | — | Gerenciador de processos |
| Certbot | — | TLS/SSL automático (Let's Encrypt) |

---

## Arquitetura

```
Browser (cotou.darlley.dev.br)
         │
         ▼
    Nginx (443 HTTPS + Let's Encrypt)
         │
         ▼
  Node.js / Express (porta 3000, PM2)
         │                │
         ▼                ▼
    SQLite DB       Evolution API
  (data/cotou.db)  (localhost:8080, Docker)
```

- O **frontend** é uma SPA React sem build step — JSX transpilado pelo Babel CDN diretamente no browser, servida em `/prototype`.
- O **backend** é uma API REST com autenticação por sessão + Socket.io para notificações em tempo real.
- O **banco** usa a API nativa `node:sqlite` (síncrona), com migrações versionadas aplicadas automaticamente na inicialização.
- A **integração WhatsApp** usa a Evolution API v2 via HTTP. Cada usuário tem sua própria instância isolada (`cotou-user-<id>`).

---

## Instalação

### Pré-requisitos

- VPS Linux (testado em RHEL/CentOS 9)
- Node.js 22+
- PM2 (`npm i -g pm2`)
- Nginx
- Certbot
- Docker + Docker Compose (para Evolution API)

### Passos

```bash
# 1. Clonar o repositório
git clone https://github.com/owdarlley/COTOU
cd COTOU

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
nano .env                       # preencha SESSION_SECRET, PLATE_API_TOKEN, WHATSAPP_API_KEY, etc.

# 4. Criar usuário admin inicial
node scripts/seed-admin.js

# 5. Iniciar com PM2
pm2 start server.js --name cotou
pm2 save
pm2 startup
```

### Desenvolvimento local

```bash
npm run dev       # nodemon — auto-reload
```

Acesse: `http://localhost:3000/prototype`

### Testes

```bash
npm test          # 32 testes de integração (node:test built-in, DB isolado)
```

---

## Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha:

```env
# Ambiente
NODE_ENV=production
PORT=3000

# Sessão (gere com: openssl rand -base64 48)
SESSION_SECRET=string-longa-e-aleatoria

# Banco de dados
DB_PATH=./data/cotou.db

# URL pública (usada em links de aprovação enviados por WhatsApp)
APP_URL=https://cotou.darlley.dev.br

# CORS — URL do frontend externo (se servido de domínio diferente)
FRONTEND_URL=https://owdarlley.github.io

# Cookie seguro (obrigatório em produção com HTTPS)
COOKIE_SECURE=true

# API de consulta de placa (cache local de 30 dias no SQLite)
PLATE_API_BASE_URL=https://wdapi2.com.br
PLATE_API_TOKEN=seu_token_aqui

# Evolution API (WhatsApp)
WHATSAPP_API_URL=http://localhost:8080
WHATSAPP_API_KEY=sua_api_key_aqui

# Usuário admin criado pelo seed-admin.js
ADMIN_EMAIL=admin@suaempresa.com.br
ADMIN_PASSWORD=SenhaForte123

# Log level (silent | error | warn | info | debug)
LOG_LEVEL=info
```

---

## Estrutura de Pastas

```
COTOU/
├── server.js                        # Ponto de entrada: HTTP server + Socket.io
├── src/
│   ├── app.js                       # Express app — middlewares, rotas, CSRF, CORS
│   ├── config/
│   │   ├── database.js              # Conexão SQLite + runMigrations()
│   │   ├── db.js                    # Adapter de banco (ponto único; documenta rota pg)
│   │   ├── logger.js                # Pino — logging estruturado JSON
│   │   └── socket.js                # Singleton do Socket.io
│   ├── middleware/
│   │   └── auth.js                  # requireAuth, requireRole
│   ├── models/
│   │   ├── AuditLog.js              # Histórico de eventos por cotação
│   │   ├── Customer.js
│   │   ├── Notification.js
│   │   ├── Organization.js          # Multi-tenant (fundação)
│   │   ├── PartsCatalog.js
│   │   ├── Quotation.js
│   │   ├── QuotationItem.js
│   │   ├── Settings.js
│   │   ├── Supplier.js
│   │   ├── User.js
│   │   └── Vehicle.js
│   ├── routes/
│   │   ├── admin.js                 # /admin/* — usuários, configurações, audit log
│   │   ├── api.js                   # /api/* — placa, WhatsApp, clientes, fornecedores
│   │   ├── aprovacao.js             # /aprovar/:token — aprovação pública (sem auth)
│   │   ├── auth.js                  # /auth/* — login, logout, me, users
│   │   ├── notifications.js         # /notificacoes/*
│   │   ├── parts.js                 # /pecas/* — catálogo de peças
│   │   ├── quotations.js            # /cotacoes/* — CRUD + fluxo completo
│   │   └── webhook.js               # /api/whatsapp/webhook — Evolution API
│   └── services/
│       ├── notificationService.js   # notifyUser, notifyAllByRole
│       ├── plateService.js          # Consulta placa com cache SQLite 30 dias
│       ├── quoteNumberService.js    # Geração do número de cotação (COT-XXXX)
│       └── whatsappService.js       # Integração Evolution API
├── migrations/                      # SQL aplicado automaticamente na inicialização
│   ├── 001_initial_schema.sql
│   ├── 002_customer_approval.sql
│   ├── 003_quotation_photo.sql
│   ├── 004_whatsapp_instance.sql
│   ├── 005_approval_token.sql
│   ├── 006_settings.sql
│   ├── 007_settings_split.sql
│   ├── 008_settings_template_v2.sql
│   ├── 009_suppliers.sql
│   ├── 010_indexes.sql
│   ├── 011_approval_source.sql
│   ├── 012_plate_cache.sql
│   └── 013_organizations.sql
├── test/
│   ├── setup.js                     # DB isolado em temp file, servidor na porta aleatória
│   ├── auth.test.js                 # Login, CSRF, sessão (8 testes)
│   ├── quotations.test.js           # CRUD, status, audit log (13 testes)
│   └── admin.test.js                # Usuários, senha, audit log (11 testes)
├── scripts/
│   ├── seed-admin.js                # Cria usuários iniciais
│   └── setup-vps.sh                 # Setup completo de VPS do zero
├── public/
│   ├── aprovar.html                 # Página de aprovação para o cliente (link WhatsApp)
│   └── prototype/                   # SPA principal (React + Babel CDN)
│       ├── index.html               # Shell HTML + CSS + imports dos JS
│       ├── tweaks-panel.js          # Painel de customização visual
│       ├── store.js                 # Estado global, reducer, Socket.io
│       ├── primitives.js            # Componentes base: Button, Modal, Field, etc.
│       ├── shell.js                 # Sidebar, Topbar, NotificationsBell
│       ├── login.js                 # LoginScreen
│       ├── quotations.js            # QuotationsList, QuotationDetail, NewQuotation
│       ├── screens.js               # Dashboard, Clientes, Fornecedores, Relatórios, Admin
│       └── app.js                   # Router, App, MobileNav
├── data/
│   └── cotou.db                     # SQLite (criado automaticamente)
├── .env
├── .env.example
└── package.json
```

---

## Banco de Dados

O banco usa **SQLite via `node:sqlite`** (API síncrona nativa do Node.js 22+). Migrações versionadas são aplicadas automaticamente em `server.js` antes de qualquer rota.

```bash
# Rodar migrações manualmente
npm run migrate
```

### Principais tabelas

| Tabela | Descrição |
|---|---|
| `users` | Usuários com role (admin / vendas / compras) |
| `quotations` | Cotações com status e metadados |
| `quotation_items` | Peças de cada cotação (nome, código, qtd, valor) |
| `customers` | Clientes (nome + telefone, sem cadastro obrigatório) |
| `vehicles` | Veículos vinculados às cotações |
| `notifications` | Notificações por usuário (lida/não lida) |
| `audit_log` | Histórico de eventos por cotação (quem fez o quê e quando) |
| `parts_catalog` | Catálogo de peças para autocomplete |
| `suppliers` | Fornecedores para consulta de preço |
| `settings` | Configurações da instância (template WhatsApp, etc.) |
| `plate_cache` | Cache de consultas de placa (TTL 30 dias) |
| `organizations` | Multi-tenant (fundação — organização padrão id=1) |
| `_migrations` | Controle de migrações já aplicadas |

### Status de cotação

```
pendente → em_cotacao → cotado → aguardando_peca → peca_chegou → concluido
                    ↘ cancelado (qualquer etapa)
```

---

## Autenticação e Segurança

### Sessão HTTP

- Cookie `connect.sid` — `HttpOnly`, `Secure` em produção, `SameSite=none`
- Sessão armazenada em arquivo (`session-file-store`)
- Campos disponíveis em `req.session`: `userId`, `userRole`, `userName`, `organizationId`, `csrfToken`

### CSRF

Proteção via **Synchronizer Token Pattern**:

1. `POST /auth/login` retorna `csrfToken` junto com os dados do usuário
2. Todas as mutations (`POST`, `PUT`, `DELETE`, `PATCH`) exigem o header `X-CSRF-Token`
3. Rotas isentas: `/auth/login`, `/auth/logout`, `/api/whatsapp/webhook`, `/aprovar/:token`

O frontend injeta o token automaticamente via `window.fetch` interceptado.

### Validação de senha

Ao criar ou alterar senha via painel admin, são obrigatórios:
- Mínimo de 8 caracteres
- Pelo menos 1 letra maiúscula
- Pelo menos 1 número

### Rate limiting

- Criação de cotações: 30 req / 60 s por IP
- Login: limitado pelo `express-rate-limit` global

### Headers de segurança

Gerenciados pelo **Helmet** (CSP, HSTS, X-Frame-Options, etc.).

---

## Papéis de Usuário

| Role | Permissões |
|---|---|
| `vendas` | Criar cotações, ver as suas próprias, registrar resposta do cliente, enviar WhatsApp |
| `compras` | Ver todas as cotações, alterar status, preencher valores, confirmar chegada, gerenciar catálogo |
| `admin` | Tudo acima + gerenciar usuários + painel admin + relatórios + audit log global |

O **admin** recebe notificações de **todos** os eventos do sistema (nova cotação, resposta de compras, aprovação de cliente, etc.).

---

## Fluxo de Negócio

```
1. Vendas cria cotação
        │
        ▼
2. Compras recebe notificação em tempo real (Socket.io)
        │
        ▼
3. Compras assume (status: em_cotacao) e preenche valores
        │
        ▼
4. Vendas recebe notificação → envia cotação ao cliente via WhatsApp
        │
        ▼
5. Cliente recebe link e aprova (ou recusa) diretamente pelo celular
        │
        ▼
6. Compras recebe notificação → aguarda a peça → confirma chegada
        │
        ▼
7. WhatsApp automático avisa o cliente que a peça chegou
```

### Aprovação pelo cliente

Ao enviar a cotação via WhatsApp, o sistema gera um **link de aprovação único** (`/aprovar/:token`) com validade configurável. O cliente acessa pelo celular, visualiza os itens e valores, e aprova ou recusa com um toque.

- Aprovações via link e via resposta no WhatsApp (template interativo) são detectadas e processadas automaticamente
- O link exibe a data/hora de expiração
- Se o token já foi usado, exibe o resultado anterior

---

## API — Endpoints

Todas as rotas (exceto as marcadas como "Público") exigem sessão autenticada.

### Saúde

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/health` | Público | Status da API e uptime |

```json
{ "ok": true, "uptime": 1234.5 }
```

---

### Autenticação (`/auth`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/auth/login` | Público | Login com e-mail e senha |
| POST | `/auth/logout` | Sim | Encerra sessão |
| GET | `/auth/me` | Sim | Dados do usuário autenticado |
| GET | `/auth/users` | Público | Lista usuários ativos (acesso rápido na tela de login) |

**Login:**
```json
// Body
{ "email": "vendas@empresa.com.br", "password": "SenhaForte123" }

// Resposta 200
{
  "ok": true,
  "user": { "id": 2, "name": "Vendas", "role": "vendas" },
  "csrfToken": "abc123..."
}
```

---

### Dashboard (`/`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/` | Sim | Resumo: usuário, contagem por status, cotações recentes |

---

### Cotações (`/cotacoes`)

| Método | Rota | Role | Descrição |
|---|---|---|---|
| GET | `/cotacoes` | Todos | Lista paginada com filtro `?status=` e `?page=` |
| POST | `/cotacoes` | vendas, admin | Cria cotação (cliente, veículo, peças, foto) |
| GET | `/cotacoes/:id` | Todos | Detalhe + itens + audit log |
| PATCH | `/cotacoes/:id/foto` | vendas, admin | Upload de foto da peça (base64) |
| POST | `/cotacoes/:id/status` | compras, admin | Altera status |
| POST | `/cotacoes/:id/responder` | compras, admin | Preenche valores e marca como cotado |
| POST | `/cotacoes/:id/resposta-cliente` | vendas, admin | Registra aprovação/recusa manual do cliente |
| POST | `/cotacoes/:id/peca-chegou` | compras, admin | Confirma chegada + dispara WhatsApp automático |
| GET | `/cotacoes/:id/audit-log` | compras, admin, dono | Histórico de eventos da cotação |

**Criar cotação:**
```json
// Body
{
  "customer_name": "João Silva",
  "customer_phone": "11999990001",
  "vehicle_plate": "ABC1D23",
  "vehicle_model": "Civic",
  "vehicle_year_model": 2021,
  "part_names": ["Pastilha de Freio", "Disco de Freio"],
  "quantities": [1, 2],
  "notes_vendas": "Urgente"
}

// Resposta 201
{ "ok": true, "quotationId": 42, "quoteNumber": "COT-0042" }
```

**Status válidos para `POST /cotacoes/:id/status`:**

| Status | Quem pode | Descrição |
|---|---|---|
| `em_cotacao` | compras, admin | Compras está cotando |
| `cancelado` | compras, admin | Cancelamento |

---

### Audit Log

| Método | Rota | Role | Descrição |
|---|---|---|---|
| GET | `/cotacoes/:id/audit-log` | compras, admin, dono | Eventos de uma cotação específica |
| GET | `/admin/audit-log` | admin | Log global paginado (`?limit=&offset=`) |

**Tipos de evento registrados:**

| Ação | Quando |
|---|---|
| `created` | Cotação criada |
| `status_changed` | Mudança de status |
| `prices_filled` | Compras preencheu os valores |
| `customer_approved_manual` | Vendedor registrou aprovação manual |
| `customer_rejected_manual` | Vendedor registrou recusa manual |
| `part_arrived` | Chegada da peça confirmada |
| `customer_approved_whatsapp` | Cliente aprovou via link/WhatsApp |
| `customer_rejected_whatsapp` | Cliente recusou via link/WhatsApp |

---

### Catálogo de Peças (`/pecas`)

| Método | Rota | Role | Descrição |
|---|---|---|---|
| GET | `/pecas` | Todos | Lista com busca `?q=` e paginação |
| POST | `/pecas` | compras, admin | Cria peça |
| PUT | `/pecas/:id` | compras, admin | Atualiza peça |
| DELETE | `/pecas/:id` | compras, admin | Remove peça |

---

### Notificações (`/notificacoes`)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/notificacoes` | Lista paginada (`?page=&limit=`) |
| POST | `/notificacoes/read-all` | Marca todas como lidas |

---

### Administração (`/admin`)

**Role obrigatório:** `admin`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/admin/usuarios` | Lista todos os usuários |
| POST | `/admin/usuarios` | Cria usuário (senha validada: 8+ chars, maiúscula, número) |
| PUT | `/admin/usuarios/:id` | Atualiza dados/senha do usuário |
| POST | `/admin/usuarios/:id/senha` | Troca senha de outro usuário |
| GET | `/admin/audit-log` | Log global paginado |
| GET | `/admin/configuracoes` | Lê configurações |
| PUT | `/admin/configuracoes` | Salva configurações (template WhatsApp, etc.) |

---

### API Utilitária (`/api`)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/placa/:plate` | Consulta veículo pela placa (cache 30 dias) |
| GET | `/api/clientes` | Autocomplete de clientes |
| GET | `/api/notificacoes` | Últimas 10 notificações (dropdown/badge) |
| POST | `/api/notificacoes/:id/lida` | Marca notificação como lida |
| GET | `/api/fornecedores` | Lista fornecedores |
| POST | `/api/fornecedores` | Cria fornecedor |
| PUT | `/api/fornecedores/:id` | Atualiza fornecedor |
| DELETE | `/api/fornecedores/:id` | Remove fornecedor |

**Consulta de placa:**
```json
// GET /api/placa/ABC1D23
{
  "ok": true,
  "cached": false,
  "data": {
    "MARCA": "HONDA",
    "MODELO": "CIVIC",
    "ano": "2021",
    "cor": "PRATA"
  }
}
```

---

### WhatsApp (`/api/whatsapp`)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/whatsapp/instancia/criar` | Cria instância na Evolution API |
| GET | `/api/whatsapp/instancia/status` | Estado da conexão (sincroniza DB) |
| GET | `/api/whatsapp/instancia/qrcode` | QR code para conexão |
| DELETE | `/api/whatsapp/instancia/desconectar` | Faz logout (mantém instância, aguarda novo QR) |
| POST | `/api/whatsapp/enviar/:id` | Envia cotação ao cliente com link de aprovação |
| POST | `/api/whatsapp/consultar-fornecedor` | Envia consulta de preço a fornecedor |
| POST | `/api/whatsapp/webhook` | Webhook da Evolution API (público) |

---

### Aprovação Pública (`/aprovar`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/aprovar/:token` | Público | Página HTML — cliente visualiza e decide |
| POST | `/api/aprovar/:token` | Público | Registra decisão (`{ "action": "approve" \| "reject" }`) |

---

### Respostas de Erro

| HTTP | Quando |
|---|---|
| 400 | Dados inválidos ou ausentes |
| 401 | Não autenticado |
| 403 | CSRF inválido ou sem permissão de role |
| 404 | Recurso não encontrado |
| 409 | Conflito (e-mail ou código duplicado) |
| 500 | Erro interno |

```json
{ "ok": false, "error": "Descrição do erro" }
```

---

## Socket.io

O cliente se registra após o login enviando o `userId`. Todos os eventos são emitidos **apenas para o usuário correto** (sem broadcast público).

```js
const socket = io('https://cotou.darlley.dev.br', {
  withCredentials: true,
  transports: ['websocket', 'polling']
});

socket.emit('registrar', { userId: 2 });

socket.on('nova_notificacao', (notification) => {
  // { id, type, title, message, quotationId, created_at }
});
```

**Eventos emitidos pelo servidor:**

| Evento | Quando |
|---|---|
| `nova_notificacao` | Qualquer novo evento relevante para o usuário |
| `cotacao_atualizada` | Status ou dados de uma cotação mudaram |

---

## WhatsApp (Evolution API)

### Arquitetura de instâncias

Cada usuário tem sua própria instância WhatsApp com nome `cotou-user-<id>`. O isolamento garante que as mensagens saiam sempre do número correto de cada vendedor/comprador.

A Evolution API roda em Docker com a porta `8080` exposta **apenas para localhost**:

```yaml
ports:
  - "127.0.0.1:8080:8080"
```

### Ciclo de conexão

1. Admin cria usuário → instância criada automaticamente na Evolution API
2. Usuário acessa o painel → clica em **Conectar** → escaneia QR code
3. **Desconectar** faz logout do WhatsApp mas mantém a instância — QR fica disponível imediatamente para reconexão

### Mensagem automática de chegada de peça

Quando compras clica em **Peça chegou**, o sistema envia automaticamente uma mensagem via WhatsApp ao cliente, usando a instância do comprador (ou do vendedor como fallback):

```
✅ Olá, João! Sua peça da cotação COT-0042 chegou!
Por favor, entre em contato para combinar a entrega ou a retirada. 🚗
```

### Template de aprovação

O template de mensagem WhatsApp enviado ao cliente (com link de aprovação) é configurável em **Admin → Configurações**.

---

## Frontend

O frontend é uma **SPA React sem build step**, servida pelo próprio Node.js em `/prototype`. O JSX é transpilado pelo Babel Standalone diretamente no browser.

### Estrutura dos arquivos

O monolito foi dividido em 8 arquivos JS carregados em sequência via `<script type="text/babel" src="...">`. O Babel Standalone busca cada arquivo com XHR síncrono, preservando a ordem de execução:

| Arquivo | Conteúdo |
|---|---|
| `tweaks-panel.js` | Painel de customização visual (cores, tema) |
| `store.js` | Estado global (reducer), Socket.io, `useStore`, `fmt`, `STATUS_META` |
| `primitives.js` | Button, Badge, Modal, Field, Toasts, GuidedTour, etc. |
| `shell.js` | Sidebar, Topbar, NotificationsBell |
| `login.js` | Tela de login e acesso rápido |
| `quotations.js` | QuotationsList, QuotationDetail, AuditLogPanel, NewQuotation |
| `screens.js` | Dashboard, Clientes, Fornecedores, Catálogo, Relatórios, Admin |
| `app.js` | Router, MobileNav, App |

### Telas disponíveis

| Tela | Role | Descrição |
|---|---|---|
| Dashboard | Todos | KPIs e atividade recente |
| Cotações | Todos | Lista com filtro por status |
| Nova cotação | vendas, admin | Form com lookup de placa, histórico do cliente |
| Detalhe da cotação | Todos | Itens, valores, audit log, chat, ações |
| Clientes | Todos | Histórico de cotações por cliente |
| Fornecedores | compras, admin | CRUD de fornecedores |
| Catálogo de peças | compras, admin | CRUD do catálogo para autocomplete |
| Relatórios | admin | KPIs, gráfico 30 dias, distribuição de status |
| Notificações | Todos | Centro de notificações com marcação de leitura |
| Usuários | admin | CRUD de usuários com gestão de WhatsApp |
| Configurações | admin | Template de mensagem, configurações gerais |

### Navegação mobile

Em telas < 768px a sidebar é ocultada e uma barra de navegação fixa aparece na parte inferior (bottom nav), com os atalhos principais e indicador de notificações.

---

## Testes

32 testes de integração usando `node:test` (built-in, sem dependências extras).

```bash
npm test
```

Cada suite usa um **banco de dados SQLite em arquivo temporário isolado** (variável `DB_PATH`) e inicia o servidor em uma porta aleatória, sem conflito com o servidor de produção.

### Cobertura

| Suite | Testes | O que cobre |
|---|---|---|
| `auth.test.js` | 8 | Login, CSRF, sessão, rotas protegidas |
| `quotations.test.js` | 13 | CRUD de cotações, alteração de status, audit log |
| `admin.test.js` | 11 | CRUD de usuários, validação de senha, audit log global |

---

## Logging

Logging estruturado em **JSON via Pino** — substitui Morgan e todos os `console.log`.

```bash
# Em produção, visualizar logs formatados:
pm2 logs cotou | pino-pretty

# Ver apenas erros:
pm2 logs cotou | jq 'select(.level >= 50)'
```

Configuração via variável de ambiente `LOG_LEVEL` (`silent`, `error`, `warn`, `info`, `debug`). Em testes, o nível é forçado para `silent`.

---

## Scripts e Manutenção

```bash
# Iniciar em produção
npm start

# Desenvolvimento com auto-reload
npm run dev

# Aplicar migrações pendentes
npm run migrate

# Criar usuários iniciais (idempotente)
node scripts/seed-admin.js

# Rodar testes
npm test
```

### Comandos PM2 úteis

```bash
pm2 status              # status dos processos
pm2 logs cotou          # logs em tempo real
pm2 restart cotou       # reiniciar
pm2 reload cotou        # reload sem downtime
```

---

## Nginx e HTTPS

```nginx
server {
    server_name cotou.darlley.dev.br;

    location = / { return 302 /prototype; }

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host       $host;
        proxy_set_header   X-Real-IP  $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate     /etc/letsencrypt/live/cotou.darlley.dev.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cotou.darlley.dev.br/privkey.pem;
}

server {
    listen 80;
    server_name cotou.darlley.dev.br;
    return 301 https://$host$request_uri;
}
```

**Renovação TLS automática** via Certbot (cron):
```bash
certbot --nginx -d cotou.darlley.dev.br
```

---

## Backup

```bash
# Backup manual do banco
cp data/cotou.db backups/cotou-$(date +%Y%m%d-%H%M).db

# Backup agendado (crontab)
0 3 * * * cp /opt/cotou/data/cotou.db /opt/cotou/backups/cotou-$(date +\%Y\%m\%d).db
```

---

## Segurança — Checklist de Produção

- [x] `SESSION_SECRET` longo e aleatório no `.env`
- [x] `COOKIE_SECURE=true` com HTTPS ativo
- [x] CSRF em todas as mutations
- [x] Helmet (CSP, HSTS, X-Frame-Options)
- [x] Rate limiting em endpoints críticos
- [x] CORS restrito ao domínio de produção
- [x] Evolution API acessível apenas via `localhost`
- [x] Senhas com validação de complexidade
- [x] Sessões com TTL e limpeza automática

---

## Licença

Uso interno. Todos os direitos reservados.
