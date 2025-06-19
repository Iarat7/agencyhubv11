# AgencyHub - Digital Marketing Agency Management Platform

Sistema completo de gestão para agências de marketing digital com inteligência artificial integrada.

## 🚀 Funcionalidades

### 💼 Gestão de Clientes (CRM)
- Cadastro completo de clientes com informações detalhadas
- Categorização por indústria e segmento
- Histórico de interações e relacionamento
- Dashboard com métricas de clientes

### 📋 Gestão de Tarefas e Projetos
- Sistema Kanban para organização de tarefas
- Priorização e categorização
- Atribuição de responsáveis
- Controle de prazos e status

### 💰 Sistema Financeiro Avançado
- Controle de receitas e despesas
- Relatórios financeiros em PDF (DRE, Balanço, Fluxo de Caixa)
- Métricas financeiras em tempo real
- Controle de recorrência e categorização

### 🗓️ Calendário da Equipe
- Gestão de eventos e compromissos
- Tipos de eventos (reuniões, gravações, chamadas)
- Vinculação com clientes específicos
- Interface responsiva para todos os dispositivos

### 🤖 Estratégias com IA
- Geração automática de estratégias de marketing
- Integração com OpenAI GPT-4
- Ideias de conteúdo personalizadas
- Análise de performance por cliente

### 📊 Pipeline de Vendas
- Funil de vendas completo
- Controle de oportunidades por estágio
- Previsão de receita
- Métricas de conversão

### 👥 Gestão de Equipe
- Sistema de roles e permissões
- Controle hierárquico (Admin, Manager, Analyst, Designer, Developer)
- Métricas de performance da equipe
- Interface de gerenciamento completa

### 🔗 Integrações de Marketing
- Facebook/Meta Ads
- Google Ads
- Google Analytics
- Sync automático de métricas

### 🔔 Sistema de Notificações
- Notificações automáticas por email
- Tarefas cron para lembretes
- Alertas de pagamentos em atraso
- Resumos financeiros semanais

## 🛠️ Tecnologias

### Frontend
- **React 18** com TypeScript
- **Vite** para build e desenvolvimento
- **Tailwind CSS** para estilização
- **Shadcn/ui** para componentes
- **TanStack Query** para estado do servidor
- **React Hook Form** para formulários
- **Wouter** para roteamento

### Backend
- **Node.js** com Express.js
- **TypeScript** com ES modules
- **PostgreSQL** com Neon serverless
- **Drizzle ORM** para banco de dados
- **Replit Auth** com OpenID Connect

### Serviços Externos
- **OpenAI API** para geração de estratégias
- **Nodemailer** para emails
- **Facebook Graph API** para Meta Ads
- **Google Ads API** e **Analytics API**

## 🚀 Como Executar

1. **Instalar dependências:**
```bash
npm install
```

2. **Configurar variáveis de ambiente:**
```env
DATABASE_URL=your_postgresql_url
SESSION_SECRET=your_session_secret
OPENAI_API_KEY=your_openai_key
```

3. **Executar migrações do banco:**
```bash
npm run db:push
```

4. **Iniciar o servidor de desenvolvimento:**
```bash
npm run dev
```

5. **Acessar a aplicação:**
```
http://localhost:5000
```

## 📱 Responsividade

A aplicação é totalmente responsiva e otimizada para:
- 📱 Mobile (320px+)
- 📱 Tablet (768px+)
- 💻 Desktop (1024px+)
- 🖥️ Ultrawide (1440px+)

## 🔒 Segurança

- Autenticação via OpenID Connect
- Sessões seguras com PostgreSQL
- Controle de acesso baseado em roles
- Proteção CSRF
- Validação de dados com Zod

## 📈 Métricas e Analytics

- Dashboard com KPIs em tempo real
- Relatórios financeiros automatizados
- Métricas de marketing integradas
- Analytics de performance da equipe

## 🤝 Contribuição

Este é um projeto proprietário desenvolvido para agências de marketing digital.

## 📝 Licença

Todos os direitos reservados - AgencyHub Platform

## 🆔 Versão

**v2.0** - Sistema completo com IA integrada (Junho 2025)

---

**Desenvolvido com ❤️ para agências de marketing digital**