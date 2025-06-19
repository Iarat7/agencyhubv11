# AgencyHub - Digital Marketing Agency Management System

## Overview

AgencyHub is a comprehensive management system designed specifically for digital marketing agencies. It provides a complete solution for managing clients, tasks, financial records, sales pipeline, and AI-powered marketing strategies in a single, integrated platform. The application is built using modern web technologies with a focus on user experience and data-driven insights.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth with OpenID Connect integration
- **Session Management**: Express sessions with PostgreSQL storage
- **API Design**: RESTful endpoints with JSON responses

### Development Setup
- **Monorepo Structure**: Client and server code in shared workspace
- **Hot Reload**: Vite dev server with HMR for frontend, tsx for backend development
- **Type Safety**: Shared TypeScript schemas between client and server
- **Development Tools**: ESBuild for production server bundling

## Key Components

### Authentication System
- **Provider**: Replit Auth using OpenID Connect protocol
- **Session Storage**: PostgreSQL-backed sessions with 7-day TTL
- **Security**: HTTP-only cookies, CSRF protection, secure session handling
- **User Management**: Automatic user profile creation and management

### Database Layer
- **Primary Database**: PostgreSQL with Neon serverless driver
- **Schema Management**: Drizzle ORM with type-safe migrations
- **Connection Pooling**: Neon serverless connection pooling for scalability
- **Data Validation**: Zod schemas for runtime type checking

### Client Management (CRM)
- **Contact Storage**: Complete client profiles with company information
- **Industry Categorization**: Flexible industry classification system
- **Financial Tracking**: Monthly value and contract start date tracking
- **Relationship Management**: Contact person and communication preferences

### Task Management
- **Project Organization**: Tasks linked to specific clients
- **Status Tracking**: Pending, in-progress, completed status workflow
- **Priority System**: High, medium, low priority classification
- **Due Date Management**: Deadline tracking and overdue notifications

### Sales Pipeline
- **Opportunity Tracking**: Lead management through sales stages
- **Stage Management**: Prospecting → Qualification → Proposal → Negotiation → Closed
- **Revenue Forecasting**: Deal value and probability tracking
- **Conversion Analytics**: Pipeline performance metrics

### Financial Management
- **Revenue Tracking**: Income recording with client attribution
- **Expense Management**: Cost tracking with categorization
- **Cash Flow**: Real-time financial position monitoring
- **Reporting**: Monthly and quarterly financial summaries

### AI Strategy Generation
- **OpenAI Integration**: GPT-4o model for strategy generation
- **Strategy Components**: Objectives, tactics, metrics, and timelines
- **Content Planning**: AI-generated content ideas and campaigns
- **Performance Analysis**: AI-powered client performance insights

## Data Flow

### Authentication Flow
1. User initiates login through Replit Auth
2. OpenID Connect handles authentication with Replit
3. User profile created/updated in PostgreSQL
4. Session stored with connect-pg-simple
5. Authenticated routes protected by middleware

### API Request Flow
1. Frontend makes authenticated requests with credentials
2. Express middleware validates session
3. Route handlers process business logic
4. Drizzle ORM executes type-safe database queries
5. JSON responses returned to frontend
6. TanStack Query manages caching and state

### Real-time Updates
- **Query Invalidation**: Automatic cache invalidation on mutations
- **Optimistic Updates**: Immediate UI updates with rollback capability
- **Error Handling**: Comprehensive error boundaries and user feedback

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **openid-client**: OpenID Connect authentication
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store

### UI Dependencies
- **@radix-ui/***: Accessible component primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **react-hook-form**: Form state management
- **@hookform/resolvers**: Form validation integration

### Development Dependencies
- **tsx**: TypeScript execution for development
- **esbuild**: Fast JavaScript bundler for production
- **vite**: Frontend build tool and dev server
- **@replit/vite-plugin-***: Replit-specific development tools

### AI Services
- **OpenAI API**: GPT-4o model for strategy generation
- **Custom Prompts**: Structured prompts for marketing strategy creation
- **Response Processing**: JSON parsing and validation of AI responses

## Deployment Strategy

### Production Build
- **Frontend**: Vite builds optimized static assets to `dist/public`
- **Backend**: ESBuild bundles server code to `dist/index.js`
- **Environment**: NODE_ENV=production for optimizations

### Replit Deployment
- **Platform**: Replit Autoscale deployment target
- **Port Configuration**: External port 80 maps to internal port 5000
- **Database**: Automatic PostgreSQL provisioning through Replit
- **Environment Variables**: DATABASE_URL, SESSION_SECRET, OPENAI_API_KEY

### Runtime Configuration
- **Process Management**: Single process serving both API and static files
- **Static Serving**: Express serves Vite-built frontend in production
- **Health Checks**: Basic endpoint monitoring for deployment health

### Development Workflow
- **Local Development**: `npm run dev` starts both frontend and backend
- **Database Migrations**: `npm run db:push` applies schema changes
- **Type Checking**: `npm run check` validates TypeScript compilation

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

✓ Sistema migrado do PostgreSQL para Supabase com autenticação própria
✓ Implementado sistema financeiro avançado com relatórios PDF exportáveis
✓ Sistema de notificações automáticas com email e cron jobs
✓ Integração com ferramentas de marketing (Meta Ads, Google Ads, Analytics)
✓ Módulo completo de gestão de equipe com permissões baseadas em roles
✓ Interface moderna com páginas para Team, Reports e Integrations
✓ Base de dados expandida com 8 novas tabelas para recursos avançados
✓ Sistema Kanban completo para estratégias IA com navegação entre status
✓ Campos de data implementados para planejamento temporal das estratégias
✓ Sistema totalmente responsivo para mobile, tablet, desktop e ultrawide
✓ Sidebar responsivo com menu móvel e overlay para navegação touch
✓ Sistema de calendário da equipe implementado com gestão completa de eventos
✓ Interface de calendário mensal com visualização de eventos por tipo e cliente

## Funcionalidades Avançadas Implementadas

### 1. Sistema Financeiro Avançado
- Relatórios automatizados em PDF (Demonstrativo de Resultados, Balanço, Fluxo de Caixa)
- Campos expandidos: taxas, descontos, anexos, categorias, recorrência
- Exportação de relatórios personalizados por período e cliente
- Analytics financeiros com métricas detalhadas

### 2. Sistema de Notificações Automáticas
- Email notifications via nodemailer
- Tarefas cron automatizadas:
  - Verificação diária de pagamentos em atraso (9h)
  - Verificação diária de tarefas atrasadas (10h)
  - Resumo financeiro semanal (segunda 8h)
  - Lembrete mensal de revisão de clientes (1° dia 9h)
- Notificações de atribuição de tarefas e recebimento de pagamentos

### 3. Integrações de Marketing
- Facebook/Meta Ads: sincronização de campanhas e métricas
- Google Ads: importação de dados de performance
- Google Analytics: tracking de tráfego orgânico
- Métricas automatizadas: impressões, cliques, conversões, ROAS, CTR, CPC
- Sync automático configurável (hourly, daily, weekly)

### 4. Gestão de Equipe e Permissões
- Sistema de roles: Admin, Manager, Analyst, Designer, Developer
- Permissões granulares por recurso e ação
- Interface completa de gestão de membros
- Hierarquia organizacional e métricas de performance
- Controle de acesso baseado em funções

### 5. Base de Dados Expandida
Novas tabelas implementadas:
- `team_members`: gestão de equipe
- `notifications`: sistema de notificações
- `marketing_integrations`: configurações de integrações
- `campaign_performance`: métricas de campanhas
- `financial_reports`: relatórios gerados
- `calendar_events`: eventos e compromissos da equipe
- Campos expandidos em `financial_records`

### 6. Sistema de Calendário da Equipe
- Interface de calendário mensal com navegação entre meses
- Criação de eventos com tipos: reunião, gravação, chamada, outros
- Vinculação de eventos a clientes específicos
- Campos completos: título, descrição, responsável, participantes, local
- Visualização por cores baseada no tipo de evento
- Detalhamento de eventos por dia selecionado
- Preparação para integração futura com Google Calendar
- API completa para CRUD de eventos de calendário

### 6. Interface Avançada
- Página de gestão de equipe com roles e permissões
- Central de relatórios com geração e download de PDFs
- Dashboard expandido com métricas de marketing
- Sistema de notificações em tempo real
- Sidebar reorganizada com seções de Automação e Gestão

## Tecnologias e Serviços

### Novos Serviços Backend
- `ReportGenerator`: geração de PDFs com jsPDF
- `NotificationService`: automação de notificações
- `MarketingIntegrationService`: integrações externas
- `TeamManagementService`: gestão de permissões

### APIs Externas Integradas
- Facebook Graph API para Meta Ads
- Google Ads API para campanhas
- Google Analytics Data API
- Nodemailer para envio de emails

### Dependências Adicionadas
- jspdf, jspdf-autotable, html2canvas (relatórios PDF)
- node-cron (tarefas automatizadas)
- nodemailer (emails)
- axios (requisições HTTP)
- @supabase/supabase-js (base de dados)

## Changelog

- June 19, 2025: Corrigidos erros críticos de sintaxe JSX e TypeScript que causavam crashes
- June 19, 2025: Resolvidos problemas com SelectItem components que tinham valores vazios
- June 19, 2025: Reparada estrutura JSX malformada no calendar.tsx
- June 19, 2025: Aplicação estabilizada e funcionando corretamente
- June 18, 2025: Migração para Supabase e implementação de recursos avançados
- June 18, 2025: Sistema financeiro expandido com relatórios PDF
- June 18, 2025: Implementação de notificações automáticas
- June 18, 2025: Integrações de marketing (Meta Ads, Google Ads, Analytics)
- June 18, 2025: Sistema completo de gestão de equipe e permissões
- June 18, 2025: Interface modernizada com novas páginas e funcionalidades