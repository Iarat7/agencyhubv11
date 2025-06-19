import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface StrategyRequest {
  clientName: string;
  industry: string;
  goals: string[];
  currentChallenges: string[];
  budget?: number;
  targetAudience?: string;
}

export interface GeneratedStrategy {
  title: string;
  executive_summary: string;
  objectives: string[];
  tactics: {
    category: string;
    actions: string[];
    timeline: string;
    budget_allocation: string;
  }[];
  metrics: string[];
  timeline: string;
}

export async function generateMarketingStrategy(request: StrategyRequest): Promise<GeneratedStrategy> {
  const prompt = `
    Create a comprehensive digital marketing strategy for the following client:
    
    Client: ${request.clientName}
    Industry: ${request.industry}
    Goals: ${request.goals.join(", ")}
    Current Challenges: ${request.currentChallenges.join(", ")}
    ${request.budget ? `Budget: R$ ${request.budget}` : ""}
    ${request.targetAudience ? `Target Audience: ${request.targetAudience}` : ""}
    
    Please provide a detailed strategy in JSON format with the following structure:
    {
      "title": "Strategy title",
      "executive_summary": "Brief overview of the strategy",
      "objectives": ["List of specific objectives"],
      "tactics": [
        {
          "category": "Content Marketing",
          "actions": ["Specific actions to take"],
          "timeline": "Implementation timeline",
          "budget_allocation": "Percentage or amount"
        }
      ],
      "metrics": ["KPIs to track success"],
      "timeline": "Overall implementation timeline"
    }
    
    Focus on practical, actionable strategies specific to the Brazilian market and the client's industry.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert digital marketing strategist with deep knowledge of the Brazilian market. Provide comprehensive, actionable marketing strategies in perfect Portuguese."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result as GeneratedStrategy;
  } catch (error) {
    throw new Error(`Failed to generate marketing strategy: ${error.message}`);
  }
}

export async function generateContentIdeas(clientName: string, industry: string, contentType: string): Promise<{
  ideas: Array<{
    title: string;
    description: string;
    content_type: string;
    target_audience: string;
    call_to_action: string;
  }>;
}> {
  const prompt = `
    Generate 10 creative content ideas for ${clientName} in the ${industry} industry.
    Content type focus: ${contentType}
    
    Provide the response in JSON format:
    {
      "ideas": [
        {
          "title": "Content title",
          "description": "Detailed description of the content",
          "content_type": "blog post, video, infographic, etc.",
          "target_audience": "Who this content is for",
          "call_to_action": "What action should users take"
        }
      ]
    }
    
    Focus on the Brazilian market and current trends.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a creative content strategist specializing in the Brazilian digital marketing landscape. Generate engaging, culturally relevant content ideas."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    throw new Error(`Failed to generate content ideas: ${error.message}`);
  }
}

export async function analyzeClientPerformance(clientData: {
  name: string;
  industry: string;
  monthlyInvestment: number;
  metrics: {
    leads: number;
    conversions: number;
    revenue: number;
    websiteTraffic: number;
  };
}): Promise<{
  analysis: string;
  recommendations: string[];
  roi_assessment: string;
  improvement_areas: string[];
}> {
  const prompt = `
    Analyze the performance of this client and provide insights:
    
    Client: ${clientData.name}
    Industry: ${clientData.industry}
    Monthly Investment: R$ ${clientData.monthlyInvestment}
    
    Performance Metrics:
    - Leads Generated: ${clientData.metrics.leads}
    - Conversions: ${clientData.metrics.conversions}
    - Revenue Generated: R$ ${clientData.metrics.revenue}
    - Website Traffic: ${clientData.metrics.websiteTraffic}
    
    Provide analysis in JSON format:
    {
      "analysis": "Overall performance analysis",
      "recommendations": ["List of specific recommendations"],
      "roi_assessment": "Assessment of return on investment",
      "improvement_areas": ["Areas that need improvement"]
    }
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a data-driven marketing analyst with expertise in Brazilian digital marketing. Provide actionable insights based on performance data."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    throw new Error(`Failed to analyze client performance: ${error.message}`);
  }
}
