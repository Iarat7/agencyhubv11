import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./simpleAuth";
import { 
  insertClientSchema, 
  insertTaskSchema, 
  insertOpportunitySchema, 
  insertFinancialRecordSchema,
  insertAiStrategySchema,
  insertActivitySchema,
  insertContractSchema,
  insertProductSchema,
  insertClientProductSchema,
  insertProductSaleSchema,
  insertCalendarEventSchema
} from "@shared/schema";
import { generateMarketingStrategy, generateContentIdeas, analyzeClientPerformance } from "./services/openai";
import { AccessControlService } from "./services/access-control";
import { BillingService } from "./services/billing";
import { accessControl } from './services/access-control.js';
import { teamService } from './services/team.js';
import { billingService } from './services/billing.js';
import { notificationService } from './services/notifications.js';
import { marketingService } from './services/marketing.js';
import { syncScheduler } from './services/sync-scheduler.js';
import { reportService } from './services/reports.js';
import { paymentService } from './services/payments.js';

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const sessionUser = (req.session as any)?.user;
      if (!sessionUser) {
        return res.status(401).json({ error: "Não autenticado" });
      }
      res.json(sessionUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destroy error:', err);
          return res.status(500).json({ error: 'Erro ao fazer logout' });
        }
        res.json({ message: 'Logout realizado com sucesso' });
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Team management routes
  app.get("/api/team", isAuthenticated, async (req, res) => {
    try {
      const teamMembers = await storage.getTeamMembers();
      res.json(teamMembers);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  app.post("/api/team", isAuthenticated, async (req, res) => {
    try {
      const memberData = req.body;
      const member = await storage.createTeamMember(memberData);
      res.status(201).json(member);
    } catch (error) {
      console.error("Error creating team member:", error);
      res.status(500).json({ message: "Failed to create team member" });
    }
  });

  app.patch("/api/team/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const member = await storage.updateTeamMember(parseInt(id), updateData);
      res.json(member);
    } catch (error) {
      console.error("Error updating team member:", error);
      res.status(500).json({ message: "Failed to update team member" });
    }
  });

  app.get("/api/team/roles", async (req, res) => {
    try {
      const roles = [
        {
          name: 'admin',
          description: 'Administrador',
          permissions: [
            { resource: 'clients', actions: ['create', 'read', 'update', 'delete'] },
            { resource: 'tasks', actions: ['create', 'read', 'update', 'delete', 'assign'] },
            { resource: 'financial', actions: ['create', 'read', 'update', 'delete'] },
            { resource: 'team', actions: ['create', 'read', 'update', 'delete'] },
            { resource: 'reports', actions: ['create', 'read', 'export'] }
          ]
        },
        {
          name: 'manager',
          description: 'Gerente',
          permissions: [
            { resource: 'clients', actions: ['create', 'read', 'update'] },
            { resource: 'tasks', actions: ['create', 'read', 'update', 'assign'] },
            { resource: 'financial', actions: ['read', 'update'] },
            { resource: 'reports', actions: ['create', 'read', 'export'] }
          ]
        },
        {
          name: 'analyst',
          description: 'Analista',
          permissions: [
            { resource: 'clients', actions: ['read'] },
            { resource: 'tasks', actions: ['read', 'update'] },
            { resource: 'financial', actions: ['read'] },
            { resource: 'reports', actions: ['create', 'read', 'export'] }
          ]
        }
      ];
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  // Reports routes
  app.get("/api/reports", isAuthenticated, async (req, res) => {
    try {
      let reports = [];
      try {
        reports = await storage.getFinancialReports();
      } catch (dbError) {
        console.log("Database not available, returning sample reports");
        // Return sample reports if database is not available
        reports = [
          {
            id: 1,
            name: "Demonstrativo de Resultados - Últimos 30 dias",
            type: "income_statement",
            period: "Últimos 30 dias",
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            generatedBy: "system",
            createdAt: new Date().toISOString(),
            filePath: "/reports/sample_1.pdf"
          },
          {
            id: 2,
            name: "Fluxo de Caixa - Este mês",
            type: "cash_flow",
            period: "Este mês",
            startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            generatedBy: "system",
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            filePath: "/reports/sample_2.pdf"
          }
        ];
      }
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.post("/api/reports/generate", isAuthenticated, async (req, res) => {
    try {
      const { type, startDate, endDate, clientId } = req.body;
      const userId = (req.session as any)?.user?.id;

      // Import ReportGenerator
      const { ReportGenerator } = await import("./services/reports");

      // Generate report with PDF
      const { reportData, pdfBuffer } = await ReportGenerator.generateFinancialReport(
        type,
        startDate,
        endDate,
        clientId ? parseInt(clientId) : undefined
      );

      const reportRecord = {
        name: `${reportData.title} - ${reportData.period}`,
        type,
        period: reportData.period,
        startDate,
        endDate,
        generatedBy: userId || 'system',
        data: reportData,
        filePath: `/reports/report_${Date.now()}.pdf`
      };

      try {
        const report = await storage.createFinancialReport(reportRecord);
        res.status(201).json({ ...report, hasData: true });
      } catch (dbError) {
        // If database fails, still return the generated report
        console.log("Database not available, returning generated report");
        res.status(201).json({ 
          id: Date.now(), 
          ...reportRecord, 
          createdAt: new Date(),
          hasData: true 
        });
      }
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  app.get("/api/reports/:id/download", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      let report;

      try {
        report = await storage.getFinancialReport(parseInt(id));
      } catch (dbError) {
        console.log("Database not available for report lookup");
      }

      if (!report) {
        // Generate a sample report if not found
        const { ReportGenerator } = await import("./services/reports");
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const { pdfBuffer } = await ReportGenerator.generateFinancialReport(
          'income_statement',
          startDate,
          endDate
        );

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="relatorio_${id}.pdf"`);
        return res.send(pdfBuffer);
      }

      // If report exists, generate PDF from stored data
      const { ReportGenerator } = await import("./services/reports");
      const { pdfBuffer } = await ReportGenerator.generateFinancialReport(
        report.type,
        report.startDate,
        report.endDate
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="relatorio_${id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error downloading report:", error);
      res.status(500).json({ message: "Failed to download report" });
    }
  });

  // Notifications routes
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any)?.user?.id;
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.markNotificationAsRead(parseInt(id));
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error updating notification:", error);
      res.status(500).json({ message: "Failed to update notification" });
    }
  });

  // Marketing integrations routes
  app.get("/api/integrations", isAuthenticated, async (req, res) => {
    try {
      const integrations = await storage.getMarketingIntegrations();
      res.json(integrations);
    } catch (error) {
      console.error("Error fetching integrations:", error);
      res.status(500).json({ message: "Failed to fetch integrations" });
    }
  });

  app.get("/api/integrations/client/:clientId", isAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const integrations = await storage.getMarketingIntegrationsByClient(clientId);
      res.json(integrations);
    } catch (error) {
      console.error("Error fetching client integrations:", error);
      res.status(500).json({ message: "Failed to fetch client integrations" });
    }
  });

  app.post("/api/integrations", isAuthenticated, async (req, res) => {
    try {
      const integrationData = req.body;
      const integration = await storage.createMarketingIntegration(integrationData);
      res.status(201).json(integration);
    } catch (error) {
      console.error("Error creating integration:", error);
      res.status(500).json({ message: "Failed to create integration" });
    }
  });

  app.post("/api/integrations/facebook", isAuthenticated, async (req, res) => {
    try {
      const { clientId, accessToken, accountId } = req.body;
      const { MarketingIntegrationService } = await import("./services/marketing");
      const integration = await MarketingIntegrationService.connectFacebookAds(
        clientId,
        accessToken,
        accountId
      );
      res.status(201).json(integration);
    } catch (error) {
      console.error("Error connecting Facebook Ads:", error);
      res.status(500).json({ message: error.message || "Failed to connect Facebook Ads" });
    }
  });

  app.post("/api/integrations/google-ads", isAuthenticated, async (req, res) => {
    try {
      const { clientId, accessToken, refreshToken, accountId } = req.body;
      const { MarketingIntegrationService } = await import("./services/marketing");
      const integration = await MarketingIntegrationService.connectGoogleAds(
        clientId,
        accessToken,
        refreshToken,
        accountId
      );
      res.status(201).json(integration);
    } catch (error) {
      console.error("Error connecting Google Ads:", error);
      res.status(500).json({ message: error.message || "Failed to connect Google Ads" });
    }
  });

  app.post("/api/integrations/google-analytics", isAuthenticated, async (req, res) => {
    try {
      const { clientId, accessToken, refreshToken, propertyId } = req.body;
      const { MarketingIntegrationService } = await import("./services/marketing");
      const integration = await MarketingIntegrationService.connectGoogleAnalytics(
        clientId,
        accessToken,
        refreshToken,
        propertyId
      );
      res.status(201).json(integration);
    } catch (error) {
      console.error("Error connecting Google Analytics:", error);
      res.status(500).json({ message: error.message || "Failed to connect Google Analytics" });
    }
  });

  app.post("/api/integrations/instagram", isAuthenticated, async (req, res) => {
    try {
      const { clientId, accessToken, accountId } = req.body;
      const { MarketingIntegrationService } = await import("./services/marketing");
      const integration = await MarketingIntegrationService.connectInstagramBusiness(
        clientId,
        accessToken,
        accountId
      );
      res.status(201).json(integration);
    } catch (error) {
      console.error("Error connecting Instagram Business:", error);
      res.status(500).json({ message: error.message || "Failed to connect Instagram Business" });
    }
  });

  app.post("/api/integrations/facebook-page", isAuthenticated, async (req, res) => {
    try {
      const { clientId, accessToken, pageId } = req.body;
      const { MarketingIntegrationService } = await import("./services/marketing");
      const integration = await MarketingIntegrationService.connectFacebookPage(
        clientId,
        accessToken,
        pageId
      );
      res.status(201).json(integration);
    } catch (error) {
      console.error("Error connecting Facebook Page:", error);
      res.status(500).json({ message: error.message || "Failed to connect Facebook Page" });
    }
  });

  app.post("/api/integrations/:id/sync", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { MarketingIntegrationService } = await import("./services/marketing");
      const integration = await storage.getMarketingIntegration(id);

      if (!integration) {
        return res.status(404).json({ message: "Integration not found" });
      }

      switch (integration.platform) {
        case 'facebook':
          await MarketingIntegrationService.syncFacebookAdsData(id);
          break;
        case 'google':
          await MarketingIntegrationService.syncGoogleAdsData(id);
          break;
        case 'google_analytics':
          await MarketingIntegrationService.syncGoogleAnalyticsData(id);
          break;
        case 'instagram':
          await MarketingIntegrationService.syncInstagramData(id);
          break;
        case 'facebook_page':
          await MarketingIntegrationService.syncFacebookPageData(id);
          break;
        default:
          return res.status(400).json({ message: "Unsupported platform" });
      }

      res.json({ message: "Sync completed successfully" });
    } catch (error) {
      console.error("Error syncing integration:", error);
      res.status(500).json({ message: error.message || "Failed to sync integration" });
    }
  });

  app.get("/api/integrations/:id/performance", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const campaigns = await storage.getCampaignPerformanceByIntegration(id);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaign performance:", error);
      res.status(500).json({ message: "Failed to fetch campaign performance" });
    }
  });

  app.get("/api/clients/:id/performance", isAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const days = parseInt(req.query.days as string) || 30;
      const { MarketingIntegrationService } = await import("./services/marketing");
      const insights = await MarketingIntegrationService.getCampaignInsights(clientId, days);
      res.json(insights);
    } catch (error) {
      console.error("Error fetching client performance:", error);
      res.status(500).json({ message: "Failed to fetch client performance" });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/metrics", isAuthenticated, async (req, res) => {
    try {
      const period = req.query.period as string || "current_month";
      const metrics = await storage.getDashboardMetrics(period);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Organization routes
  app.get("/api/organizations/current", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any)?.user?.id;
      const orgData = await AccessControlService.getUserOrganizationWithPlan(userId);

      if (!orgData) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const limits = await AccessControlService.getOrganizationLimits(orgData.organization.id);

      res.json({
        ...orgData,
        limits
      });
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  app.get("/api/plans", async (req, res) => {
    try {
      const plans = await storage.getPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ message: "Failed to fetch plans" });
    }
  });

  // Client routes (organization-scoped)
  app.get("/api/clients", isAuthenticated, AccessControlService.requireOrganizationAccess(), async (req, res) => {
    try {
      const organizationId = req.organizationId;
      const clients = await storage.getClients(organizationId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", isAuthenticated, AccessControlService.requireOrganizationAccess(), async (req, res) => {
    try {
      const organizationId = req.organizationId;

      // Check if organization can add more clients
      const canAdd = await AccessControlService.canAddClient(organizationId);
      if (!canAdd) {
        return res.status(403).json({ 
          error: 'Limite de clientes atingido para seu plano',
          upgrade: true 
        });
      }

      const clientData = insertClientSchema.parse({
        ...req.body,
        organizationId
      });
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.put("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const clientData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(id, clientData);
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteClient(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Task routes
  app.get("/api/tasks", isAuthenticated, async (req, res) => {
    try {
      const { clientId } = req.query;
      let tasks;

      if (clientId) {
        tasks = await storage.getTasksByClient(parseInt(clientId as string));
      } else {
        tasks = await storage.getTasks();
      }

      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", isAuthenticated, async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);

      // Create activity
      await storage.createActivity({
        type: "task_created",
        description: `Nova tarefa criada: ${task.title}`,
        userId: (req.session as any)?.user?.id,
        clientId: task.clientId,
      });

      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const taskData = insertTaskSchema.partial().parse(req.body);
      const task = await storage.updateTask(id, taskData);

      // Create activity if task was completed
      if (taskData.status === "completed") {
        await storage.createActivity({
          type: "task_completed",
          description: `Tarefa concluída: ${task.title}`,
          userId: (req.session as any)?.user?.id,
          clientId: task.clientId,
        });
      }

      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTask(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Opportunity routes
  app.get("/api/opportunities", isAuthenticated, async (req, res) => {
    try {
      const opportunities = await storage.getOpportunities();
      res.json(opportunities);
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      res.status(500).json({ message: "Failed to fetch opportunities" });
    }
  });

  app.post("/api/opportunities", isAuthenticated, async (req, res) => {
    try {
      const opportunityData = insertOpportunitySchema.parse(req.body);
      const opportunity = await storage.createOpportunity(opportunityData);

      // Create activity
      await storage.createActivity({
        type: "opportunity_created",
        description: `Nova oportunidade criada: ${opportunity.title}`,
        userId: (req.session as any)?.user?.id,
        metadata: { value: opportunity.value, stage: opportunity.stage },
      });

      res.status(201).json(opportunity);
    } catch (error) {
      console.error("Error creating opportunity:", error);
      res.status(500).json({ message: "Failed to create opportunity" });
    }
  });

  app.put("/api/opportunities/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const opportunityData = insertOpportunitySchema.partial().parse(req.body);
      const opportunity = await storage.updateOpportunity(id, opportunityData);
      res.json(opportunity);
    } catch (error) {
      console.error("Error updating opportunity:", error);
      res.status(500).json({ message: "Failed to update opportunity" });
    }
  });

  app.delete("/api/opportunities/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteOpportunity(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting opportunity:", error);
      res.status(500).json({ message: "Failed to delete opportunity" });
    }
  });

  // Financial routes
  app.get("/api/financial", isAuthenticated, async (req, res) => {
    try {
      const { clientId } = req.query;
      let records;

      if (clientId) {
        records = await storage.getFinancialRecordsByClient(parseInt(clientId as string));
      } else {
        records = await storage.getFinancialRecords();
      }

      res.json(records);
    } catch (error) {
      console.error("Error fetching financial records:", error);
      res.status(500).json({ message: "Failed to fetch financial records" });
    }
  });

  app.post("/api/financial", isAuthenticated, async (req, res) => {
    try {
      const recordData = insertFinancialRecordSchema.parse(req.body);
      const record = await storage.createFinancialRecord(recordData);

      // Create activity
      await storage.createActivity({
        type: "financial_record_created",
        description: `Novo registro financeiro: ${record.type} - R$ ${record.amount}`,
        userId: (req.session as any)?.user?.id,
        clientId: record.clientId,
      });

      res.status(201).json(record);
    } catch (error) {
      console.error("Error creating financial record:", error);
      res.status(500).json({ message: "Failed to create financial record" });
    }
  });

  app.put("/api/financial/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const recordData = insertFinancialRecordSchema.partial().parse(req.body);
      const record = await storage.updateFinancialRecord(id, recordData);

      // Create activity if payment was received
      if (recordData.status === "paid") {
        await storage.createActivity({
          type: "payment_received",
          description: `Pagamento recebido: R$ ${record.amount}`,
          userId: (req.session as any)?.user?.id,
          clientId: record.clientId,
        });
      }

      res.json(record);
    } catch (error) {
      console.error("Error updating financial record:", error);
      res.status(500).json({ message: "Failed to update financial record" });
    }
  });

  app.delete("/api/financial/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Get record details before deletion for activity log
      const record = await storage.getFinancialRecord(id);
      if (!record) {
        return res.status(404).json({ message: "Financial record not found" });
      }

      await storage.deleteFinancialRecord(id);

      // Create activity
      await storage.createActivity({
        type: "financial_record_deleted",
        description: `Registro financeiro removido: ${record.type} - R$ ${record.amount}`,
        userId: (req.session as any)?.user?.id,
        clientId: record.clientId,
      });

      res.json({ message: "Financial record deleted successfully" });
    } catch (error) {
      console.error("Error deleting financial record:", error);
      res.status(500).json({ message: "Failed to delete financial record" });
    }
  });

  // AI Strategy routes
  app.get("/api/ai-strategies", isAuthenticated, async (req, res) => {
    try {
      const { clientId } = req.query;
      let strategies;

      if (clientId) {
        strategies = await storage.getAiStrategiesByClient(parseInt(clientId as string));
      } else {
        strategies = await storage.getAiStrategies();
      }

      res.json(strategies);
    } catch (error) {
      console.error("Error fetching AI strategies:", error);
      res.status(500).json({ message: "Failed to fetch AI strategies" });
    }
  });

  app.post("/api/ai-strategies/generate", 
    isAuthenticated, 
    AccessControlService.requireOrganizationAccess(),
    AccessControlService.requireFeatureAccess('ai_strategies'),
    async (req, res) => {
    try {
      const { clientId, goals, challenges, budget, targetAudience } = req.body;

      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      const strategyRequest = {
        clientName: client.name,
        industry: client.industry || "Geral",
        goals: goals || [],
        currentChallenges: challenges || [],
        budget,
        targetAudience,
      };

      const generatedStrategy = await generateMarketingStrategy(strategyRequest);

      const strategy = await storage.createAiStrategy({
        clientId,
        title: generatedStrategy.title,
        content: JSON.stringify(generatedStrategy),
        type: "marketing_strategy",
      });

      // Create activity
      await storage.createActivity({
        type: "strategy_generated",
        description: `Nova estratégia IA gerada: ${strategy.title}`,
        userId: (req.session as any)?.user?.id,
        clientId,
      });

      res.status(201).json(strategy);
    } catch (error) {
      console.error("Error generating AI strategy:", error);
      res.status(500).json({ message: "Failed to generate AI strategy" });
    }
  });

  app.post("/api/ai-strategies/content-ideas", isAuthenticated, async (req, res) => {
    try {
      const { clientId, contentType } = req.body;

      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      const contentIdeas = await generateContentIdeas(
        client.name,
        client.industry || "Geral",
        contentType || "blog post"
      );

      const strategy = await storage.createAiStrategy({
        clientId,
        title: `Ideias de Conteúdo - ${contentType}`,
        content: JSON.stringify(contentIdeas),
        type: "content_strategy",
      });

      res.status(201).json(strategy);
    } catch (error) {
      console.error("Error generating content ideas:", error);
      res.status(500).json({ message: "Failed to generate content ideas" });
    }
  });

  app.put("/api/ai-strategies/:id/status", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, rejectionReason, executionStartDate, executionEndDate } = req.body;
      const userId = (req.session as any)?.user?.id;

      const updateData: any = {
        status,
        ...(status === "approved" && { approvedBy: userId, approvedAt: new Date() }),
        ...(status === "rejected" && { rejectionReason }),
        ...(executionStartDate && { executionStartDate }),
        ...(executionEndDate && { executionEndDate }),
      };

      const strategy = await storage.updateAiStrategy(id, updateData);

      // Create activity for status change
      await storage.createActivity({
        type: "strategy_status_changed",
        description: `Estratégia ${status === "approved" ? "aprovada" : status === "rejected" ? "rejeitada" : `movida para ${status}`}`,
        userId,
        clientId: strategy.clientId,
      });

      res.json(strategy);
    } catch (error) {
      console.error("Error updating strategy status:", error);
      res.status(500).json({ message: "Failed to update strategy status" });
    }
  });

  // Activity routes
  app.get("/api/activities", isAuthenticated, async (req, res) => {
    try {
      const { limit } = req.query;
      const activities = await storage.getActivities(limit ? parseInt(limit as string) : undefined);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // Contract routes
  app.get("/api/contracts", isAuthenticated, async (req, res) => {
    try {
      const contracts = await storage.getContracts();
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  // Product routes
  app.get("/api/products", isAuthenticated, async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post("/api/products", isAuthenticated, async (req, res) => {
    try {
      const validation = insertProductSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid data", errors: validation.error.errors });
      }

      const product = await storage.createProduct(validation.data);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validation = insertProductSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid data", errors: validation.error.errors });
      }

      const product = await storage.updateProduct(id, validation.data);
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProduct(id);
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Client-Product routes
  app.get("/api/client-products", isAuthenticated, async (req, res) => {
    try {
      const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : undefined;
      const clientProducts = await storage.getClientProducts(clientId);
      res.json(clientProducts);
    } catch (error) {
      console.error("Error fetching client products:", error);
      res.status(500).json({ message: "Failed to fetch client products" });
    }
  });

  app.post("/api/client-products", isAuthenticated, async (req, res) => {
    try {
      const validation = insertClientProductSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid data", errors: validation.error.errors });
      }

      const clientProduct = await storage.createClientProduct(validation.data);
      res.status(201).json(clientProduct);
    } catch (error) {
      console.error("Error creating client product:", error);
      res.status(500).json({ message: "Failed to create client product" });
    }
  });

  // Product Analytics
  app.get("/api/product-analytics", isAuthenticated, async (req, res) => {
    try {
      const analytics = await storage.getProductAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching product analytics:", error);
      res.status(500).json({ message: "Failed to fetch product analytics" });
    }
  });

  app.get("/api/contracts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const contract = await storage.getContract(id);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      res.json(contract);
    } catch (error) {
      console.error("Error fetching contract:", error);
      res.status(500).json({ message: "Failed to fetch contract" });
    }
  });

  app.post("/api/contracts", isAuthenticated, async (req, res) => {
    try {
      const contractData = insertContractSchema.parse(req.body);
      const contract = await storage.createContract(contractData);
      res.status(201).json(contract);
    } catch (error) {
      console.error("Error creating contract:", error);
      res.status(500).json({ message: "Failed to create contract" });
    }
  });

  app.put("/api/contracts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const contractData = insertContractSchema.partial().parse(req.body);
      const contract = await storage.updateContract(id, contractData);
      res.json(contract);
    } catch (error) {
      console.error("Error updating contract:", error);
      res.status(500).json({ message: "Failed to update contract" });
    }
  });

  app.delete("/api/contracts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteContract(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting contract:", error);
      res.status(500).json({ message: "Failed to delete contract" });
    }
  });

  // Calendar routes
  app.get("/api/calendar/events", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, organizer, clientId } = req.query;

      let events;
      if (startDate && endDate) {
        events = await storage.getCalendarEventsByDate(new Date(startDate as string), new Date(endDate as string));
      } else if (organizer) {
        events = await storage.getCalendarEventsByOrganizer(organizer as string);
      } else if (clientId) {
        events = await storage.getCalendarEventsByClient(parseInt(clientId as string));
      } else {
        events = await storage.getCalendarEvents();
      }

      res.json(events);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ message: "Failed to fetch calendar events" });
    }
  });

  app.get("/api/calendar/events/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getCalendarEvent(id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error fetching calendar event:", error);
      res.status(500).json({ message: "Failed to fetch calendar event" });
    }
  });

  app.post("/api/calendar/events", isAuthenticated, async (req, res) => {
    try {
      const validation = insertCalendarEventSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid data", errors: validation.error.errors });
      }

      const event = await storage.createCalendarEvent(validation.data);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating calendar event:", error);
      res.status(500).json({ message: "Failed to create calendar event" });
    }
  });

  app.put("/api/calendar/events/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validation = insertCalendarEventSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid data", errors: validation.error.errors });
      }

      const event = await storage.updateCalendarEvent(id, validation.data);
      res.json(event);
    } catch (error) {
      console.error("Error updating calendar event:", error);
      res.status(500).json({ message: "Failed to update calendar event" });
    }
  });

  app.delete("/api/calendar/events/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCalendarEvent(id);
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      res.status(500).json({ message: "Failed to delete calendar event" });
    }
  });

  // Billing routes
  app.get("/api/billing/analytics/:organizationId", isAuthenticated, async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const period = req.query.period as string || 'current_month';
      const analytics = await BillingService.getUsageAnalytics(organizationId, period);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching billing analytics:", error);
      res.status(500).json({ message: "Failed to fetch billing analytics" });
    }
  });

  app.post("/api/billing/subscription/stripe", isAuthenticated, async (req, res) => {
    try {
      const { organizationId, planId, customerId } = req.body;
      const subscription = await BillingService.createStripeSubscription(organizationId, planId, customerId);
      res.json(subscription);
    } catch (error) {
      console.error("Error creating Stripe subscription:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  app.post("/api/billing/subscription/pagseguro", isAuthenticated, async (req, res) => {
    try {
      const { organizationId, planId } = req.body;
      const subscription = await BillingService.createPagSeguroSubscription(organizationId, planId);
      res.json(subscription);
    } catch (error) {
      console.error("Error creating PagSeguro subscription:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  app.post("/api/billing/upgrade", isAuthenticated, async (req, res) => {
    try {
      const { organizationId, newPlanId } = req.body;
      const result = await BillingService.upgradePlan(organizationId, newPlanId);
      res.json(result);
    } catch (error) {
      console.error("Error upgrading plan:", error);
      res.status(500).json({ message: error.message || "Failed to upgrade plan" });
    }
  });

  app.post("/api/billing/downgrade", isAuthenticated, async (req, res) => {
    try {
      const { organizationId, newPlanId } = req.body;
      const result = await BillingService.downgradePlan(organizationId, newPlanId);
      res.json(result);
    } catch (error) {
      console.error("Error downgrading plan:", error);
      res.status(500).json({ message: error.message || "Failed to downgrade plan" });
    }
  });

  // Webhook routes
  app.post("/api/webhooks/stripe", async (req, res) => {
    try {
      const sig = req.headers['stripe-signature'] as string;
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!endpointSecret) {
        return res.status(400).json({ error: 'Webhook secret not configured' });
      }

      // Verify webhook signature (simplified - in production use Stripe's verification)
      const event = req.body;

      await BillingService.handleStripeWebhook(event);
      res.json({ received: true });
    } catch (error) {
      console.error("Error handling Stripe webhook:", error);
      res.status(400).json({ error: 'Webhook error' });
    }
  });

  app.post("/api/webhooks/pagseguro", async (req, res) => {
    try {
      // Handle PagSeguro webhooks
      const notification = req.body;
      console.log('PagSeguro webhook received:', notification);

      // Process notification based on notificationType
      if (notification.notificationType === 'preApproval') {
        // Handle subscription status changes
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error("Error handling PagSeguro webhook:", error);
      res.status(400).json({ error: 'Webhook error' });
    }
  });

  // Payment routes
  app.post("/api/payment/create-intent", isAuthenticated, async (req, res) => {
    try {
      const { amount, currency = 'brl' } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const paymentIntent = await paymentService.createPaymentIntent(amount, currency);
      res.json(paymentIntent);
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Failed to create payment intent" });
    }
  });

  app.post("/api/billing/create-subscription", isAuthenticated, async (req, res) => {
    try {
      const { priceId, customerEmail, customerName } = req.body;

      if (!priceId || !customerEmail || !customerName) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Create or get customer
      const customerId = await paymentService.createCustomer(customerEmail, customerName);

      // Create subscription
      const subscription = await paymentService.createSubscription(customerId, priceId);

      res.json(subscription);
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  app.post("/api/billing/cancel-subscription", isAuthenticated, async (req, res) => {
    try {
      const { subscriptionId } = req.body;

      if (!subscriptionId) {
        return res.status(400).json({ message: "Subscription ID required" });
      }

      await paymentService.cancelSubscription(subscriptionId);
      res.json({ message: "Subscription cancelled successfully" });
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  app.post("/api/billing/update-subscription", isAuthenticated, async (req, res) => {
    try {
      const { subscriptionId, priceId } = req.body;

      if (!subscriptionId || !priceId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const subscription = await paymentService.updateSubscription(subscriptionId, priceId);
      res.json(subscription);
    } catch (error) {
      console.error("Error updating subscription:", error);
      res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  app.get("/api/billing/subscription/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const subscription = await paymentService.getSubscription(id);
      res.json(subscription);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  app.post("/api/webhooks/stripe", async (req, res) => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      const event = await paymentService.handleWebhook(req.body, signature);

      // Here you would update your database based on the webhook event

      res.json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(400).json({ message: "Webhook error" });
    }
  });

  // PagSeguro routes
  app.post("/api/payment/pagseguro", isAuthenticated, async (req, res) => {
    try {
      const { amount, description } = req.body;

      const payment = await paymentService.createPagSeguroPayment(amount, description);
      res.json(payment);
    } catch (error) {
      console.error("Error creating PagSeguro payment:", error);
      res.status(500).json({ message: "Failed to create PagSeguro payment" });
    }
  });

  // Billing dashboard routes
  app.get("/api/billing/dashboard", isAuthenticated, async (req, res) => {
    try {
      // Mock billing analytics
      const analytics = {
        totalRevenue: 15750.00,
        monthlyRecurring: 5250.00,
        activeSubscriptions: 12,
        churnRate: 2.5,
        averageRevenuePerUser: 437.50,
        recentTransactions: [
          {
            id: 'txn_001',
            amount: 99.90,
            customer: 'Cliente A',
            date: new Date(),
            status: 'completed'
          },
          {
            id: 'txn_002',
            amount: 199.90,
            customer: 'Cliente B',
            date: new Date(Date.now() - 86400000),
            status: 'completed'
          }
        ]
      };

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching billing dashboard:", error);
      res.status(500).json({ message: "Failed to fetch billing dashboard" });
    }
  });

  // Plans and pricing routes
  app.get("/api/billing/plans", async (req, res) => {
    try {
      const plans = [
        {
          id: 'starter',
          name: 'Starter',
          price: 99.90,
          interval: 'month',
          features: [
            'Até 5 clientes',
            'Relatórios básicos',
            'Suporte por email',
            '1 usuário'
          ],
          limits: {
            clients: 5,
            users: 1,
            storage: 1, // GB
            aiStrategies: 10
          }
        },
        {
          id: 'professional',
          name: 'Professional',
          price: 199.90,
          interval: 'month',
          features: [
            'Até 25 clientes',
            'Relatórios avançados',
            'Suporte prioritário',
            'Até 5 usuários',
            'Integrações avançadas'
          ],
          limits: {
            clients: 25,
            users: 5,
            storage: 10, // GB
            aiStrategies: 50
          }
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          price: 399.90,
          interval: 'month',
          features: [
            'Clientes ilimitados',
            'Relatórios personalizados',
            'Suporte 24/7',
            'Usuários ilimitados',
            'White label',
            'API completa'
          ],
          limits: {
            clients: -1, // unlimited
            users: -1, // unlimited
            storage: 100, // GB
            aiStrategies: -1 // unlimited
          }
        }
      ];

      res.json(plans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ message: "Failed to fetch plans" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}