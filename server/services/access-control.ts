
import { storage } from '../storage';

export interface PlanLimits {
  maxUsers: number;
  maxClients: number;
  hasAiStrategies: boolean;
  hasIntegrations: boolean;
  hasAdvancedReports: boolean;
  features: string[];
}

export class AccessControlService {
  // Check if user belongs to organization
  static async userBelongsToOrganization(userId: string, organizationId: number): Promise<boolean> {
    const user = await storage.getUser(userId);
    return user?.organizationId === organizationId;
  }

  // Get user's organization and plan
  static async getUserOrganizationWithPlan(userId: string) {
    const user = await storage.getUser(userId);
    if (!user?.organizationId) return null;

    const organization = await storage.getOrganization(user.organizationId);
    if (!organization) return null;

    const plan = organization.planId ? await storage.getPlan(organization.planId) : null;
    
    return { user, organization, plan };
  }

  // Check if organization can add more users
  static async canAddUser(organizationId: number): Promise<boolean> {
    const organization = await storage.getOrganization(organizationId);
    if (!organization) return false;

    const plan = organization.planId ? await storage.getPlan(organization.planId) : null;
    const maxUsers = plan?.maxUsers || organization.maxUsers || 5;

    const currentUserCount = await storage.getOrganizationUserCount(organizationId);
    return currentUserCount < maxUsers;
  }

  // Check if organization can add more clients
  static async canAddClient(organizationId: number): Promise<boolean> {
    const organization = await storage.getOrganization(organizationId);
    if (!organization) return false;

    const plan = organization.planId ? await storage.getPlan(organization.planId) : null;
    const maxClients = plan?.maxClients || organization.maxClients || 50;

    const currentClientCount = await storage.getOrganizationClientCount(organizationId);
    return currentClientCount < maxClients;
  }

  // Check if organization has access to feature
  static async hasFeatureAccess(organizationId: number, feature: string): Promise<boolean> {
    const organization = await storage.getOrganization(organizationId);
    if (!organization) return false;

    const plan = organization.planId ? await storage.getPlan(organization.planId) : null;
    if (!plan) return false;

    switch (feature) {
      case 'ai_strategies':
        return plan.hasAiStrategies;
      case 'integrations':
        return plan.hasIntegrations;
      case 'advanced_reports':
        return plan.hasAdvancedReports;
      default:
        return plan.features?.includes(feature) || false;
    }
  }

  // Get organization limits
  static async getOrganizationLimits(organizationId: number): Promise<PlanLimits | null> {
    const organization = await storage.getOrganization(organizationId);
    if (!organization) return null;

    const plan = organization.planId ? await storage.getPlan(organization.planId) : null;
    
    return {
      maxUsers: plan?.maxUsers || organization.maxUsers || 5,
      maxClients: plan?.maxClients || organization.maxClients || 50,
      hasAiStrategies: plan?.hasAiStrategies || false,
      hasIntegrations: plan?.hasIntegrations || false,
      hasAdvancedReports: plan?.hasAdvancedReports || false,
      features: plan?.features || []
    };
  }

  // Middleware to check organization access
  static requireOrganizationAccess() {
    return async (req: any, res: any, next: any) => {
      const userId = req.user?.id;
      const organizationId = req.headers['x-organization-id'] || req.body.organizationId || req.query.organizationId;

      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      if (!organizationId) {
        return res.status(400).json({ error: 'ID da organização é obrigatório' });
      }

      const hasAccess = await this.userBelongsToOrganization(userId, parseInt(organizationId));
      if (!hasAccess) {
        return res.status(403).json({ error: 'Acesso negado à organização' });
      }

      req.organizationId = parseInt(organizationId);
      next();
    };
  }

  // Middleware to check feature access
  static requireFeatureAccess(feature: string) {
    return async (req: any, res: any, next: any) => {
      const organizationId = req.organizationId;
      
      if (!organizationId) {
        return res.status(400).json({ error: 'ID da organização é obrigatório' });
      }

      const hasAccess = await this.hasFeatureAccess(organizationId, feature);
      if (!hasAccess) {
        return res.status(403).json({ 
          error: `Acesso negado à funcionalidade: ${feature}`,
          upgrade: true 
        });
      }

      next();
    };
  }

  // Check if user can perform action based on role
  static async canPerformAction(userId: string, action: string): Promise<boolean> {
    const user = await storage.getUser(userId);
    if (!user) return false;

    const role = user.role;

    // Define permissions based on role
    const permissions = {
      owner: ['*'], // Full access
      admin: [
        'create_clients', 'update_clients', 'delete_clients',
        'create_tasks', 'update_tasks', 'delete_tasks',
        'view_financial', 'create_financial', 'update_financial',
        'manage_team', 'view_reports'
      ],
      user: [
        'view_clients', 'create_tasks', 'update_tasks',
        'view_financial', 'view_reports'
      ]
    };

    const userPermissions = permissions[role as keyof typeof permissions] || [];
    return userPermissions.includes('*') || userPermissions.includes(action);
  }
}
