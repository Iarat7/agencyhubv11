import { storage } from '../storage';
import type { InsertTeamMember, TeamMember } from '@shared/schema';

export interface Permission {
  resource: string;
  actions: string[];
}

export interface Role {
  name: string;
  permissions: Permission[];
  description: string;
}

export class TeamManagementService {
  // Define role-based permissions
  static readonly ROLES: Record<string, Role> = {
    admin: {
      name: 'Administrador',
      description: 'Acesso total ao sistema',
      permissions: [
        { resource: 'clients', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'tasks', actions: ['create', 'read', 'update', 'delete', 'assign'] },
        { resource: 'financial', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'team', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'reports', actions: ['create', 'read', 'export'] },
        { resource: 'integrations', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'ai_strategies', actions: ['create', 'read', 'update', 'delete'] }
      ]
    },
    manager: {
      name: 'Gerente',
      description: 'Gestão de projetos e equipe',
      permissions: [
        { resource: 'clients', actions: ['create', 'read', 'update'] },
        { resource: 'tasks', actions: ['create', 'read', 'update', 'assign'] },
        { resource: 'financial', actions: ['read', 'update'] },
        { resource: 'team', actions: ['read', 'update'] },
        { resource: 'reports', actions: ['create', 'read', 'export'] },
        { resource: 'integrations', actions: ['read', 'update'] },
        { resource: 'ai_strategies', actions: ['create', 'read', 'update'] }
      ]
    },
    analyst: {
      name: 'Analista',
      description: 'Análise de dados e relatórios',
      permissions: [
        { resource: 'clients', actions: ['read'] },
        { resource: 'tasks', actions: ['read', 'update'] },
        { resource: 'financial', actions: ['read'] },
        { resource: 'team', actions: ['read'] },
        { resource: 'reports', actions: ['create', 'read', 'export'] },
        { resource: 'integrations', actions: ['read'] },
        { resource: 'ai_strategies', actions: ['read'] }
      ]
    },
    designer: {
      name: 'Designer',
      description: 'Criação e design',
      permissions: [
        { resource: 'clients', actions: ['read'] },
        { resource: 'tasks', actions: ['read', 'update'] },
        { resource: 'financial', actions: [] },
        { resource: 'team', actions: ['read'] },
        { resource: 'reports', actions: ['read'] },
        { resource: 'integrations', actions: ['read'] },
        { resource: 'ai_strategies', actions: ['read'] }
      ]
    },
    developer: {
      name: 'Desenvolvedor',
      description: 'Desenvolvimento e implementação',
      permissions: [
        { resource: 'clients', actions: ['read'] },
        { resource: 'tasks', actions: ['read', 'update'] },
        { resource: 'financial', actions: [] },
        { resource: 'team', actions: ['read'] },
        { resource: 'reports', actions: ['read'] },
        { resource: 'integrations', actions: ['create', 'read', 'update'] },
        { resource: 'ai_strategies', actions: ['read'] }
      ]
    }
  };

  // Check if user has permission for a specific action
  static async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const teamMember = await storage.getTeamMemberByUserId(userId);
    if (!teamMember || !teamMember.isActive) return false;

    const role = this.ROLES[teamMember.role];
    if (!role) return false;

    const resourcePermission = role.permissions.find(p => p.resource === resource);
    return resourcePermission?.actions.includes(action) || false;
  }

  // Middleware to check permissions
  static requirePermission(resource: string, action: string) {
    return async (req: any, res: any, next: any) => {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const hasPermission = await this.hasPermission(userId, resource, action);
      if (!hasPermission) {
        return res.status(403).json({ error: 'Permissão negada' });
      }

      next();
    };
  }

  // Create team member
  static async createTeamMember(data: InsertTeamMember): Promise<TeamMember> {
    // Validate role
    if (!this.ROLES[data.role]) {
      throw new Error('Função inválida');
    }

    // Set default permissions based on role
    const rolePermissions = this.ROLES[data.role].permissions.map(p => 
      `${p.resource}:${p.actions.join(',')}`
    );

    const teamMemberData = {
      ...data,
      permissions: data.permissions || rolePermissions
    };

    return await storage.createTeamMember(teamMemberData);
  }

  // Update team member role and permissions
  static async updateTeamMemberRole(id: number, role: string, customPermissions?: string[]) {
    if (!this.ROLES[role]) {
      throw new Error('Função inválida');
    }

    const permissions = customPermissions || 
      this.ROLES[role].permissions.map(p => `${p.resource}:${p.actions.join(',')}`);

    return await storage.updateTeamMember(id, { role, permissions });
  }

  // Get team member with role details
  static async getTeamMemberWithRole(id: number) {
    const teamMember = await storage.getTeamMember(id);
    if (!teamMember) return null;

    const roleDetails = this.ROLES[teamMember.role];
    
    return {
      ...teamMember,
      roleDetails,
      effectivePermissions: this.parsePermissions(teamMember.permissions || [])
    };
  }

  // Parse permission strings into structured format
  private static parsePermissions(permissions: string[]): Permission[] {
    return permissions.map(permission => {
      const [resource, actions] = permission.split(':');
      return {
        resource,
        actions: actions ? actions.split(',') : []
      };
    });
  }

  // Get all available roles
  static getRoles(): Role[] {
    return Object.values(this.ROLES);
  }

  // Check if user can manage another user
  static async canManageUser(managerId: string, targetUserId: string): Promise<boolean> {
    const manager = await storage.getTeamMemberByUserId(managerId);
    const target = await storage.getTeamMemberByUserId(targetUserId);

    if (!manager || !target) return false;

    // Admins can manage everyone
    if (manager.role === 'admin') return true;

    // Managers can manage analysts, designers, and developers
    if (manager.role === 'manager' && 
        ['analyst', 'designer', 'developer'].includes(target.role)) {
      return true;
    }

    return false;
  }

  // Get team hierarchy
  static async getTeamHierarchy() {
    const teamMembers = await storage.getTeamMembers();
    
    const hierarchy = {
      admin: teamMembers.filter(m => m.role === 'admin'),
      manager: teamMembers.filter(m => m.role === 'manager'),
      analyst: teamMembers.filter(m => m.role === 'analyst'),
      designer: teamMembers.filter(m => m.role === 'designer'),
      developer: teamMembers.filter(m => m.role === 'developer')
    };

    return hierarchy;
  }

  // Get team performance metrics
  static async getTeamPerformance(startDate: Date, endDate: Date) {
    const teamMembers = await storage.getTeamMembers();
    const tasks = await storage.getTasks();

    const performance = [];

    for (const member of teamMembers) {
      const memberTasks = tasks.filter(t => 
        t.assignedTo === member.userId &&
        t.createdAt >= startDate &&
        t.createdAt <= endDate
      );

      const completedTasks = memberTasks.filter(t => t.status === 'completed');
      const overdueTasks = memberTasks.filter(t => 
        t.status !== 'completed' && 
        t.dueDate && 
        new Date(t.dueDate) < new Date()
      );

      performance.push({
        member,
        metrics: {
          totalTasks: memberTasks.length,
          completedTasks: completedTasks.length,
          overdueTasks: overdueTasks.length,
          completionRate: memberTasks.length > 0 ? 
            (completedTasks.length / memberTasks.length) * 100 : 0,
          averageTaskDuration: this.calculateAverageTaskDuration(completedTasks)
        }
      });
    }

    return performance;
  }

  private static calculateAverageTaskDuration(tasks: any[]): number {
    if (tasks.length === 0) return 0;

    const durations = tasks
      .filter(t => t.completedAt)
      .map(t => {
        const start = new Date(t.createdAt);
        const end = new Date(t.completedAt);
        return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24); // days
      });

    return durations.length > 0 ? 
      durations.reduce((sum, duration) => sum + duration, 0) / durations.length : 0;
  }

  // Create activity log for team actions
  static async logTeamActivity(userId: string, action: string, details: any) {
    await storage.createActivity({
      type: 'team_action',
      description: `${action}: ${details.description || ''}`,
      userId,
      metadata: { action, details }
    });
  }
}