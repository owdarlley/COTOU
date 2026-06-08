# Guia VPS — COTOU

## Dados de acesso

| Item | Valor |
|------|-------|
| IP | 143.95.214.126 |
| Porta SSH | 22022 |
| Usuário | root |
| Painel web | http://143.95.214.126:9090 |

---

## 1. Acessar a VPS

### Via CMD / Terminal
```bash
ssh root@143.95.214.126 -p 22022
```
> No CMD do Windows, use **clique direito** para colar.

### Via painel web (Cockpit)
Abra no navegador: **http://143.95.214.126:9090**
- Usuário: `root`
- Senha: sua senha SSH

Após logar, clique em **Terminal** no menu lateral.

---

## 2. Gerenciar o servidor COTOU

```bash
# Ver status do processo
pm2 list

# Ver logs em tempo real
pm2 logs cotou

# Reiniciar servidor
pm2 restart cotou

# Parar servidor
pm2 stop cotou
```

---

## 3. Atualizar o código

```bash
cd /opt/cotou
git checkout src/app.js          # descarta mudanças locais se houver conflito
git pull origin claude/parts-quotation-system-V7Nz1
pm2 restart cotou
```

---

## 4. Verificar URL do Cloudflare Tunnel

O tunnel expõe a API via HTTPS. O URL muda toda vez que o serviço reinicia.

```bash
journalctl -u cotou-tunnel --no-pager -n 100 | grep trycloudflare
```

Após obter o novo URL:
1. Acesse **github.com/owdarlley/COTOU → Settings → Secrets and variables → Actions**
2. Edite **VPS_API_URL** com o novo URL
3. Acesse **Actions → Deploy Prototype to GitHub Pages → Run workflow**

---

## 5. Verificar Evolution API (WhatsApp)

```bash
# Testar se está online
curl -s http://172.19.0.3:8080/

# Listar instâncias criadas
APIKEY=$(grep WHATSAPP_API_KEY /opt/cotou/.env | cut -d= -f2)
curl -s -H "apikey: $APIKEY" http://172.19.0.3:8080/instance/fetchInstances
```

---

## 6. Ver e editar o .env

```bash
cat /opt/cotou/.env
nano /opt/cotou/.env
```

Após editar o .env:
```bash
pm2 restart cotou --update-env
```

---

## 7. Usar o Claude Code na VPS

```bash
cd /opt/cotou
claude
```

Para rodar sem pedir permissão a cada comando:
```bash
claude --dangerously-skip-permissions
```

---

## 8. Serviços do sistema

```bash
# Cloudflare Tunnel
systemctl status cotou-tunnel
systemctl restart cotou-tunnel

# Nginx
systemctl status nginx
systemctl reload nginx

# Docker (Evolution API)
docker ps
docker start traefik   # se o painel da Evolution API cair
```

---

## 9. URLs do projeto

| Serviço | URL |
|---------|-----|
| Frontend (GitHub Pages) | https://owdarlley.github.io/COTOU/ |
| API via tunnel | https://complexity-atmosphere-prospects-reserve.trycloudflare.com |
| Evolution API (interno) | http://172.19.0.3:8080 |
| Cockpit (painel VPS) | http://143.95.214.126:9090 |

> **Atenção:** O URL do Cloudflare Tunnel muda sempre que o serviço `cotou-tunnel` reinicia. Verifique com o comando do passo 4.

---

## 10. Credenciais do sistema COTOU

> As senhas estão definidas no seed do banco. Consulte o `.env` para `ADMIN_EMAIL` e `ADMIN_PASSWORD`.

| Email | Perfil |
|-------|--------|
| admin@suaempresa.com.br | Admin |
| admin@cotou.com.br | Admin |
| vendas@cotou.com.br | Vendas |
| compras@cotou.com.br | Compras |
