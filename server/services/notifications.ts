import nodemailer from 'nodemailer';
import cron from 'node-cron';
import { storage } from '../storage';
import type { InsertNotification, FinancialRecord, Task } from '@shared/schema';

export class NotificationService {
  private static emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  static async init() {
    this.setupCronJobs();
  }

  private static setupCronJobs() {
    // Check overdue payments daily at 9 AM
    cron.schedule('0 9 * * *', async () => {
      await this.checkOverduePayments();
    });

    // Check overdue tasks daily at 10 AM
    cron.schedule('0 10 * * *', async () => {
      await this.checkOverdueTasks();
    });

    // Weekly financial summary every Monday at 8 AM
    cron.schedule('0 8 * * 1', async () => {
      await this.sendWeeklyFinancialSummary();
    });

    // Monthly client review reminder - first day of month at 9 AM
    cron.schedule('0 9 1 * *', async () => {
      await this.sendMonthlyClientReviewReminder();
    });
  }

  static async createNotification(notification: InsertNotification) {
    const created = await storage.createNotification(notification);
    
    // Send email if recipient has email notifications enabled
    if (notification.recipientId) {
      await this.sendEmailNotification(created);
    }

    return created;
  }

  private static async sendEmailNotification(notification: any) {
    try {
      const user = await storage.getUser(notification.recipientId);
      if (!user?.email) return;

      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@agencyhub.com',
        to: user.email,
        subject: notification.title,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">${notification.title}</h2>
            <p>${notification.message}</p>
            ${notification.actionUrl ? `<a href="${notification.actionUrl}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver Detalhes</a>` : ''}
            <hr style="margin-top: 30px;">
            <p style="color: #666; font-size: 12px;">AgencyHub - Sistema de Gestão</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  private static async checkOverduePayments() {
    const financialRecords = await storage.getFinancialRecords();
    const today = new Date();
    
    const overduePayments = financialRecords.filter(record => {
      if (record.status !== 'pending' || !record.dueDate) return false;
      return new Date(record.dueDate) < today;
    });

    for (const payment of overduePayments) {
      await this.createNotification({
        title: 'Pagamento em Atraso',
        message: `O pagamento de ${payment.description} no valor de R$ ${payment.amount} está em atraso desde ${new Date(payment.dueDate!).toLocaleDateString('pt-BR')}.`,
        type: 'warning',
        recipientId: 'admin', // Send to admin by default
        actionUrl: `/financial`,
        metadata: { paymentId: payment.id, type: 'overdue_payment' }
      });
    }
  }

  private static async checkOverdueTasks() {
    const tasks = await storage.getTasks();
    const today = new Date();
    
    const overdueTasks = tasks.filter(task => {
      if (task.status === 'completed' || !task.dueDate) return false;
      return new Date(task.dueDate) < today;
    });

    for (const task of overdueTasks) {
      await this.createNotification({
        title: 'Tarefa em Atraso',
        message: `A tarefa "${task.title}" está em atraso desde ${new Date(task.dueDate!).toLocaleDateString('pt-BR')}.`,
        type: 'error',
        recipientId: task.assignedTo || 'admin',
        actionUrl: `/tasks`,
        metadata: { taskId: task.id, type: 'overdue_task' }
      });
    }
  }

  private static async sendWeeklyFinancialSummary() {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const financialRecords = await storage.getFinancialRecords();
    const weeklyRecords = financialRecords.filter(record => {
      const recordDate = new Date(record.createdAt);
      return recordDate >= startDate && recordDate <= endDate;
    });

    const totalIncome = weeklyRecords
      .filter(r => r.type === 'invoice')
      .reduce((sum, r) => sum + parseFloat(r.amount), 0);

    const totalExpenses = weeklyRecords
      .filter(r => r.type === 'payment')
      .reduce((sum, r) => sum + parseFloat(r.amount), 0);

    await this.createNotification({
      title: 'Resumo Financeiro Semanal',
      message: `Resumo da semana: Receitas R$ ${totalIncome.toLocaleString('pt-BR')}, Despesas R$ ${totalExpenses.toLocaleString('pt-BR')}, Lucro R$ ${(totalIncome - totalExpenses).toLocaleString('pt-BR')}.`,
      type: 'info',
      recipientId: 'admin',
      actionUrl: `/financial`,
      metadata: { type: 'weekly_summary', totalIncome, totalExpenses }
    });
  }

  private static async sendMonthlyClientReviewReminder() {
    const clients = await storage.getClients();
    
    for (const client of clients) {
      await this.createNotification({
        title: 'Revisão Mensal do Cliente',
        message: `É hora de revisar o progresso e resultados do cliente ${client.name}. Agende uma reunião para discutir métricas e próximos passos.`,
        type: 'info',
        recipientId: 'admin',
        actionUrl: `/clients`,
        metadata: { clientId: client.id, type: 'monthly_review' }
      });
    }
  }

  static async sendTaskAssignmentNotification(taskId: number, assignedTo: string) {
    const task = await storage.getTask(taskId);
    if (!task) return;

    await this.createNotification({
      title: 'Nova Tarefa Atribuída',
      message: `Você foi designado para a tarefa: ${task.title}. Prazo: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR') : 'Não definido'}.`,
      type: 'info',
      recipientId: assignedTo,
      actionUrl: `/tasks`,
      metadata: { taskId, type: 'task_assignment' }
    });
  }

  static async sendPaymentReceivedNotification(paymentId: number) {
    const payment = await storage.getFinancialRecord(paymentId);
    if (!payment) return;

    await this.createNotification({
      title: 'Pagamento Recebido',
      message: `Pagamento de R$ ${payment.amount} foi recebido para ${payment.description}.`,
      type: 'success',
      recipientId: 'admin',
      actionUrl: `/financial`,
      metadata: { paymentId, type: 'payment_received' }
    });
  }

  static async sendClientCreatedNotification(clientId: number) {
    const client = await storage.getClient(clientId);
    if (!client) return;

    await this.createNotification({
      title: 'Novo Cliente Adicionado',
      message: `O cliente ${client.name} foi adicionado ao sistema. Considere criar uma estratégia de marketing inicial.`,
      type: 'success',
      recipientId: 'admin',
      actionUrl: `/clients`,
      metadata: { clientId, type: 'client_created' }
    });
  }
}