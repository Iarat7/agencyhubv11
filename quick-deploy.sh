
#!/bin/bash

# Quick Deploy - Versão Simplificada
# Execute este se já tiver o ambiente básico configurado

APP_DIR="/var/www/agencyhub"
APP_PORT=9000

echo "🔄 Atualizando aplicação..."

cd $APP_DIR

# Backup rápido
cp .env .env.backup

# Atualizar código (se usar git)
# git pull

# Instalar dependências
npm install

# Build
npm run build

# Reiniciar aplicação
pm2 restart agencyhub

# Reiniciar nginx
sudo systemctl reload nginx

echo "✅ Atualização concluída!"
echo "🌐 Aplicação rodando em: https://app.bushdigital.com.br"
echo "📊 Status: pm2 status"
