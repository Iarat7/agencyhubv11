
#!/bin/bash

# Script de Deploy Automatizado - AgencyHub VPS
# Configurado para app.bushdigital.com.br na porta 9000

set -e

echo "🚀 Iniciando deploy automatizado do AgencyHub..."

# Configurações
APP_NAME="agencyhub"
APP_PORT=9000
DOMAIN="app.bushdigital.com.br"
APP_DIR="/var/www/$APP_NAME"
DB_NAME="${APP_NAME}_db"
DB_USER="$APP_NAME"
DB_PASS=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 48)

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se está rodando como root
if [[ $EUID -ne 0 ]]; then
   print_error "Este script deve ser executado como root (use sudo)"
   exit 1
fi

print_step "Atualizando sistema..."
apt update && apt upgrade -y

print_step "Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

print_step "Instalando PostgreSQL..."
apt install -y postgresql postgresql-contrib

print_step "Instalando Nginx e outras dependências..."
apt install -y nginx certbot python3-certbot-nginx ufw git

print_step "Instalando PM2 globalmente..."
npm install -g pm2

print_step "Configurando PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql

# Configurar banco de dados
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

print_step "Criando diretório da aplicação..."
mkdir -p $APP_DIR
cd $APP_DIR

print_step "Baixando código da aplicação..."
if [ -d ".git" ]; then
    git pull
else
    # Se não tiver git, você pode copiar os arquivos manualmente
    print_warning "Copie os arquivos da aplicação para $APP_DIR"
    read -p "Pressione Enter quando terminar de copiar os arquivos..."
fi

print_step "Instalando dependências da aplicação..."
npm install

print_step "Criando arquivo de configuração .env..."
cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME

# Session Security
SESSION_SECRET=$SESSION_SECRET

# OpenAI API (configure manualmente se necessário)
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
NODE_ENV=production
PORT=$APP_PORT

# Billing Configuration (configure se necessário)
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret

# PagSeguro Configuration (configure se necessário)
PAGSEGURO_EMAIL=your_pagseguro_email
PAGSEGURO_TOKEN=your_pagseguro_token

# SMTP Configuration (configure se necessário)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@bushdigital.com.br

# Analytics and Notifications
WEBHOOK_URL=https://$DOMAIN/api/webhooks/stripe
NOTIFICATION_EMAIL=admin@bushdigital.com.br
EOF

print_step "Criando configuração PM2 personalizada..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: $APP_PORT
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: $APP_PORT
    },
    error_file: '/var/log/$APP_NAME/error.log',
    out_file: '/var/log/$APP_NAME/out.log',
    log_file: '/var/log/$APP_NAME/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=1024',
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 8000,
    reload_delay: 1000,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

print_step "Criando diretório de logs..."
mkdir -p /var/log/$APP_NAME
chown $(whoami):$(whoami) /var/log/$APP_NAME

print_step "Fazendo build da aplicação..."
npm run build

print_step "Configurando Nginx..."
cat > /etc/nginx/sites-available/$APP_NAME << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Proxy para aplicação
    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Logs
    access_log /var/log/nginx/${APP_NAME}_access.log;
    error_log /var/log/nginx/${APP_NAME}_error.log;
}
EOF

# Habilitar site
ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar configuração do Nginx
nginx -t

print_step "Configurando firewall..."
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow $APP_PORT

print_step "Iniciando aplicação com PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

print_step "Reiniciando Nginx..."
systemctl restart nginx

print_step "Configurando SSL com Let's Encrypt..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@bushdigital.com.br

print_step "Criando script de backup..."
cat > /root/backup-$APP_NAME.sh << EOF
#!/bin/bash
BACKUP_DIR="/backup/$APP_NAME"
DATE=\$(date +%Y%m%d_%H%M%S)

mkdir -p \$BACKUP_DIR

# Backup do banco
pg_dump -h localhost -U $DB_USER $DB_NAME > "\$BACKUP_DIR/backup_\$DATE.sql"

# Backup dos arquivos
tar -czf "\$BACKUP_DIR/files_\$DATE.tar.gz" -C $APP_DIR .

# Manter apenas os últimos 7 backups
find \$BACKUP_DIR -name "backup_*.sql" -type f -mtime +7 -delete
find \$BACKUP_DIR -name "files_*.tar.gz" -type f -mtime +7 -delete

echo "Backup realizado: \$DATE"
EOF

chmod +x /root/backup-$APP_NAME.sh

print_step "Agendando backup diário..."
(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup-$APP_NAME.sh") | crontab -

print_step "Criando script de atualização..."
cat > /root/update-$APP_NAME.sh << EOF
#!/bin/bash
cd $APP_DIR

echo "Fazendo backup antes da atualização..."
/root/backup-$APP_NAME.sh

echo "Atualizando código..."
git pull

echo "Instalando dependências..."
npm install

echo "Fazendo build..."
npm run build

echo "Reiniciando aplicação..."
pm2 restart $APP_NAME

echo "Atualização concluída!"
EOF

chmod +x /root/update-$APP_NAME.sh

print_step "Definindo permissões..."
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR

echo ""
echo "✅ Deploy concluído com sucesso!"
echo ""
echo "📋 INFORMAÇÕES IMPORTANTES:"
echo "----------------------------------------"
echo "🌐 URL da aplicação: https://$DOMAIN"
echo "🔌 Porta da aplicação: $APP_PORT"
echo "📁 Diretório: $APP_DIR"
echo "🗄️  Banco de dados: $DB_NAME"
echo "👤 Usuário do banco: $DB_USER"
echo "🔑 Senha do banco: $DB_PASS"
echo "🔐 Session Secret: $SESSION_SECRET"
echo ""
echo "📝 PRÓXIMOS PASSOS:"
echo "----------------------------------------"
echo "1. Configure suas chaves de API no arquivo .env em $APP_DIR/.env"
echo "2. Configure DNS do domínio $DOMAIN para apontar para este servidor"
echo "3. Teste a aplicação em https://$DOMAIN"
echo ""
echo "🛠️  COMANDOS ÚTEIS:"
echo "----------------------------------------"
echo "• Ver status: pm2 status"
echo "• Ver logs: pm2 logs $APP_NAME"
echo "• Reiniciar: pm2 restart $APP_NAME"
echo "• Atualizar app: /root/update-$APP_NAME.sh"
echo "• Fazer backup: /root/backup-$APP_NAME.sh"
echo "• Ver logs nginx: tail -f /var/log/nginx/${APP_NAME}_error.log"
echo ""
echo "💾 Backup automático configurado para 02:00 diariamente"
echo ""

# Mostrar status final
print_step "Status dos serviços:"
systemctl status nginx --no-pager -l
systemctl status postgresql --no-pager -l
pm2 status

echo ""
print_step "Para configurar DNS, adicione um registro A:"
echo "Tipo: A"
echo "Nome: app"
echo "Valor: $(curl -s ifconfig.me)"
echo "TTL: 3600"
