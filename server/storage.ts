import {
  users,
  clients,
  tasks,
  opportunities,
  financialRecords,
  aiStrategies,
  activities,
  teamMembers,
  notifications,
  marketingIntegrations,
  campaignPerformance,
  financialReports,
  contracts,
  products,
  clientProducts,
  productSales,
  calendarEvents,
  organizations,
  plans,
  type User,
  type UpsertUser,
  type Client,
  type InsertClient,
  type Task,
  type InsertTask,
  type Opportunity,
  type InsertOpportunity,
  type FinancialRecord,
  type InsertFinancialRecord,
  type AiStrategy,
  type InsertAiStrategy,
  type Activity,
  type InsertActivity,
  type TeamMember,
  type InsertTeamMember,
  type Notification,
  type InsertNotification,
  type MarketingIntegration,
  type InsertMarketingIntegration,
  type CampaignPerformance,
  type InsertCampaignPerformance,
  type FinancialReport,
  type InsertFinancialReport,
  type Contract,
  type InsertContract,
  type Product,
  type InsertProduct,
  type ClientProduct,
  type InsertClientProduct,
  type ProductSale,
  type InsertProductSale,
  type CalendarEvent,
  type InsertCalendarEvent,
  type Organization,
  type InsertOrganization,
  type Plan,
  type InsertPlan,
} from "@shared/schema";
import { db } from "./dbConfig";
import { eq, desc, and, sql, count, gte, lte, lt, isNotNull } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Client operations
  getClients(organizationId?: number): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: number): Promise<void>;

  // Task operations
  getTasks(): Promise<Task[]>;
  getTasksByClient(clientId: number): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: number): Promise<void>;

  // Opportunity operations
  getOpportunities(): Promise<Opportunity[]>;
  getOpportunity(id: number): Promise<Opportunity | undefined>;
  createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity>;
  updateOpportunity(id: number, opportunity: Partial<InsertOpportunity>): Promise<Opportunity>;
  deleteOpportunity(id: number): Promise<void>;

  // Financial operations
  getFinancialRecords(): Promise<FinancialRecord[]>;
  getFinancialRecordsByClient(clientId: number): Promise<FinancialRecord[]>;
  createFinancialRecord(record: InsertFinancialRecord): Promise<FinancialRecord>;
  updateFinancialRecord(id: number, record: Partial<InsertFinancialRecord>): Promise<FinancialRecord>;

  // AI Strategy operations
  getAiStrategies(): Promise<AiStrategy[]>;
  getAiStrategiesByClient(clientId: number): Promise<AiStrategy[]>;
  createAiStrategy(strategy: InsertAiStrategy): Promise<AiStrategy>;
  updateAiStrategy(id: number, strategy: Partial<InsertAiStrategy>): Promise<AiStrategy>;

  // Activity operations
  getActivities(limit?: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  // Dashboard operations
  getDashboardMetrics(period?: string): Promise<{
    monthlyRevenue: number;
    activeClients: number;
    pendingTasks: number;
    pipelineValue: number;
    overduePayments: number;
    previousMonthRevenue?: number;
    newClientsThisMonth?: number;
    totalOpportunities?: number;
  }>;

  // Team operations
  getTeamMembers(): Promise<TeamMember[]>;
  getTeamMember(id: number): Promise<TeamMember | undefined>;
  getTeamMemberByUserId(userId: string): Promise<TeamMember | undefined>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: number, member: Partial<InsertTeamMember>): Promise<TeamMember>;
  deleteTeamMember(id: number): Promise<void>;

  // Notification operations
  getNotifications(recipientId?: string): Promise<Notification[]>;
  getNotification(id: number): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<void>;
  deleteNotification(id: number): Promise<void>;

  // Marketing integration operations
  getMarketingIntegrations(): Promise<MarketingIntegration[]>;
  getMarketingIntegration(id: number): Promise<MarketingIntegration | undefined>;
  getMarketingIntegrationsByClient(clientId: number): Promise<MarketingIntegration[]>;
  createMarketingIntegration(integration: InsertMarketingIntegration): Promise<MarketingIntegration>;
  updateMarketingIntegration(id: number, integration: Partial<InsertMarketingIntegration>): Promise<MarketingIntegration>;
  deleteMarketingIntegration(id: number): Promise<void>;

  // Campaign performance operations
  getCampaignPerformance(): Promise<CampaignPerformance[]>;
  getCampaignPerformanceByIntegration(integrationId: number): Promise<CampaignPerformance[]>;
  createCampaignPerformance(performance: InsertCampaignPerformance): Promise<CampaignPerformance>;

  // Financial report operations
  getFinancialReports(): Promise<FinancialReport[]>;
  getFinancialReport(id: number): Promise<FinancialReport | undefined>;
  createFinancialReport(report: InsertFinancialReport): Promise<FinancialReport>;
  deleteFinancialReport(id: number): Promise<void>;

  // Enhanced financial operations
  getFinancialRecord(id: number): Promise<FinancialRecord | undefined>;
  deleteFinancialRecord(id: number): Promise<void>;

  // Contract operations
  getContracts(): Promise<Contract[]>;
  getContract(id: number): Promise<Contract | undefined>;
  getContractsByClient(clientId: number): Promise<Contract[]>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: number, contract: Partial<InsertContract>): Promise<Contract>;
  deleteContract(id: number): Promise<void>;

  // Product operations
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;

  // Client-Product operations
  getClientProducts(clientId?: number): Promise<ClientProduct[]>;
  getClientProduct(id: number): Promise<ClientProduct | undefined>;
  createClientProduct(clientProduct: InsertClientProduct): Promise<ClientProduct>;
  updateClientProduct(id: number, clientProduct: Partial<InsertClientProduct>): Promise<ClientProduct>;
  deleteClientProduct(id: number): Promise<void>;

  // Product Sales operations
  getProductSales(): Promise<ProductSale[]>;
  getProductSalesByClient(clientId: number): Promise<ProductSale[]>;
  getProductSalesByProduct(productId: number): Promise<ProductSale[]>;
  createProductSale(sale: InsertProductSale): Promise<ProductSale>;

  // Product Analytics
  getProductAnalytics(): Promise<{
    topSellingProducts: Array<{
      product: Product;
      totalSales: number;
      totalRevenue: number;
      avgPrice: number;
    }>;
    clientCostEstimates: Array<{
      client: Client;
      products: Array<{
        product: Product;
        estimatedMonthlyCost: number;
        customPrice: number;
        profitMargin: number;
      }>;
      totalMonthlyCost: number;
    }>;
  }>;

  // Calendar operations
  getCalendarEvents(): Promise<CalendarEvent[]>;
  getCalendarEventsByDate(startDate: Date, endDate: Date): Promise<CalendarEvent[]>;
  getCalendarEvent(id: number): Promise<CalendarEvent | undefined>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: number, event: Partial<InsertCalendarEvent>): Promise<CalendarEvent>;
  deleteCalendarEvent(id: number): Promise<void>;
  getCalendarEventsByOrganizer(organizer: string): Promise<CalendarEvent[]>;
  getCalendarEventsByClient(clientId: number): Promise<CalendarEvent[]>;

  // Billing operations
  getOrganization(id: number): Promise<Organization | undefined>;
  updateOrganization(id: number, data: Partial<Organization>): Promise<Organization>;
  getActiveOrganizations(): Promise<Organization[]>;
  getOrganizationsWithStripeSubscriptions(): Promise<Organization[]>;
  getOrganizationLimits(organizationId: number): Promise<any>;
  getUsersCount(organizationId: number): Promise<[number]>;
  getClientsCount(organizationId: number): Promise<[number]>;
  getAiStrategiesCount(organizationId: number, startDate: Date, endDate: Date): Promise<[number]>;
  getIntegrationsCount(organizationId: number): Promise<[number]>;

  // Organization methods
  createOrganization(data: InsertOrganization): Promise<Organization>;
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationBySubdomain(subdomain: string): Promise<Organization | undefined>;
  updateOrganization(id: number, data: Partial<InsertOrganization>): Promise<Organization>;
  getOrganizationUserCount(organizationId: number): Promise<number>;
  getOrganizationClientCount(organizationId: number): Promise<number>;

  // Plan methods
  createPlan(data: InsertPlan): Promise<Plan>;
  getPlan(id: number): Promise<Plan | undefined>;
  getPlans(): Promise<Plan[]>;
  updatePlan(id: number, data: Partial<InsertPlan>): Promise<Plan>;

  // User methods
  updateUser(id: string, data: Partial<UpsertUser>): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  private db;

  constructor() {
    this.db = db;
  }

  // Organization methods
  async createOrganization(data: InsertOrganization) {
    const [organization] = await this.db.insert(organizations).values(data).returning();
    return organization;
  }

  async getOrganization(id: number) {
    const [organization] = await this.db.select().from(organizations).where(eq(organizations.id, id));
    return organization;
  }

  async getOrganizationBySubdomain(subdomain: string) {
    const [organization] = await this.db.select().from(organizations).where(eq(organizations.subdomain, subdomain));
    return organization;
  }

  async updateOrganization(id: number, data: Partial<InsertOrganization>) {
    const [organization] = await this.db.update(organizations).set(data).where(eq(organizations.id, id)).returning();
    return organization;
  }

  async getOrganizationUserCount(organizationId: number) {
    const result = await this.db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.organizationId, organizationId), eq(users.isActive, true)));
    return result[0]?.count || 0;
  }

  async getOrganizationClientCount(organizationId: number) {
    const result = await this.db.select({ count: sql<number>`count(*)` })
      .from(clients)
      .where(eq(clients.organizationId, organizationId));
    return result[0]?.count || 0;
  }

  // Plan methods
  async createPlan(data: InsertPlan) {
    const [plan] = await this.db.insert(plans).values(data).returning();
    return plan;
  }

  async getPlan(id: number) {
    const [plan] = await this.db.select().from(plans).where(eq(plans.id, id));
    return plan;
  }

  async getPlans() {
    return await this.db.select().from(plans).where(eq(plans.isActive, true));
  }

  async updatePlan(id: number, data: Partial<InsertPlan>) {
    const [plan] = await this.db.update(plans).set(data).where(eq(plans.id, id)).returning();
    return plan;
  }

  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<UpsertUser>) {
    const [user] = await this.db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  // Client operations
  async getClients(organizationId?: number) {
    try {
      if (organizationId) {
        return await this.db.select().from(clients)
          .where(eq(clients.organizationId, organizationId))
          .orderBy(clients.createdAt);
      }
      return await this.db.select().from(clients).orderBy(clients.createdAt);
    } catch (error) {
      console.error("Database connection error - getClients:", error);
      return [];
    }
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    try {
      const [newClient] = await db.insert(clients).values(client).returning();
      return newClient;
    } catch (error) {
      console.error("Database error - createClient:", error);
      throw new Error("Failed to create client in database");
    }
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client> {
    const [updatedClient] = await db
      .update(clients)
      .set({ ...client, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return updatedClient;
  }

  async deleteClient(id: number): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  // Task operations
  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async getTasksByClient(clientId: number): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.clientId, clientId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task> {
    const updateData: any = { ...task, updatedAt: new Date() };
    if (task.status === "completed" && !(task as any).completedAt) {
      updateData.completedAt = new Date();
    }
    const [updatedTask] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // Opportunity operations
  async getOpportunities(): Promise<Opportunity[]> {
    return await db.select().from(opportunities).orderBy(desc(opportunities.createdAt));
  }

  async getOpportunity(id: number): Promise<Opportunity | undefined> {
    const [opportunity] = await db.select().from(opportunities).where(eq(opportunities.id, id));
    return opportunity;
  }

  async createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity> {
    // Convert value to string if it's a number
    const opportunityData = {
      ...opportunity,
      value: typeof opportunity.value === 'number' ? opportunity.value.toString() : opportunity.value
    };
    const [newOpportunity] = await db.insert(opportunities).values([opportunityData]).returning();
    return newOpportunity;
  }

  async updateOpportunity(id: number, opportunity: Partial<InsertOpportunity>): Promise<Opportunity> {
    // Convert value to string if it's a number
    const updateData: any = {
      ...opportunity,
      updatedAt: new Date()
    };

    if (updateData.value !== undefined) {
      updateData.value = typeof updateData.value === 'number' ? updateData.value.toString() : updateData.value;
    }

    const [updatedOpportunity] = await db
      .update(opportunities)
      .set(updateData)
      .where(eq(opportunities.id, id))
      .returning();
    return updatedOpportunity;
  }

  async deleteOpportunity(id: number): Promise<void> {
    await db.delete(opportunities).where(eq(opportunities.id, id));
  }

  // Financial operations
  async getFinancialRecords(): Promise<FinancialRecord[]> {
    return await db.select().from(financialRecords).orderBy(desc(financialRecords.createdAt));
  }

  async getFinancialRecordsByClient(clientId: number): Promise<FinancialRecord[]> {
    return await db
      .select()
      .from(financialRecords)
      .where(eq(financialRecords.clientId, clientId))
      .orderBy(desc(financialRecords.createdAt));
  }

  async createFinancialRecord(record: InsertFinancialRecord): Promise<FinancialRecord> {
    const recordData = {
      ...record,
      amount: record.amount?.toString() || "0"
    };
    const [newRecord] = await db.insert(financialRecords).values(recordData).returning();
    return newRecord;
  }

  async updateFinancialRecord(id: number, record: Partial<InsertFinancialRecord>): Promise<FinancialRecord> {
    const updateData = {
      ...record,
      updatedAt: new Date(),
      ...(record.amount && { amount: record.amount.toString() })
    };
    const [updatedRecord] = await db
      .update(financialRecords)
      .set(updateData)
      .where(eq(financialRecords.id, id))
      .returning();
    return updatedRecord;
  }

  // AI Strategy operations
  async getAiStrategies(): Promise<AiStrategy[]> {
    return await db.select().from(aiStrategies).orderBy(desc(aiStrategies.createdAt));
  }

  async getAiStrategiesByClient(clientId: number): Promise<AiStrategy[]> {
    return await db
      .select()
      .from(aiStrategies)
      .where(eq(aiStrategies.clientId, clientId))
      .orderBy(desc(aiStrategies.createdAt));
  }

  async createAiStrategy(strategy: InsertAiStrategy): Promise<AiStrategy> {
    const strategyData: any = {
      ...strategy,
      ...(strategy.budget !== undefined && { budget: strategy.budget.toString() }),
      status: strategy.status || "created"
    };
    const [newStrategy] = await db.insert(aiStrategies).values([strategyData]).returning();
    return newStrategy;
  }

  async updateAiStrategy(id: number, strategy: Partial<InsertAiStrategy>): Promise<AiStrategy> {
    const updateData: any = {
      ...strategy,
      ...(strategy.budget !== undefined && { budget: strategy.budget.toString() })
    };
    const [updatedStrategy] = await db
      .update(aiStrategies)
      .set(updateData)
      .where(eq(aiStrategies.id, id))
      .returning();
    return updatedStrategy;
  }

  // Activity operations
  async getActivities(limit = 50): Promise<Activity[]> {
    return await db
      .select()
      .from(activities)
      .orderBy(desc(activities.createdAt))
      .limit(limit);
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db.insert(activities).values(activity).returning();
    return newActivity;
  }

  // Dashboard operations
  async getDashboardMetrics(period: string = "current_month"): Promise<{
    monthlyRevenue: number;
    activeClients: number;
    pendingTasks: number;
    pipelineValue: number;
    overduePayments: number;
    previousMonthRevenue?: number;
    newClientsThisMonth?: number;
    totalOpportunities?: number;
  }> {
    // Calculate date ranges based on period
    const now = new Date();
    let startDate: Date;
    let endDate = new Date();
    let previousStartDate: Date | null = null;
    let previousEndDate: Date | null = null;

    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousEndDate = new Date(startDate);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousEndDate = new Date(startDate);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(startDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        previousEndDate = new Date(startDate);
        break;
      case "current_month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "last_month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        previousEndDate = new Date(now.getFullYear(), now.getMonth() - 1, 0);
        break;
      case "current_year":
        startDate = new Date(now.getFullYear(), 0, 1);
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
        previousEndDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get current period revenue from paid financial records
    const [revenueResult] = await db
      .select({ 
        total: sql`COALESCE(SUM(amount), 0)`.as('total')
      })
      .from(financialRecords)
      .where(
        and(
          eq(financialRecords.status, "paid"),
          gte(financialRecords.paidDate, startDate.toISOString().split('T')[0]),
          lte(financialRecords.paidDate, endDate.toISOString().split('T')[0])
        )
      );

    // Get previous period revenue for comparison  
    let previousRevenue = 0;
    if (previousStartDate && previousEndDate) {
      const [prevRevenueResult] = await db
        .select({ 
          total: sql`COALESCE(SUM(amount), 0)`.as('total')
        })
        .from(financialRecords)
        .where(
          and(
            eq(financialRecords.status, "paid"),
            gte(financialRecords.paidDate, previousStartDate.toISOString().split('T')[0]),
            lte(financialRecords.paidDate, previousEndDate.toISOString().split('T')[0])
          )
        );
      previousRevenue = Number(prevRevenueResult.total) || 0;
    }

    // Get active clients count in the period
    const [activeClientsResult] = await db
      .select({ count: count() })
      .from(clients)
      .where(
        and(
          gte(clients.createdAt, startDate),
          lte(clients.createdAt, endDate)
        )
      );

    // Get pending tasks count
    const [pendingTasksResult] = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.status, "pending"),
          gte(tasks.createdAt, startDate),
          lte(tasks.createdAt, endDate)
        )
      );

    // Get pipeline value from opportunities created in the period
    const [pipelineResult] = await db
      .select({ 
        total: sql`COALESCE(SUM(value), 0)`.as('total')
      })
      .from(opportunities)
      .where(
        and(
          gte(opportunities.createdAt, startDate),
          lte(opportunities.createdAt, endDate)
        )
      );

    // Get overdue payments count
    const [overdueResult] = await db
      .select({ count: count() })
      .from(financialRecords)
      .where(
        and(
          eq(financialRecords.status, "pending"),
          lt(financialRecords.dueDate, new Date().toISOString().split('T')[0])
        )
      );

    // Get new clients count in the period
    const [newClientsResult] = await db
      .select({ count: count() })
      .from(clients)
      .where(
        and(
          gte(clients.createdAt, startDate),
          lte(clients.createdAt, endDate)
        )
      );

    // Get total opportunities count in the period
    const [totalOpportunitiesResult] = await db
      .select({ count: count() })
      .from(opportunities)
      .where(
        and(
          gte(opportunities.createdAt, startDate),
          lte(opportunities.createdAt, endDate)
        )
      );

    return {
      monthlyRevenue: Number(revenueResult.total) || 0,
      activeClients: activeClientsResult.count,
      pendingTasks: pendingTasksResult.count,
      pipelineValue: Number(pipelineResult.total) || 0,
      overduePayments: overdueResult.count,
      previousMonthRevenue: previousRevenue,
      newClientsThisMonth: newClientsResult.count,
      totalOpportunities: totalOpportunitiesResult.count,
    };
  }

  // Team operations
  async getTeamMembers(): Promise<TeamMember[]> {
    return await db.select().from(teamMembers).orderBy(desc(teamMembers.createdAt));
  }

  async getTeamMember(id: number): Promise<TeamMember | undefined> {
    const [member] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
    return member;
  }

  async getTeamMemberByUserId(userId: string): Promise<TeamMember | undefined> {
    const [member] = await db.select().from(teamMembers).where(eq(teamMembers.userId, userId));
    return member;
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [newMember] = await db.insert(teamMembers).values(member).returning();
    return newMember;
  }

  async updateTeamMember(id: number, member: Partial<InsertTeamMember>): Promise<TeamMember> {
    const [updatedMember] = await db
      .update(teamMembers)
      .set({ ...member, updatedAt: new Date() })
      .where(eq(teamMembers.id, id))
      .returning();
    return updatedMember;
  }

  async deleteTeamMember(id: number): Promise<void> {
    await db.delete(teamMembers).where(eq(teamMembers.id, id));
  }

  // Notification operations
  async getNotifications(recipientId?: string): Promise<Notification[]> {
    const query = db.select().from(notifications);
    if (recipientId) {
      return await query.where(eq(notifications.recipientId, recipientId)).orderBy(desc(notifications.createdAt));
    }
    return await query.orderBy(desc(notifications.createdAt));
  }

  async getNotification(id: number): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async deleteNotification(id: number): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  // Marketing integration operations
  async getMarketingIntegrations(): Promise<MarketingIntegration[]> {
    return await db.select().from(marketingIntegrations).orderBy(desc(marketingIntegrations.createdAt));
  }

  async getMarketingIntegration(id: number): Promise<MarketingIntegration | undefined> {
    const [integration] = await db.select().from(marketingIntegrations).where(eq(marketingIntegrations.id, id));
    return integration;
  }

  async getMarketingIntegrationsByClient(clientId: number): Promise<MarketingIntegration[]> {
    return await db
      .select()
      .from(marketingIntegrations)
      .where(eq(marketingIntegrations.clientId, clientId))
      .orderBy(desc(marketingIntegrations.createdAt));
  }

  async createMarketingIntegration(integration: InsertMarketingIntegration): Promise<MarketingIntegration> {
    const [newIntegration] = await db.insert(marketingIntegrations).values(integration).returning();
    return newIntegration;
  }

  async updateMarketingIntegration(id: number, integration: Partial<InsertMarketingIntegration>): Promise<MarketingIntegration> {
    const [updatedIntegration] = await db
      .update(marketingIntegrations)
      .set({ ...integration, updatedAt: new Date() })
      .where(eq(marketingIntegrations.id, id))
      .returning();
    return updatedIntegration;
  }

  async deleteMarketingIntegration(id: number): Promise<void> {
    await db.delete(marketingIntegrations).where(eq(marketingIntegrations.id, id));
  }

  // Campaign performance operations
  async getCampaignPerformance(): Promise<CampaignPerformance[]> {
    return await db.select().from(campaignPerformance).orderBy(desc(campaignPerformance.date));
  }

  async getCampaignPerformanceByIntegration(integrationId: number): Promise<CampaignPerformance[]> {
    return await db
      .select()
      .from(campaignPerformance)
      .where(eq(campaignPerformance.integrationId, integrationId))
      .orderBy(desc(campaignPerformance.date));
  }

  async createCampaignPerformance(performance: InsertCampaignPerformance): Promise<CampaignPerformance> {
    const [newPerformance] = await db.insert(campaignPerformance).values(performance).returning();
    return newPerformance;
  }

  // Campaign performance operations
  async getCampaignPerformance(): Promise<CampaignPerformance[]> {
    return await db.select().from(campaignPerformance).orderBy(desc(campaignPerformance.createdAt));
  }

  async getCampaignPerformanceByIntegration(integrationId: number): Promise<CampaignPerformance[]> {
    return await db
      .select()
      .from(campaignPerformance)
      .where(eq(campaignPerformance.integrationId, integrationId))
      .orderBy(desc(campaignPerformance.date));
  }

  async createCampaignPerformance(performance: InsertCampaignPerformance): Promise<CampaignPerformance> {
    const [newPerformance] = await db.insert(campaignPerformance).values(performance).returning();
    return newPerformance;
  }

  // Financial report operations
  async getFinancialReports(): Promise<FinancialReport[]> {
    return await db.select().from(financialReports).orderBy(desc(financialReports.createdAt));
  }

  async getFinancialReport(id: number): Promise<FinancialReport | undefined> {
    const [report] = await db.select().from(financialReports).where(eq(financialReports.id, id));
    return report;
  }

  async createFinancialReport(report: InsertFinancialReport): Promise<FinancialReport> {
    const [newReport] = await db.insert(financialReports).values(report).returning();
    return newReport;
  }

  async deleteFinancialReport(id: number): Promise<void> {
    await db.delete(financialReports).where(eq(financialReports.id, id));
  }

  // Enhanced financial operations
  async getFinancialRecord(id: number): Promise<FinancialRecord | undefined> {
    const [record] = await db.select().from(financialRecords).where(eq(financialRecords.id, id));
    return record;
  }

  async deleteFinancialRecord(id: number): Promise<void> {
    await db.delete(financialRecords).where(eq(financialRecords.id, id));
  }

  // Contract operations
  async getContracts(): Promise<Contract[]> {
    return await db.select().from(contracts).orderBy(desc(contracts.createdAt));
  }

  async getContract(id: number): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    return contract;
  }

  async getContractsByClient(clientId: number): Promise<Contract[]> {
    return await db.select().from(contracts).where(eq(contracts.clientId, clientId))
      .orderBy(desc(contracts.createdAt));
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const [newContract] = await db.insert(contracts).values(contract).returning();

    // Log activity
    await this.createActivity({
      type: "contract_created",
      description: `Contrato "${newContract.title}" criado`,
      clientId: newContract.clientId,
    });

    return newContract;
  }

  async updateContract(id: number, contract: Partial<InsertContract>): Promise<Contract> {
    const [updatedContract] = await db.update(contracts)
      .set({ ...contract, updatedAt: new Date() })
      .where(eq(contracts.id, id))
      .returning();
    return updatedContract;
  }

  async deleteContract(id: number): Promise<void> {
    const contract = await this.getContract(id);
    if (contract) {
      await this.createActivity({
        type: "contract_deleted", 
        description: `Contrato "${contract.title}" removido`,
        clientId: contract.clientId,
      });
    }
    await db.delete(contracts).where(eq(contracts.id, id));
  }

  // Product operations
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(desc(products.createdAt));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();

    await this.createActivity({
      type: "product_created",
      description: `Produto/serviço "${product.name}" criado na categoria ${product.category}`,
    });

    return newProduct;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<void> {
    const product = await this.getProduct(id);
    if (product) {
      await this.createActivity({
        type: "product_deleted",
        description: `Produto/serviço "${product.name}" removido`,
      });
    }
    await db.delete(products).where(eq(products.id, id));
  }

  // Client-Product operations
  async getClientProducts(clientId?: number): Promise<ClientProduct[]> {
    if (clientId) {
      return await db.select().from(clientProducts).where(eq(clientProducts.clientId, clientId));
    }
    return await db.select().from(clientProducts).orderBy(desc(clientProducts.createdAt));
  }

  async getClientProduct(id: number): Promise<ClientProduct | undefined> {
    const [clientProduct] = await db.select().from(clientProducts).where(eq(clientProducts.id, id));
    return clientProduct;
  }

  async createClientProduct(clientProduct: InsertClientProduct): Promise<ClientProduct> {
    const [newClientProduct] = await db.insert(clientProducts).values(clientProduct).returning();
    return newClientProduct;
  }

  async updateClientProduct(id: number, clientProduct: Partial<InsertClientProduct>): Promise<ClientProduct> {
    const [updatedClientProduct] = await db
      .update(clientProducts)
      .set({ ...clientProduct, updatedAt: new Date() })
      .where(eq(clientProducts.id, id))
      .returning();
    return updatedClientProduct;
  }

  async deleteClientProduct(id: number): Promise<void> {
    await db.delete(clientProducts).where(eq(clientProducts.id, id));
  }

  // Product Sales operations
  async getProductSales(): Promise<ProductSale[]> {
    return await db.select().from(productSales).orderBy(desc(productSales.saleDate));
  }

  async getProductSalesByClient(clientId: number): Promise<ProductSale[]> {
    return await db.select().from(productSales).where(eq(productSales.clientId, clientId));
  }

  async getProductSalesByProduct(productId: number): Promise<ProductSale[]> {
    return await db.select().from(productSales).where(eq(productSales.productId, productId));
  }

  async createProductSale(sale: InsertProductSale): Promise<ProductSale> {
    const profit = sale.actualCost ? 
      (parseFloat(sale.salePrice.toString()) - parseFloat(sale.actualCost.toString())).toString() : 
      null;

    const [newSale] = await db.insert(productSales).values({
      ...sale,
      profit
    }).returning();

    return newSale;
  }

  // Product Analytics
  async getProductAnalytics(): Promise<{
    topSellingProducts: Array<{
      product: Product;
      totalSales: number;
      totalRevenue: number;
      avgPrice: number;
    }>;
    clientCostEstimates: Array<{
      client: Client;
      products: Array<{
        product: Product;
        estimatedMonthlyCost: number;
        customPrice: number;
        profitMargin: number;
      }>;
      totalMonthlyCost: number;
    }>;
  }> {
    // Get top selling products
    const topSellingQuery = await db
      .select({
        product: products,
        totalSales: count(productSales.id),
        totalRevenue: sql<number>`COALESCE(SUM(${productSales.salePrice}), 0)`,
        avgPrice: sql<number>`COALESCE(AVG(${productSales.salePrice}), 0)`
      })
      .from(products)
      .leftJoin(productSales, eq(products.id, productSales.productId))
      .groupBy(products.id)
      .orderBy(sql`COUNT(${productSales.id}) DESC`)
      .limit(10);

    const topSellingProducts = topSellingQuery.map(row => ({
      product: row.product,
      totalSales: Number(row.totalSales || 0),
      totalRevenue: Number(row.totalRevenue || 0),
      avgPrice: Number(row.avgPrice || 0)
    }));

    // Get client cost estimates
    const clientsData = await db.select().from(clients).where(eq(clients.status, "active"));
    const clientCostEstimates = [];

    for (const client of clientsData) {
      const clientProductsData = await db
        .select({
          clientProduct: clientProducts,
          product: products
        })
        .from(clientProducts)
        .innerJoin(products, eq(clientProducts.productId, products.id))
        .where(and(
          eq(clientProducts.clientId, client.id),
          eq(clientProducts.isActive, true)
        ));

      const productCosts = clientProductsData.map(({ clientProduct, product }) => {
        const customPrice = clientProduct.customPrice ? Number(clientProduct.customPrice) : Number(product.basePrice);
        const estimatedCost = clientProduct.customCost ? Number(clientProduct.customCost) : Number(product.costEstimate);
        const profitMargin = customPrice > 0 ? ((customPrice - estimatedCost) / customPrice) * 100 : 0;

        return {
          product,
          estimatedMonthlyCost: estimatedCost,
          customPrice,
          profitMargin
        };
      });

      const totalMonthlyCost = productCosts.reduce((sum, p) => sum + p.estimatedMonthlyCost, 0);

      if (productCosts.length > 0) {
        clientCostEstimates.push({
          client,
          products: productCosts,
          totalMonthlyCost
        });
      }
    }

    return {
      topSellingProducts,
      clientCostEstimates
    };
  }

  // Calendar operations
  async getCalendarEvents(): Promise<CalendarEvent[]> {
    return await db.select().from(calendarEvents).orderBy(calendarEvents.startDate);
  }

  async getCalendarEventsByDate(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    return await db
      .select()
      .from(calendarEvents)
      .where(and(
        gte(calendarEvents.startDate, startDate),
        lte(calendarEvents.startDate, endDate)
      ))
      .orderBy(calendarEvents.startDate);
  }

  async getCalendarEvent(id: number): Promise<CalendarEvent | undefined> {
    const [event] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id));
    return event;
  }

  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    const [newEvent] = await db.insert(calendarEvents).values(event).returning();
    return newEvent;
  }

  async updateCalendarEvent(id: number, event: Partial<InsertCalendarEvent>): Promise<CalendarEvent> {
    const [updatedEvent] = await db
      .update(calendarEvents)
      .set({ ...event, updatedAt: new Date() })
      .where(eq(calendarEvents.id, id))
      .returning();
    return updatedEvent;
  }

  async deleteCalendarEvent(id: number): Promise<void> {
    await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  }

  async getCalendarEventsByOrganizer(organizer: string): Promise<CalendarEvent[]> {
    return await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.organizer, organizer))
      .orderBy(calendarEvents.startDate);
  }

  async getCalendarEventsByClient(clientId: number): Promise<CalendarEvent[]> {
    return await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.clientId, clientId))
      .orderBy(calendarEvents.startDate);
  }
}

export const storage = new DatabaseStorage();