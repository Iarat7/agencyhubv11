
# Guia de Deployment - VPS

Este guia detalha como rodar a aplicação em sua própria VPS sem dependências do Replit.

## Pré-requisitos

### Sistema Operacional
- Ubuntu 20.04+ ou CentOS 8+
- Acesso root ou sudo

### Softwares Necessários
- Node.js 20+
- PostgreSQL 14+
- Nginx (opcional, para proxy reverso)
- PM2 (para gerenciamento de processos)

## 1. Preparação do Servidor

### Atualizar o sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### Instalar Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Instalar PostgreSQL
```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Instalar PM2 globalmente
```bash
sudo npm install -g pm2
```

## 2. Configuração do Banco de Dados

### Criar usuário e banco
```bash
sudo -u postgres psql
```

No PostgreSQL:
```sql
CREATE USER agencyhub WITH PASSWORD 'sua_senha_forte_aqui';
CREATE DATABASE agencyhub_db OWNER agencyhub;
GRANT ALL PRIVILEGES ON DATABASE agencyhub_db TO agencyhub;
\q
```

### Configurar acesso remoto (se necessário)
Editar `/etc/postgresql/14/main/postgresql.conf`:
```
listen_addresses = '*'
```

Editar `/etc/postgresql/14/main/pg_hba.conf`:
```
host    all             all             0.0.0.0/0               md5
```

Reiniciar PostgreSQL:
```bash
sudo systemctl restart postgresql
```

## 3. Preparação da Aplicação

### Clonar ou enviar arquivos
```bash
mkdir -p /var/www/agencyhub
cd /var/www/agencyhub
# Envie seus arquivos aqui ou clone do git
```

### Instalar dependências
```bash
npm install
```

### Configurar variáveis de ambiente
Criar arquivo `.env`:
```env
NODE_ENV=production
DATABASE_URL=postgresql://agencyhub:sua_senha_forte_aqui@localhost:5432/agencyhub_db
SESSION_SECRET=sua_chave_secreta_muito_forte_aqui_32_chars_min
OPENAI_API_KEY=sua_chave_openai_aqui
PORT=5000
```

### Executar migrações do banco
```bash
npm run db:push
```

### Build da aplicação
```bash
npm run build
```

## 4. Configuração do PM2

### Criar arquivo de configuração do PM2
Criar `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'agencyhub',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/agencyhub/error.log',
    out_file: '/var/log/agencyhub/out.log',
    log_file: '/var/log/agencyhub/combined.log',
    time: true
  }]
};
```

### Criar diretório de logs
```bash
sudo mkdir -p /var/log/agencyhub
sudo chown $(whoami):$(whoami) /var/log/agencyhub
```

### Iniciar aplicação
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 5. Configuração do Nginx (Opcional)

### Instalar Nginx
```bash
sudo apt install nginx -y
```

### Configurar site
Criar `/etc/nginx/sites-available/agencyhub`:
```nginx
server {
    listen 80;
    server_name seu_dominio.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Habilitar site
```bash
sudo ln -s /etc/nginx/sites-available/agencyhub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 6. SSL com Let's Encrypt (Opcional)

### Instalar Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### Obter certificado
```bash
sudo certbot --nginx -d seu_dominio.com
```

## 7. Firewall

### Configurar UFW
```bash
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 8. Backup e Monitoramento

### Script de backup do banco
Criar `backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/backup/agencyhub"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

pg_dump -h localhost -U agencyhub agencyhub_db > "$BACKUP_DIR/backup_$DATE.sql"

# Manter apenas os últimos 7 backups
find $BACKUP_DIR -name "backup_*.sql" -type f -mtime +7 -delete
```

### Agendar backup
```bash
chmod +x backup.sh
crontab -e
```

Adicionar:
```
0 2 * * * /var/www/agencyhub/backup.sh
```

### Monitoramento com PM2
```bash
pm2 monit
```

## 9. Comandos Úteis

### Verificar status
```bash
pm2 status
pm2 logs agencyhub
```

### Reiniciar aplicação
```bash
pm2 restart agencyhub
```

### Atualizar aplicação
```bash
git pull # ou upload dos novos arquivos
npm install
npm run build
pm2 restart agencyhub
```

### Verificar logs
```bash
tail -f /var/log/agencyhub/combined.log
```

## 10. Solução de Problemas

### Problemas comuns
1. **Erro de conexão com banco**: Verificar credenciais em `.env`
2. **Porta ocupada**: Alterar PORT em `.env`
3. **Erro de permissão**: Verificar ownership dos arquivos
4. **Erro de build**: Verificar dependências e versão do Node.js

### Comandos de diagnóstico
```bash
# Verificar se o banco está rodando
sudo systemctl status postgresql

# Verificar se a aplicação está escutando
netstat -tlnp | grep :5000

# Verificar logs do sistema
journalctl -u nginx -f
```

## Estrutura de Arquivos Final

```
/var/www/agencyhub/
├── dist/                 # Build da aplicação
├── node_modules/         # Dependências
├── client/              # Código fonte frontend
├── server/              # Código fonte backend
├── shared/              # Código compartilhado
├── .env                 # Variáveis de ambiente
├── ecosystem.config.js  # Configuração PM2
├── backup.sh           # Script de backup
└── package.json        # Dependências npm
```

## Segurança

1. **Sempre usar HTTPS em produção**
2. **Manter sistema atualizado**
3. **Usar senhas fortes**
4. **Fazer backups regulares**
5. **Monitorar logs regularmente**
6. **Configurar firewall adequadamente**

Este guia fornece uma base sólida para deployment em produção. Ajuste conforme suas necessidades específicas.
