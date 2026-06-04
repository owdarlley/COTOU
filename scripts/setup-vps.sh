#!/bin/bash
# Setup script para VPS — COTOU + Evolution API
# Uso: bash setup-vps.sh
# Testado em Ubuntu 22.04/24.04

set -e
REPO="https://github.com/owdarlley/COTOU.git"
BRANCH="claude/parts-quotation-system-V7Nz1"
APP_DIR="/opt/cotou"
NODE_VERSION="20"

echo "========================================"
echo "  COTOU — Setup VPS"
echo "========================================"

# ── 1. Dependências do sistema ────────────────────────────────────────────────
apt-get update -qq
apt-get install -y -qq curl git nginx

# ── 2. Node.js LTS ───────────────────────────────────────────────────────────
if ! command -v node &>/dev/null || [[ $(node -e "process.version.split('.')[0].slice(1)") -lt $NODE_VERSION ]]; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y nodejs
fi
echo "Node: $(node --version) | NPM: $(npm --version)"

# ── 3. PM2 ───────────────────────────────────────────────────────────────────
npm install -g pm2 --quiet

# ── 4. Clonar / atualizar repositório ────────────────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  echo "Atualizando repositório..."
  git -C $APP_DIR fetch origin $BRANCH
  git -C $APP_DIR checkout $BRANCH
  git -C $APP_DIR pull origin $BRANCH
else
  echo "Clonando repositório..."
  git clone --branch $BRANCH $REPO $APP_DIR
fi

cd $APP_DIR

# ── 5. Instalar dependências ──────────────────────────────────────────────────
npm install --omit=dev --quiet

# ── 6. Configurar .env de produção ───────────────────────────────────────────
if [ ! -f "$APP_DIR/.env" ]; then
  VPS_IP=$(curl -s ifconfig.me)
  SESSION_SECRET=$(openssl rand -hex 32)

  cat > $APP_DIR/.env <<EOF
NODE_ENV=production
PORT=3000
SESSION_SECRET=$SESSION_SECRET

DB_PATH=./data/cotou.db

PLATE_API_BASE_URL=https://wdapi2.com.br
PLATE_API_TOKEN=seu_token_aqui

# Ajuste a porta se a Evolution API estiver em outra porta
WHATSAPP_API_URL=http://localhost:8080
WHATSAPP_API_KEY=COLOQUE_SUA_CHAVE_EVOLUTION_API_AQUI
WHATSAPP_INSTANCE_NAME=cotou-default

APP_URL=http://$VPS_IP

ADMIN_EMAIL=admin@suaempresa.com.br
ADMIN_PASSWORD=admin123
EOF
  echo ".env criado em $APP_DIR/.env — revise antes de usar em produção!"
else
  echo ".env já existe, mantendo configuração atual."
fi

# ── 7. Criar pasta de dados e rodar migrations ────────────────────────────────
mkdir -p $APP_DIR/data
npm run migrate

# ── 8. Iniciar / reiniciar via PM2 ───────────────────────────────────────────
pm2 delete cotou 2>/dev/null || true
pm2 start server.js --name cotou --cwd $APP_DIR
pm2 save
pm2 startup | tail -1 | bash 2>/dev/null || true

# ── 9. Nginx — proxy reverso ──────────────────────────────────────────────────
VPS_IP=$(curl -s ifconfig.me)

cat > /etc/nginx/sites-available/cotou <<EOF
server {
    listen 80;
    server_name $VPS_IP _;

    # CORS para GitHub Pages
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;

    if (\$request_method = OPTIONS) {
        return 204;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/cotou /etc/nginx/sites-enabled/cotou
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── 10. Cloudflare Tunnel (HTTPS gratuito, sem domínio) ───────────────────────
echo ""
echo "========================================"
echo "  HTTPS via Cloudflare Tunnel"
echo "========================================"

if ! command -v cloudflared &>/dev/null; then
  curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb
  dpkg -i /tmp/cloudflared.deb
fi

# Cria serviço systemd para tunnel persistente
cat > /etc/systemd/system/cotou-tunnel.service <<EOF
[Unit]
Description=Cloudflare Tunnel — COTOU
After=network.target

[Service]
ExecStart=/usr/local/bin/cloudflared tunnel --url http://localhost:3000 --no-autoupdate
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable cotou-tunnel
systemctl restart cotou-tunnel

sleep 3
echo ""
echo "URL HTTPS do tunnel (copie para o secret VPS_API_URL no GitHub):"
journalctl -u cotou-tunnel --no-pager -n 30 | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1

echo ""
echo "========================================"
echo "  Setup concluído!"
echo "========================================"
echo "  API local:  http://$VPS_IP"
echo "  PM2 status: pm2 list"
echo "  Logs:       pm2 logs cotou"
echo "========================================"
