# COTOU — ERP de Cotação de Peças Automotivas

Sistema interno para comunicação entre o setor de **Vendas** e o setor de **Compras** de uma autopeças. O vendedor abre uma cotação, o comprador recebe alerta em tempo real via Socket.io, cota os valores e o vendedor envia o resultado ao cliente via WhatsApp.

**Produção:** https://cotou.darlley.dev.br

---

## Stack Técnica

| Tecnologia | Uso |
|---|---|
| Node.js 22+ | Runtime |
| Express 4.x | Framework HTTP |
| SQLite (node:sqlite) | Banco de dados |
| Socket.io 4.x | Notificações em tempo real |
| express-session + session-file-store | Autenticação por sessão |
| bcryptjs | Hash de senhas |
| Evolution API 2.3.7 (Docker) | WhatsApp via Baileys |
| Nginx | Proxy reverso + HTTPS |
| PM2 | Gerenciador de processos |
| GitHub Pages | Frontend estático |

---

## Arquitetura

```
Browser (cotou.darlley.dev.br)
        │
        ▼
     Nginx (443/HTTPS + Let's Encrypt)
        │
        ▼
   Node.js / Express (porta 3000, PM2)
        │              │
        ▼              ▼
   SQLite DB     Evolution API
  (data/cotou.db)  (localhost:8080, Docker)
```

O frontend é uma SPA em React (sem build — JSX via Babel CDN) servida em `/prototype`. O backend é uma API REST + Socket.io.

---

## Instalação em VPS

### Pré-requisitos

- VPS Linux (testado em RHEL/CentOS 9)
- Node.js 22+
- PM2 (`npm i -g pm2`)
- Nginx
- Certbot
- Docker + Docker Compose
- Evolution API rodando em `localhost:8080`

### Passo a passo

```bash
# 1. Clonar o repositório
git clone https://github.com/owdarlley/COTOU
cd COTOU

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
nano .env

# 4. Criar usuários iniciais
node scripts/seed-admin.js

# 5. Iniciar com PM2
pm2 start server.js --name cotou
pm2 save
pm2 startup
```

### Desenvolvimento local

```bash
npm run dev   # auto-reload com nodemon
```

Servidor disponível em `http://localhost:3000` — frontend em `http://localhost:3000/prototype`.

---

## Variáveis de Ambiente (`.env`)

```env
NODE_ENV=production
PORT=3000

# Sessão
SESSION_SECRET=string-longa-e-aleatoria

# Banco de dados
DB_PATH=./data/cotou.db

# CORS — URL do frontend externo (GitHub Pages)
FRONTEND_URL=https://owdarlley.github.io

# URL pública da aplicação (usada em links de aprovação enviados por WhatsApp)
APP_URL=https://cotou.darlley.dev.br

# Habilitar cookie Secure (obrigatório em produção com HTTPS)
COOKIE_SECURE=true

# API de consulta de placa
PLATE_API_BASE_URL=https://wdapi2.com.br
PLATE_API_TOKEN=seu_token_aqui

# Evolution API (WhatsApp)
WHATSAPP_API_URL=http://localhost:8080
WHATSAPP_API_KEY=sua_api_key_aqui

# Usuário admin inicial (usado pelo seed-admin.js)
ADMIN_EMAIL=admin@suaempresa.com.br
ADMIN_PASSWORD=admin123
```

---

## Configuração Nginx

```nginx
server {
    server_name cotou.darlley.dev.br;

    location = / {
        return 302 /prototype;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl; # gerenciado pelo Certbot
    ssl_certificate /etc/letsencrypt/live/cotou.darlley.dev.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cotou.darlley.dev.br/privkey.pem;
}

server {
    if ($host = cotou.darlley.dev.br) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name cotou.darlley.dev.br;
}
```

HTTPS gerado com `certbot --nginx -d cotou.darlley.dev.br` — renova automaticamente.

---

## Evolution API (WhatsApp)

A Evolution API roda em Docker (`/opt/evolution-api/docker-compose.yml`). A porta `8080` é exposta apenas para `localhost`:

```yaml
ports:
  - "127.0.0.1:8080:8080"
```

Isso garante que o endereço `http://localhost:8080` nunca muda, independente de reinicializações do container.

Cada usuário tem sua própria instância WhatsApp (`cotou-user-<id>`). O fluxo de conexão:

1. Admin cria o usuário → instância criada automaticamente
2. Usuário acessa o painel → clica em **Conectar** → escaneia QR code
3. Ao **Desconectar**, apenas o logout é enviado ao WhatsApp — a instância permanece na Evolution API e o QR fica disponível imediatamente para reconexão

---

## Estrutura de Pastas

```
COTOU/
├── server.js                    # Ponto de entrada — HTTP server + Socket.io
├── src/
│   ├── app.js                   # Express app — middlewares, rotas, 404/500
│   ├── config/
│   │   ├── database.js          # Conexão SQLite + runMigrations()
│   │   └── socket.js            # Singleton do Socket.io
│   ├── middleware/
│   │   ├── auth.js              # requireAuth, requireRole
│   │   └── locals.js            # Variáveis locais para templates
│   ├── models/
│   │   ├── Customer.js
│   │   ├── Notification.js
│   │   ├── PartsCatalog.js
│   │   ├── Quotation.js
│   │   ├── QuotationItem.js
│   │   ├── Settings.js
│   │   ├── Supplier.js
│   │   ├── User.js
│   │   └── Vehicle.js
│   ├── routes/
│   │   ├── admin.js             # /admin/*
│   │   ├── api.js               # /api/* (placa, whatsapp, notificações)
│   │   ├── aprovacao.js         # /aprovar/:token (público)
│   │   ├── auth.js              # /auth/*
│   │   ├── notifications.js     # /notificacoes/*
│   │   ├── parts.js             # /pecas/*
│   │   └── quotations.js        # /cotacoes/*
│   └── services/
│       ├── notificationService.js
│       ├── plateService.js
│       ├── quoteNumberService.js
│       └── whatsappService.js
├── migrations/                  # SQL aplicado automaticamente na inicialização
├── scripts/
│   ├── seed-admin.js            # Cria usuários iniciais
│   └── setup-vps.sh             # Script de setup completo do VPS
├── public/
│   ├── aprovar.html             # Página de aprovação para o cliente (link do WhatsApp)
│   └── prototype/
│       └── index.html           # SPA principal (React + Babel CDN, ~300KB)
├── docs/
│   └── guia-vps.md
├── data/
│   └── cotou.db                 # Banco SQLite (criado automaticamente)
├── .env
└── .env.example
```

---

## Seeds

### Usuários iniciais

```bash
node scripts/seed-admin.js
```

Cria (se não existirem) os usuários definidos via `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) mais dois usuários padrão de vendas e compras com senha `demo1234`.

---

## Autenticação

A API usa **sessões HTTP** com cookie `connect.sid`.

1. `POST /auth/login` com `{ email, password }`
2. Servidor define cookie de sessão (`HttpOnly`, `Secure` em produção, `SameSite=none`)
3. Todas as requisições subsequentes enviam o cookie automaticamente
4. `POST /auth/logout` para encerrar

---

## Endpoints

### Saúde

#### `GET /health`
Sem autenticação.
```json
{ "ok": true, "uptime": 123.45 }
```

---

### Autenticação (`/auth`)

#### `POST /auth/login`
```json
{ "email": "vendas@cotou.com.br", "password": "senha" }
```
```json
{ "ok": true, "user": { "id": 2, "name": "Vendas", "role": "vendas" } }
```

#### `POST /auth/logout`
```json
{ "ok": true }
```

#### `GET /auth/me`
Retorna usuário da sessão.

#### `GET /auth/users`
Lista usuários ativos (sem autenticação — usado na tela de login para acesso rápido).
```json
{ "ok": true, "users": [{ "id": 1, "name": "Admin", "email": "...", "role": "admin" }] }
```

---

### Dashboard

#### `GET /`
**Auth:** Sim
```json
{
  "ok": true,
  "user": { "id": 1, "name": "Admin", "role": "admin", "email": "..." },
  "statusMap": { "pendente": 3, "em_cotacao": 1, "cotado": 2 },
  "recentQuotations": [],
  "unreadCount": 2
}
```

---

### Cotações (`/cotacoes`)

Acesso filtrado por role: vendas vê apenas suas cotações; compras e admin veem todas.

| Endpoint | Role | Descrição |
|---|---|---|
| `GET /cotacoes` | Todos | Lista paginada com filtro de status |
| `POST /cotacoes` | vendas, admin | Cria cotação com peças e foto opcional |
| `GET /cotacoes/:id` | Todos | Detalhe + itens + totais |
| `POST /cotacoes/:id/status` | compras, admin | Altera status (`em_cotacao`, `cancelado`) |
| `POST /cotacoes/:id/responder` | compras, admin | Preenche valores e marca como cotado |
| `POST /cotacoes/:id/resposta-cliente` | vendas, admin | Registra aprovação/recusa do cliente |
| `POST /cotacoes/:id/peca-chegou` | compras, admin | Confirma chegada da peça |

---

### Peças / Catálogo (`/pecas`)

| Endpoint | Role | Descrição |
|---|---|---|
| `GET /pecas` | Todos | Lista com busca e paginação |
| `POST /pecas` | compras, admin | Cria peça |
| `PUT /pecas/:id` | compras, admin | Atualiza peça |
| `DELETE /pecas/:id` | compras, admin | Remove peça |

---

### Notificações (`/notificacoes`)

| Endpoint | Descrição |
|---|---|
| `GET /notificacoes` | Lista paginada |
| `POST /notificacoes/marcar-todas` | Marca todas como lidas |

---

### Administração (`/admin`)

**Role:** `admin`

| Endpoint | Descrição |
|---|---|
| `GET /admin/usuarios` | Lista todos os usuários |
| `POST /admin/usuarios` | Cria usuário (cria instância WhatsApp automaticamente) |
| `PUT /admin/usuarios/:id` | Atualiza dados do usuário |
| `POST /admin/usuarios/:id/ativar` | Ativa usuário |
| `POST /admin/usuarios/:id/desativar` | Desativa usuário |

---

### API Utilitária (`/api`)

| Endpoint | Descrição |
|---|---|
| `GET /api/placa/:plate` | Consulta veículo pela placa (API externa) |
| `GET /api/clientes` | Autocomplete de clientes |
| `GET /api/fornecedores` | Lista fornecedores |
| `GET /api/pecas` | Autocomplete de peças |
| `GET /api/notificacoes` | Últimas 10 notificações (badge/dropdown) |
| `POST /api/notificacoes/:id/lida` | Marca notificação como lida |

#### WhatsApp

| Endpoint | Descrição |
|---|---|
| `POST /api/whatsapp/instancia/criar` | Cria instância na Evolution API |
| `GET /api/whatsapp/instancia/status` | Estado da conexão (sincroniza DB) |
| `GET /api/whatsapp/instancia/qrcode` | QR code para conexão |
| `DELETE /api/whatsapp/instancia/desconectar` | Faz logout (mantém instância, volta a aguardar QR) |
| `POST /api/whatsapp/enviar/:id` | Envia cotação ao cliente |
| `POST /api/whatsapp/consultar-fornecedor` | Envia consulta de preço a fornecedor |

---

### Aprovação pública (`/aprovar`)

#### `GET /aprovar/:token`
Página HTML para o cliente aprovar/recusar a cotação. Sem autenticação. Link enviado via WhatsApp junto com a cotação.

---

## Socket.io

```js
const socket = io('https://cotou.darlley.dev.br', { withCredentials: true });
socket.emit('registrar', { userId: 2 });

socket.on('nova_notificacao', (notification) => {
  // { id, type, title, message, quotationId, created_at }
});
```

---

## Fluxo de Negócio

### Ciclo de vida de uma cotação

```
vendas cria        compras assume       compras responde
 pendente    →      em_cotacao    →         cotado
                                              ↓
                                         peca_chegou
                        ↘
                      cancelado (qualquer etapa)
```

### Passo a passo

1. **Vendas** cria cotação com dados do cliente, veículo e peças
2. **Compras** recebe notificação em tempo real (Socket.io), assume e preenche valores
3. **Vendas** recebe notificação, envia cotação ao cliente via WhatsApp
4. **Cliente** recebe link para aprovação rápida
5. **Compras** confirma chegada da peça

---

## Papéis (roles)

| Role | Permissões |
|---|---|
| `vendas` | Criar cotações, ver suas cotações, registrar resposta do cliente, enviar WhatsApp |
| `compras` | Ver todas as cotações, alterar status, responder, marcar chegada, gerenciar catálogo |
| `admin` | Tudo acima + gerenciar usuários + painel administrativo |

---

## Respostas de Erro

| HTTP | Quando |
|---|---|
| 400 | Dados inválidos ou ausentes |
| 401 | Não autenticado |
| 403 | Sem permissão para a operação |
| 404 | Recurso não encontrado |
| 409 | Conflito (e-mail ou código já cadastrado) |
| 500 | Erro interno |

```json
{ "ok": false, "error": "Descrição do erro" }
```

---

## Backup

```bash
cp data/cotou.db backups/cotou-$(date +%Y%m%d).db
```
