# COTOU — Sistema de Cotação de Peças Automotivas

Sistema interno para comunicação entre o setor de **Vendas** e o setor de **Compras** de uma autopeças. O vendedor abre uma cotação, o comprador recebe alerta em tempo real, cota os valores e o vendedor envia o resultado ao cliente via WhatsApp.

---

## Requisitos

- **Node.js** versão 22 ou superior → [nodejs.org](https://nodejs.org) (baixe a versão LTS)
- **Git** → [git-scm.com](https://git-scm.com)
- Computador ligado e conectado à rede enquanto o sistema estiver em uso

---

## Instalação

```bash
# 1. Baixar o projeto
git clone https://github.com/owdarlley/COTOU
cd COTOU
git checkout claude/parts-quotation-system-V7Nz1

# 2. Instalar dependências
npm install

# 3. Criar arquivo de configuração
copy .env.example .env

# 4. Iniciar o sistema
npm start
```

Acesse no navegador: **http://localhost:3000**

---

## Usuários Iniciais

Criados automaticamente na primeira execução:

| Nome | E-mail | Senha | Setor |
|---|---|---|---|
| Administrador | admin@cotou.com.br | admin123 | Admin |
| João Vendas | vendas@cotou.com.br | 123456 | Vendas |
| Maria Compras | compras@cotou.com.br | 123456 | Compras |

> **Importante:** Troque as senhas após o primeiro acesso em **Admin → Usuários**.

---

## Como Usar

### Setor de Vendas

1. Faça login com usuário do setor **vendas**
2. Clique em **Nova Cotação**
3. Preencha os dados do cliente (nome e telefone)
4. Digite a **placa do veículo** e clique na lupa — os dados são preenchidos automaticamente (requer token da API de placa configurado)
5. Adicione as peças desejadas (código + nome). Se a peça estiver no catálogo, aparece autocomplete
6. Clique em **Enviar para Compras**
7. O setor de compras recebe uma notificação em tempo real (sino no topo da tela)
8. Quando a cotação for respondida, você recebe uma notificação
9. Com a cotação respondida, clique em **Enviar pelo WhatsApp** para notificar o cliente

### Setor de Compras

1. Faça login com usuário do setor **compras**
2. Ao receber nova cotação, clique no sino de notificações
3. Abra a cotação e clique em **Em Cotação** para assumir
4. Preencha para cada peça: preço unitário, total, mão de obra, prazo de entrega e fornecedor
5. Clique em **Salvar e Notificar Vendedor** — o vendedor é notificado automaticamente
6. Quando a peça chegar, clique em **Peça Chegou** — o vendedor é notificado para avisar o cliente

### Administrador

- Cadastrar e gerenciar usuários em **Usuários**
- Gerenciar o catálogo de peças em **Catálogo de Peças**

---

## Fluxo de Status das Cotações

```
Aguardando  →  Em Cotação  →  Cotado  →  Peça Chegou
(vendas cria)  (compras assume)  (compras cota)  (compras confirma chegada)
```

| Status | Cor | Descrição |
|---|---|---|
| Aguardando | Amarelo | Aguardando o setor de compras |
| Em Cotação | Azul | Compras está buscando preços |
| Cotado | Verde | Valores preenchidos, pronto para enviar ao cliente |
| Peça Chegou | Roxo | Peça disponível para retirada/instalação |

---

## Configuração das APIs (arquivo `.env`)

```env
# Porta do servidor (padrão: 3000)
PORT=3000

# Chave secreta da sessão (troque em produção)
SESSION_SECRET=mude-para-uma-string-longa-e-aleatoria

# Banco de dados
DB_PATH=./data/cotou.db

# API de consulta de placa (cadastre em wdapi2.com.br)
PLATE_API_BASE_URL=https://wdapi2.com.br
PLATE_API_TOKEN=seu_token_aqui

# Evolution API — WhatsApp (precisa estar instalada e rodando)
WHATSAPP_API_URL=http://localhost:8080
WHATSAPP_API_KEY=sua_api_key_aqui
WHATSAPP_INSTANCE_NAME=cotou-instance
```

### Como obter o token de placa

1. Acesse [wdapi2.com.br](https://wdapi2.com.br) ou [apiplacas.com.br](https://apiplacas.com.br)
2. Crie uma conta gratuita
3. Copie o token gerado e cole no `.env`

### Como configurar o WhatsApp (Evolution API)

A Evolution API é um programa gratuito que conecta ao WhatsApp pelo celular. Instalação:

```bash
# Requer Docker instalado
docker run -d \
  --name evolution-api \
  -p 8080:8080 \
  atendai/evolution-api:latest
```

Após instalar, acesse `http://localhost:8080` para conectar seu número de WhatsApp.

---

## Acessar de outros dispositivos (celular, tablet)

Para acessar o sistema de outros dispositivos na **mesma rede Wi-Fi**:

1. No computador onde o servidor está rodando, abra o terminal e execute:
   ```cmd
   ipconfig
   ```
2. Anote o **Endereço IPv4** (ex: `192.168.1.10`)
3. No celular ou tablet, acesse: `http://192.168.1.10:3000`

> O sistema é responsivo e funciona bem em telas de celular.

---

## Estrutura do Projeto

```
COTOU/
├── server.js              # Ponto de entrada, Socket.io, seed de usuários
├── src/
│   ├── app.js             # Configuração Express, middlewares, rotas
│   ├── config/
│   │   ├── database.js    # Conexão SQLite + migrations automáticas
│   │   └── socket.js      # Instância Socket.io
│   ├── models/            # Acesso ao banco de dados
│   ├── routes/            # Rotas HTTP
│   ├── services/          # Integrações externas (WhatsApp, Placa)
│   └── middleware/        # Autenticação, injeção de variáveis
├── views/                 # Templates EJS (interface)
├── public/                # CSS, JavaScript do cliente
├── migrations/            # Schema do banco de dados
├── data/                  # Banco SQLite (criado automaticamente)
└── .env                   # Configurações locais (não vai para o Git)
```

---

## Tecnologias Utilizadas

| Tecnologia | Uso |
|---|---|
| Node.js + Express | Servidor web |
| EJS | Templates HTML |
| SQLite (node:sqlite) | Banco de dados |
| Socket.io | Notificações em tempo real |
| Bootstrap 5 | Interface visual |
| bcryptjs | Criptografia de senhas |
| Evolution API | Envio de WhatsApp |
| API de Placas | Consulta de dados do veículo |

---

## Backup dos Dados

O banco de dados fica em `data/cotou.db`. Para fazer backup, basta copiar este arquivo:

```cmd
copy data\cotou.db backup\cotou-%date:~-4,4%%date:~-10,2%%date:~-7,2%.db
```

---

## Suporte

Em caso de problemas, verifique:
1. Node.js versão 22+ instalado (`node --version`)
2. Arquivo `.env` criado e preenchido
3. Porta 3000 não está sendo usada por outro programa
