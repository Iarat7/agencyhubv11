import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Organizations table (multi-tenant support)
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  subdomain: varchar("subdomain", { length: 100 }).unique().notNull(),
  planId: integer("plan_id").references(() => plans.id),
  isActive: boolean("is_active").default(true),
  maxUsers: integer("max_users").default(5),
  maxClients: integer("max_clients").default(50),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Plans table
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  features: text("features").array(),
  maxUsers: integer("max_users").default(5),
  maxClients: integer("max_clients").default(50),
  hasAiStrategies: boolean("has_ai_strategies").default(false),
  hasIntegrations: boolean("has_integrations").default(false),
  hasAdvancedReports: boolean("has_advanced_reports").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  organizationId: integer("organization_id").references(() => organizations.id),
  role: varchar("role", { length: 50 }).default("user"), // owner, admin, user
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clients table
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 255 }),
  industry: varchar("industry", { length: 100 }),
  contactPerson: varchar("contact_person", { length: 255 }),
  monthlyValue: decimal("monthly_value", { precision: 10, scale: 2 }),
  projectCost: decimal("project_cost", { precision: 10, scale: 2 }),
  startDate: date("start_date"),
  status: varchar("status", { length: 50 }).default("active"), // active, inactive, prospect
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  clientId: integer("client_id").references(() => clients.id),
  assignedTo: varchar("assigned_to", { length: 255 }),
  status: varchar("status", { length: 50 }).default("pending"), // pending, in_progress, completed, overdue
  priority: varchar("priority", { length: 20 }).default("medium"), // low, medium, high, urgent
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pipeline opportunities table
export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  value: decimal("value", { precision: 10, scale: 2 }),
  stage: varchar("stage", { length: 50 }).default("prospecting"), // prospecting, qualification, proposal, negotiation, closed_won, closed_lost
  probability: integer("probability").default(0), // 0-100
  expectedCloseDate: date("expected_close_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Financial records table
export const financialRecords = pgTable("financial_records", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id),
  type: varchar("type", { length: 50 }).notNull(), // invoice, payment, contract
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: date("due_date"),
  paidDate: date("paid_date"),
  status: varchar("status", { length: 50 }).default("pending"), // pending, paid, overdue, cancelled
  description: text("description"),
  invoiceNumber: varchar("invoice_number", { length: 50 }),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }),
  attachments: text("attachments").array(),
  recurringType: varchar("recurring_type", { length: 20 }), // monthly, quarterly, yearly
  category: varchar("category", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team members table
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 50 }).notNull(), // admin, manager, analyst, designer, developer
  permissions: text("permissions").array().default([]),
  department: varchar("department", { length: 100 }),
  startDate: date("start_date"),
  salary: decimal("salary", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").default(true),
  profileImage: varchar("profile_image"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // info, warning, error, success
  recipientId: varchar("recipient_id"),
  isRead: boolean("is_read").default(false),
  actionUrl: varchar("action_url"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Marketing integrations table
export const marketingIntegrations = pgTable("marketing_integrations", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id),
  platform: varchar("platform", { length: 50 }).notNull(), // facebook, google, instagram, tiktok
  accountId: varchar("account_id"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  isActive: boolean("is_active").default(true),
  lastSync: timestamp("last_sync"),
  syncFrequency: varchar("sync_frequency", { length: 20 }).default("daily"),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Campaign performance table
export const campaignPerformance = pgTable("campaign_performance", {
  id: serial("id").primaryKey(),
  integrationId: integer("integration_id").references(() => marketingIntegrations.id),
  campaignId: varchar("campaign_id").notNull(),
  campaignName: varchar("campaign_name"),
  impressions: integer("impressions"),
  clicks: integer("clicks"),
  conversions: integer("conversions"),
  spend: decimal("spend", { precision: 10, scale: 2 }),
  revenue: decimal("revenue", { precision: 10, scale: 2 }),
  ctr: decimal("ctr", { precision: 5, scale: 4 }),
  cpc: decimal("cpc", { precision: 10, scale: 2 }),
  roas: decimal("roas", { precision: 10, scale: 2 }),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Financial reports table
export const financialReports = pgTable("financial_reports", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // income_statement, balance_sheet, cash_flow, custom
  period: varchar("period", { length: 50 }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  generatedBy: varchar("generated_by").notNull(),
  data: jsonb("data"),
  filePath: varchar("file_path"),
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// AI strategies table
export const aiStrategies = pgTable("ai_strategies", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // content_strategy, marketing_plan, growth_strategy
  objective: varchar("objective", { length: 100 }), // brand_awareness, lead_generation, sales_increase, engagement, traffic
  customObjective: text("custom_objective"), // Custom objective description
  targetPeriod: varchar("target_period", { length: 50 }), // 1_month, 3_months, 6_months, 1_year, custom
  customPeriod: varchar("custom_period", { length: 100 }), // Custom period description
  budget: decimal("budget", { precision: 10, scale: 2 }), // Budget for the strategy
  budgetPeriod: varchar("budget_period", { length: 20 }).default("monthly"), // monthly, quarterly, yearly, total
  status: varchar("status", { length: 30 }).default("created"), // created, analyzing, approved, rejected, executing
  approvedBy: varchar("approved_by"),
  rejectionReason: text("rejection_reason"),
  approvedAt: timestamp("approved_at"),
  executionStartDate: date("execution_start_date"),
  executionEndDate: date("execution_end_date"),
  strategyCreationDate: date("strategy_creation_date"), // User-defined creation date for planning
  generatedAt: timestamp("generated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Activities table for tracking actions
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 50 }).notNull(), // task_completed, payment_received, strategy_generated, etc.
  description: text("description").notNull(),
  userId: varchar("user_id").references(() => users.id),
  clientId: integer("client_id").references(() => clients.id),
  metadata: jsonb("metadata"), // additional data specific to activity type
  createdAt: timestamp("created_at").defaultNow(),
});

export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  status: varchar("status", { length: 50 }).default("active").notNull(),
  value: decimal("value", { precision: 15, scale: 2 }),
  documentUrl: varchar("document_url", { length: 500 }),
  documentName: varchar("document_name", { length: 255 }),
  renewalType: varchar("renewal_type", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Products/Services table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(), // SEO, Social Media, PPC, Web Design, etc.
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  costEstimate: decimal("cost_estimate", { precision: 10, scale: 2 }).notNull(), // Internal cost to deliver
  profitMargin: decimal("profit_margin", { precision: 5, scale: 2 }), // Percentage
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client-Product relationships with custom pricing and cost estimates
export const clientProducts = pgTable("client_products", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  customPrice: decimal("custom_price", { precision: 10, scale: 2 }), // Override base price
  customCost: decimal("custom_cost", { precision: 10, scale: 2 }), // Override cost estimate
  isActive: boolean("is_active").default(true),
  startDate: date("start_date"),
  endDate: date("end_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sales tracking for products
export const productSales = pgTable("product_sales", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  clientProductId: integer("client_product_id").references(() => clientProducts.id),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }).notNull(),
  actualCost: decimal("actual_cost", { precision: 10, scale: 2 }), // Real cost incurred
  profit: decimal("profit", { precision: 10, scale: 2 }), // salePrice - actualCost
  saleDate: date("sale_date").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("active"), // active, completed, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Add organizationId to existing tables
// export const clients = pgTable("clients", {
//   id: serial("id").primaryKey(),
//   organizationId: integer("organization_id").references(() => organizations.id).notNull(),
//   name: varchar("name", { length: 255 }).notNull(),
//   email: varchar("email", { length: 255 }),
//   phone: varchar("phone", { length: 50 }),
//   company: varchar("company", { length: 255 }),
//   industry: varchar("industry", { length: 100 }),
//   contactPerson: varchar("contact_person", { length: 255 }),
//   monthlyValue: decimal("monthly_value", { precision: 10, scale: 2 }),
//   projectCost: decimal("project_cost", { precision: 10, scale: 2 }),
//   startDate: date("start_date"),
//   status: varchar("status", { length: 50 }).default("active"), // active, inactive, prospect
//   notes: text("notes"),
//   createdAt: timestamp("created_at").defaultNow(),
//   updatedAt: timestamp("updated_at").defaultNow(),
// });

// Relations
export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  plan: one(plans, {
    fields: [organizations.planId],
    references: [plans.id],
  }),
  users: many(users),
  clients: many(clients),
}));

export const plansRelations = relations(plans, ({ many }) => ({
  organizations: many(organizations),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  activities: many(activities),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [clients.organizationId],
    references: [organizations.id],
  }),
  tasks: many(tasks),
  financialRecords: many(financialRecords),
  aiStrategies: many(aiStrategies),
  activities: many(activities),
  marketingIntegrations: many(marketingIntegrations),
  contracts: many(contracts),
  clientProducts: many(clientProducts),
  productSales: many(productSales),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  client: one(clients, {
    fields: [tasks.clientId],
    references: [clients.id],
  }),
}));

export const financialRecordsRelations = relations(financialRecords, ({ one }) => ({
  client: one(clients, {
    fields: [financialRecords.clientId],
    references: [clients.id],
  }),
}));

export const aiStrategiesRelations = relations(aiStrategies, ({ one }) => ({
  client: one(clients, {
    fields: [aiStrategies.clientId],
    references: [clients.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [activities.clientId],
    references: [clients.id],
  }),
}));

export const marketingIntegrationsRelations = relations(marketingIntegrations, ({ one, many }) => ({
  client: one(clients, {
    fields: [marketingIntegrations.clientId],
    references: [clients.id],
  }),
  campaigns: many(campaignPerformance),
}));

export const campaignPerformanceRelations = relations(campaignPerformance, ({ one }) => ({
  integration: one(marketingIntegrations, {
    fields: [campaignPerformance.integrationId],
    references: [marketingIntegrations.id],
  }),
}));

export const contractsRelations = relations(contracts, ({ one }) => ({
  client: one(clients, {
    fields: [contracts.clientId],
    references: [clients.id],
  }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  clientProducts: many(clientProducts),
  productSales: many(productSales),
}));

export const clientProductsRelations = relations(clientProducts, ({ one, many }) => ({
  client: one(clients, {
    fields: [clientProducts.clientId],
    references: [clients.id],
  }),
  product: one(products, {
    fields: [clientProducts.productId],
    references: [products.id],
  }),
  sales: many(productSales),
}));

export const productSalesRelations = relations(productSales, ({ one }) => ({
  client: one(clients, {
    fields: [productSales.clientId],
    references: [clients.id],
  }),
  product: one(products, {
    fields: [productSales.productId],
    references: [products.id],
  }),
  clientProduct: one(clientProducts, {
    fields: [productSales.clientProductId],
    references: [clientProducts.id],
  }),
}));

// Insert schemas
export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  monthlyValue: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return typeof val === 'string' ? val : val.toString();
  }),
  projectCost: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return typeof val === 'string' ? val : val.toString();
  }),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
}).extend({
  clientId: z.union([z.string(), z.number(), z.null()]).optional().transform((val) => {
    if (val === null || val === undefined || val === "" || val === "0") return null;
    return typeof val === 'string' ? parseInt(val) : val;
  }),
});

export const insertOpportunitySchema = createInsertSchema(opportunities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  value: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return typeof val === 'string' ? parseFloat(val) : val;
  }),
  probability: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return typeof val === 'string' ? parseInt(val) : val;
  }),
});

export const insertFinancialRecordSchema = createInsertSchema(financialRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiStrategySchema = createInsertSchema(aiStrategies).omit({
  id: true,
  generatedAt: true,
  createdAt: true,
}).extend({
  budget: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return typeof val === 'string' ? parseFloat(val) : val;
  }),
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertMarketingIntegrationSchema = createInsertSchema(marketingIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignPerformanceSchema = createInsertSchema(campaignPerformance).omit({
  id: true,
  createdAt: true,
});

export const insertFinancialReportSchema = createInsertSchema(financialReports).omit({
  id: true,
  createdAt: true,
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientProductSchema = createInsertSchema(clientProducts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSaleSchema = createInsertSchema(productSales).omit({
  id: true,
  createdAt: true,
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlanSchema = createInsertSchema(plans).omit({
  id: true,
  createdAt: true,
});

// Types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Plan = typeof plans.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Opportunity = typeof opportunities.$inferSelect;
export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;
export type FinancialRecord = typeof financialRecords.$inferSelect;
export type InsertFinancialRecord = z.infer<typeof insertFinancialRecordSchema>;
export type AiStrategy = typeof aiStrategies.$inferSelect;
export type InsertAiStrategy = z.infer<typeof insertAiStrategySchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type MarketingIntegration = typeof marketingIntegrations.$inferSelect;
export type InsertMarketingIntegration = z.infer<typeof insertMarketingIntegrationSchema>;
export type CampaignPerformance = typeof campaignPerformance.$inferSelect;
export type InsertCampaignPerformance = z.infer<typeof insertCampaignPerformanceSchema>;
export type FinancialReport = typeof financialReports.$inferSelect;
export type InsertFinancialReport = z.infer<typeof insertFinancialReportSchema>;
export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type ClientProduct = typeof clientProducts.$inferSelect;
export type InsertClientProduct = z.infer<typeof insertClientProductSchema>;
export type ProductSale = typeof productSales.$inferSelect;
export type InsertProductSale = z.infer<typeof insertProductSaleSchema>;

// Calendar Events table
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  clientId: integer("client_id").references(() => clients.id),
  type: varchar("type", { length: 50 }).notNull(), // 'meeting', 'recording', 'call', 'other'
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  organizer: varchar("organizer", { length: 255 }).notNull(), // team member responsible
  attendees: text("attendees").array(), // array of attendee names/emails
  location: varchar("location", { length: 255 }),
  status: varchar("status", { length: 50 }).default("scheduled"), // 'scheduled', 'completed', 'cancelled'
  googleEventId: varchar("google_event_id", { length: 255 }), // for future Google Calendar integration
  reminderMinutes: integer("reminder_minutes").default(15),
  isRecurring: boolean("is_recurring").default(false),
  recurringPattern: varchar("recurring_pattern", { length: 100 }), // 'daily', 'weekly', 'monthly'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Calendar Events relations
export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  client: one(clients, {
    fields: [calendarEvents.clientId],
    references: [clients.id],
  }),
}));

// Calendar Events schemas
export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;