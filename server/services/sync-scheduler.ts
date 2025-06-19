
import cron from 'node-cron';
import { storage } from '../storage';
import { MarketingIntegrationService } from './marketing';

export class SyncScheduler {
  private static jobs: Map<string, cron.ScheduledTask> = new Map();

  static async startScheduler() {
    console.log('🔄 Starting marketing sync scheduler...');
    
    // Run sync every hour
    const hourlyJob = cron.schedule('0 * * * *', async () => {
      console.log('🔄 Running hourly marketing sync...');
      await this.syncAllIntegrations();
    }, {
      scheduled: false
    });

    // Run sync every day at 6 AM
    const dailyJob = cron.schedule('0 6 * * *', async () => {
      console.log('🔄 Running daily marketing sync...');
      await this.syncAllIntegrations();
    }, {
      scheduled: false
    });

    this.jobs.set('hourly', hourlyJob);
    this.jobs.set('daily', dailyJob);

    hourlyJob.start();
    dailyJob.start();

    console.log('✅ Marketing sync scheduler started');
  }

  static async syncAllIntegrations() {
    try {
      await MarketingIntegrationService.syncAllIntegrations();
      console.log('✅ All integrations synced successfully');
    } catch (error) {
      console.error('❌ Error syncing integrations:', error);
    }
  }

  static stopScheduler() {
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`🛑 Stopped ${name} sync job`);
    });
    this.jobs.clear();
  }

  static async syncSpecificIntegration(integrationId: number) {
    try {
      const integration = await storage.getMarketingIntegration(integrationId);
      if (!integration || !integration.isActive) {
        throw new Error('Integration not found or inactive');
      }

      switch (integration.platform) {
        case 'facebook':
          await MarketingIntegrationService.syncFacebookAdsData(integrationId);
          break;
        case 'google':
          await MarketingIntegrationService.syncGoogleAdsData(integrationId);
          break;
        case 'google_analytics':
          await MarketingIntegrationService.syncGoogleAnalyticsData(integrationId);
          break;
        case 'instagram':
          await MarketingIntegrationService.syncInstagramData(integrationId);
          break;
        case 'facebook_page':
          await MarketingIntegrationService.syncFacebookPageData(integrationId);
          break;
        default:
          throw new Error(`Unsupported platform: ${integration.platform}`);
      }

      console.log(`✅ Synced integration ${integrationId} (${integration.platform})`);
    } catch (error) {
      console.error(`❌ Error syncing integration ${integrationId}:`, error);
      throw error;
    }
  }
}
