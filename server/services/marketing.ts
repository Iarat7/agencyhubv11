import axios from 'axios';
import { storage } from '../storage';
import type { InsertMarketingIntegration, InsertCampaignPerformance } from '@shared/schema';

export interface FacebookAdsData {
  campaign_id: string;
  campaign_name: string;
  impressions: number;
  clicks: number;
  spend: number;
  actions?: Array<{ action_type: string; value: number }>;
}

export interface GoogleAdsData {
  campaign: {
    id: string;
    name: string;
  };
  metrics: {
    impressions: number;
    clicks: number;
    cost_micros: number;
    conversions: number;
  };
}

export class MarketingIntegrationService {
  // Facebook/Meta Ads Integration
  static async connectFacebookAds(clientId: number, accessToken: string, accountId: string) {
    try {
      // Validate token by making a test API call
      const testResponse = await axios.get(
        `https://graph.facebook.com/v18.0/me/adaccounts`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if (!testResponse.data) {
        throw new Error('Token inválido para Facebook Ads');
      }

      const integration = await storage.createMarketingIntegration({
        clientId,
        platform: 'facebook',
        accountId,
        accessToken,
        isActive: true,
        syncFrequency: 'daily',
        settings: {
          currency: 'BRL',
          timezone: 'America/Sao_Paulo'
        }
      });

      // Sync initial data
      await this.syncFacebookAdsData(integration.id);

      return integration;
    } catch (error) {
      console.error('Facebook Ads connection error:', error);
      throw new Error('Erro ao conectar com Facebook Ads. Verifique o token de acesso.');
    }
  }

  static async syncFacebookAdsData(integrationId: number) {
    const integration = await storage.getMarketingIntegration(integrationId);
    if (!integration || !integration.accessToken) return;

    try {
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/act_${integration.accountId}/campaigns`,
        {
          params: {
            fields: 'id,name,insights{impressions,clicks,spend,actions}',
            access_token: integration.accessToken,
            time_range: JSON.stringify({
              since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              until: new Date().toISOString().split('T')[0]
            })
          }
        }
      );

      const campaigns = response.data.data;
      
      for (const campaign of campaigns) {
        if (campaign.insights?.data?.[0]) {
          const insights = campaign.insights.data[0];
          const conversions = insights.actions?.find(action => 
            action.action_type === 'purchase' || action.action_type === 'lead'
          )?.value || 0;

          await storage.createCampaignPerformance({
            integrationId,
            campaignId: campaign.id,
            campaignName: campaign.name,
            impressions: parseInt(insights.impressions) || 0,
            clicks: parseInt(insights.clicks) || 0,
            conversions: parseInt(conversions.toString()) || 0,
            spend: parseFloat(insights.spend) || 0,
            revenue: 0, // Calculate based on conversion value if available
            ctr: insights.clicks && insights.impressions ? 
              (parseFloat(insights.clicks) / parseFloat(insights.impressions)) * 100 : 0,
            cpc: insights.clicks && insights.spend ? 
              parseFloat(insights.spend) / parseFloat(insights.clicks) : 0,
            roas: 0, // Calculate when revenue data is available
            date: new Date().toISOString().split('T')[0]
          });
        }
      }

      // Update last sync time
      await storage.updateMarketingIntegration(integrationId, {
        lastSync: new Date()
      });

    } catch (error) {
      console.error('Facebook Ads sync error:', error);
      throw new Error('Erro ao sincronizar dados do Facebook Ads');
    }
  }

  // Google Ads Integration
  static async connectGoogleAds(clientId: number, accessToken: string, refreshToken: string, accountId: string) {
    try {
      // Test Google Ads API connection
      const testResponse = await axios.get(
        `https://googleads.googleapis.com/v14/customers/${accountId}/campaigns`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN
          }
        }
      );

      const integration = await storage.createMarketingIntegration({
        clientId,
        platform: 'google',
        accountId,
        accessToken,
        refreshToken,
        isActive: true,
        syncFrequency: 'daily',
        settings: {
          currency: 'BRL',
          timezone: 'America/Sao_Paulo',
          customerId: accountId
        }
      });

      // Sync initial data
      await this.syncGoogleAdsData(integration.id);

      return integration;
    } catch (error) {
      console.error('Google Ads connection error:', error);
      throw new Error('Erro ao conectar com Google Ads. Verifique as credenciais.');
    }
  }

  static async syncGoogleAdsData(integrationId: number) {
    const integration = await storage.getMarketingIntegration(integrationId);
    if (!integration || !integration.accessToken) return;

    try {
      const query = `
        SELECT 
          campaign.id,
          campaign.name,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions
        FROM campaign 
        WHERE segments.date DURING LAST_30_DAYS
      `;

      const response = await axios.post(
        `https://googleads.googleapis.com/v14/customers/${integration.accountId}/googleAds:searchStream`,
        { query },
        {
          headers: {
            Authorization: `Bearer ${integration.accessToken}`,
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
            'Content-Type': 'application/json'
          }
        }
      );

      const results = response.data.results || [];
      
      for (const result of results) {
        const campaign = result.campaign;
        const metrics = result.metrics;

        await storage.createCampaignPerformance({
          integrationId,
          campaignId: campaign.id,
          campaignName: campaign.name,
          impressions: parseInt(metrics.impressions) || 0,
          clicks: parseInt(metrics.clicks) || 0,
          conversions: parseInt(metrics.conversions) || 0,
          spend: (parseInt(metrics.cost_micros) || 0) / 1000000, // Convert micros to currency
          revenue: 0,
          ctr: metrics.clicks && metrics.impressions ? 
            (parseFloat(metrics.clicks) / parseFloat(metrics.impressions)) * 100 : 0,
          cpc: metrics.clicks && metrics.cost_micros ? 
            (parseFloat(metrics.cost_micros) / 1000000) / parseFloat(metrics.clicks) : 0,
          roas: 0,
          date: new Date().toISOString().split('T')[0]
        });
      }

      await storage.updateMarketingIntegration(integrationId, {
        lastSync: new Date()
      });

    } catch (error) {
      console.error('Google Ads sync error:', error);
      throw new Error('Erro ao sincronizar dados do Google Ads');
    }
  }

  // Google Analytics Integration
  static async connectGoogleAnalytics(clientId: number, accessToken: string, refreshToken: string, propertyId: string) {
    try {
      const integration = await storage.createMarketingIntegration({
        clientId,
        platform: 'google_analytics',
        accountId: propertyId,
        accessToken,
        refreshToken,
        isActive: true,
        syncFrequency: 'daily',
        settings: {
          propertyId,
          timezone: 'America/Sao_Paulo'
        }
      });

      await this.syncGoogleAnalyticsData(integration.id);

      return integration;
    } catch (error) {
      console.error('Google Analytics connection error:', error);
      throw new Error('Erro ao conectar com Google Analytics');
    }
  }

  // Instagram Business Integration
  static async connectInstagramBusiness(clientId: number, accessToken: string, accountId: string) {
    try {
      // Validate token by making a test API call to Instagram Basic Display API
      const testResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${accountId}`,
        {
          params: {
            fields: 'id,username,account_type',
            access_token: accessToken
          }
        }
      );

      if (!testResponse.data || testResponse.data.account_type !== 'BUSINESS') {
        throw new Error('Conta deve ser do tipo Business para acessar insights');
      }

      const integration = await storage.createMarketingIntegration({
        clientId,
        platform: 'instagram',
        accountId,
        accessToken,
        isActive: true,
        syncFrequency: 'daily',
        settings: {
          currency: 'BRL',
          timezone: 'America/Sao_Paulo',
          username: testResponse.data.username
        }
      });

      // Sync initial data
      await this.syncInstagramData(integration.id);

      return integration;
    } catch (error) {
      console.error('Instagram Business connection error:', error);
      throw new Error('Erro ao conectar com Instagram Business. Verifique se é uma conta Business.');
    }
  }

  static async syncInstagramData(integrationId: number) {
    const integration = await storage.getMarketingIntegration(integrationId);
    if (!integration || !integration.accessToken) return;

    try {
      // Get Instagram insights for the last 30 days
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${integration.accountId}/insights`,
        {
          params: {
            metric: 'impressions,reach,profile_views,follower_count,website_clicks',
            period: 'day',
            since: startDate.toISOString().split('T')[0],
            until: endDate.toISOString().split('T')[0],
            access_token: integration.accessToken
          }
        }
      );

      const insights = response.data.data;

      // Aggregate daily data
      let totalImpressions = 0;
      let totalReach = 0;
      let totalProfileViews = 0;
      let totalWebsiteClicks = 0;
      let followerCount = 0;

      insights.forEach((insight: any) => {
        insight.values.forEach((value: any) => {
          if (insight.name === 'impressions') totalImpressions += value.value || 0;
          if (insight.name === 'reach') totalReach += value.value || 0;
          if (insight.name === 'profile_views') totalProfileViews += value.value || 0;
          if (insight.name === 'website_clicks') totalWebsiteClicks += value.value || 0;
          if (insight.name === 'follower_count') followerCount = value.value || 0;
        });
      });

      await storage.createCampaignPerformance({
        integrationId,
        campaignId: 'instagram_organic',
        campaignName: 'Instagram Orgânico',
        impressions: totalImpressions,
        clicks: totalWebsiteClicks,
        conversions: totalProfileViews, // Using profile views as conversions
        spend: 0, // Organic content has no spend
        revenue: 0,
        ctr: totalImpressions > 0 ? (totalWebsiteClicks / totalImpressions) * 100 : 0,
        cpc: 0,
        roas: 0,
        date: new Date().toISOString().split('T')[0]
      });

      // Update last sync time
      await storage.updateMarketingIntegration(integrationId, {
        lastSync: new Date(),
        settings: {
          ...integration.settings,
          followerCount
        }
      });

    } catch (error) {
      console.error('Instagram sync error:', error);
      throw new Error('Erro ao sincronizar dados do Instagram');
    }
  }

  // Facebook Pages Integration
  static async connectFacebookPage(clientId: number, accessToken: string, pageId: string) {
    try {
      // Validate token and get page info
      const testResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${pageId}`,
        {
          params: {
            fields: 'id,name,category,fan_count',
            access_token: accessToken
          }
        }
      );

      if (!testResponse.data) {
        throw new Error('Token inválido ou página não encontrada');
      }

      const integration = await storage.createMarketingIntegration({
        clientId,
        platform: 'facebook_page',
        accountId: pageId,
        accessToken,
        isActive: true,
        syncFrequency: 'daily',
        settings: {
          currency: 'BRL',
          timezone: 'America/Sao_Paulo',
          pageName: testResponse.data.name,
          category: testResponse.data.category,
          fanCount: testResponse.data.fan_count
        }
      });

      // Sync initial data
      await this.syncFacebookPageData(integration.id);

      return integration;
    } catch (error) {
      console.error('Facebook Page connection error:', error);
      throw new Error('Erro ao conectar com Facebook Page. Verifique o token de acesso.');
    }
  }

  static async syncFacebookPageData(integrationId: number) {
    const integration = await storage.getMarketingIntegration(integrationId);
    if (!integration || !integration.accessToken) return;

    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get page insights
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${integration.accountId}/insights`,
        {
          params: {
            metric: 'page_impressions,page_reach,page_post_engagements,page_fan_adds,page_views_total',
            period: 'day',
            since: startDate.toISOString().split('T')[0],
            until: endDate.toISOString().split('T')[0],
            access_token: integration.accessToken
          }
        }
      );

      const insights = response.data.data;

      // Aggregate data
      let totalImpressions = 0;
      let totalReach = 0;
      let totalEngagements = 0;
      let totalFanAdds = 0;
      let totalPageViews = 0;

      insights.forEach((insight: any) => {
        insight.values.forEach((value: any) => {
          if (insight.name === 'page_impressions') totalImpressions += value.value || 0;
          if (insight.name === 'page_reach') totalReach += value.value || 0;
          if (insight.name === 'page_post_engagements') totalEngagements += value.value || 0;
          if (insight.name === 'page_fan_adds') totalFanAdds += value.value || 0;
          if (insight.name === 'page_views_total') totalPageViews += value.value || 0;
        });
      });

      await storage.createCampaignPerformance({
        integrationId,
        campaignId: 'facebook_page_organic',
        campaignName: 'Facebook Page Orgânico',
        impressions: totalImpressions,
        clicks: totalPageViews,
        conversions: totalFanAdds, // New followers as conversions
        spend: 0, // Organic content has no spend
        revenue: 0,
        ctr: totalImpressions > 0 ? (totalPageViews / totalImpressions) * 100 : 0,
        cpc: 0,
        roas: 0,
        date: new Date().toISOString().split('T')[0]
      });

      // Update last sync time and fan count
      const pageInfoResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${integration.accountId}`,
        {
          params: {
            fields: 'fan_count',
            access_token: integration.accessToken
          }
        }
      );

      await storage.updateMarketingIntegration(integrationId, {
        lastSync: new Date(),
        settings: {
          ...integration.settings,
          fanCount: pageInfoResponse.data.fan_count
        }
      });

    } catch (error) {
      console.error('Facebook Page sync error:', error);
      throw new Error('Erro ao sincronizar dados da Facebook Page');
    }
  }

  static async syncGoogleAnalyticsData(integrationId: number) {
    const integration = await storage.getMarketingIntegration(integrationId);
    if (!integration || !integration.accessToken) return;

    try {
      const response = await axios.post(
        `https://analyticsdata.googleapis.com/v1beta/properties/${integration.accountId}:runReport`,
        {
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          metrics: [
            { name: 'sessions' },
            { name: 'users' },
            { name: 'pageviews' },
            { name: 'conversions' },
            { name: 'totalRevenue' }
          ],
          dimensions: [{ name: 'date' }]
        },
        {
          headers: {
            Authorization: `Bearer ${integration.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const rows = response.data.rows || [];
      
      for (const row of rows) {
        const date = row.dimensionValues[0].value;
        const metrics = row.metricValues;

        await storage.createCampaignPerformance({
          integrationId,
          campaignId: 'ga4_organic',
          campaignName: 'Tráfego Orgânico',
          impressions: parseInt(metrics[2].value) || 0, // pageviews as impressions
          clicks: parseInt(metrics[0].value) || 0, // sessions as clicks
          conversions: parseInt(metrics[3].value) || 0,
          spend: 0, // Organic traffic has no spend
          revenue: parseFloat(metrics[4].value) || 0,
          ctr: 0,
          cpc: 0,
          roas: 0,
          date: date
        });
      }

      await storage.updateMarketingIntegration(integrationId, {
        lastSync: new Date()
      });

    } catch (error) {
      console.error('Google Analytics sync error:', error);
      throw new Error('Erro ao sincronizar dados do Google Analytics');
    }
  }

  // Sync all active integrations
  static async syncAllIntegrations() {
    const integrations = await storage.getMarketingIntegrations();
    const activeIntegrations = integrations.filter(i => i.isActive);

    for (const integration of activeIntegrations) {
      try {
        switch (integration.platform) {
          case 'facebook':
            await this.syncFacebookAdsData(integration.id);
            break;
          case 'google':
            await this.syncGoogleAdsData(integration.id);
            break;
          case 'google_analytics':
            await this.syncGoogleAnalyticsData(integration.id);
            break;
          case 'instagram':
            await this.syncInstagramData(integration.id);
            break;
          case 'facebook_page':
            await this.syncFacebookPageData(integration.id);
            break;
        }
      } catch (error) {
        console.error(`Sync error for integration ${integration.id}:`, error);
      }
    }
  }

  // Calculate campaign performance metrics
  static async getCampaignInsights(clientId: number, days: number = 30) {
    const integrations = await storage.getMarketingIntegrationsByClient(clientId);
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    let totalSpend = 0;
    let totalRevenue = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalConversions = 0;

    for (const integration of integrations) {
      const campaigns = await storage.getCampaignPerformanceByIntegration(integration.id);
      
      const recentCampaigns = campaigns.filter(campaign => {
        const campaignDate = new Date(campaign.date);
        return campaignDate >= startDate && campaignDate <= endDate;
      });

      for (const campaign of recentCampaigns) {
        totalSpend += parseFloat(campaign.spend?.toString() || '0');
        totalRevenue += parseFloat(campaign.revenue?.toString() || '0');
        totalImpressions += campaign.impressions || 0;
        totalClicks += campaign.clicks || 0;
        totalConversions += campaign.conversions || 0;
      }
    }

    return {
      totalSpend,
      totalRevenue,
      totalImpressions,
      totalClicks,
      totalConversions,
      roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0
    };
  }
}