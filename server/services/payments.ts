
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret?: string;
}

export interface Subscription {
  id: string;
  customerId: string;
  priceId: string;
  status: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export class PaymentService {
  // Stripe Payment Methods
  async createPaymentIntent(amount: number, currency: string = 'brl'): Promise<PaymentIntent> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100, // Convert to cents
        currency,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret || undefined,
      };
    } catch (error) {
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  }

  async createCustomer(email: string, name: string): Promise<string> {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
      });
      return customer.id;
    } catch (error) {
      throw new Error(`Failed to create customer: ${error.message}`);
    }
  }

  async createSubscription(customerId: string, priceId: string): Promise<Subscription> {
    try {
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      return {
        id: subscription.id,
        customerId: subscription.customer as string,
        priceId,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };
    } catch (error) {
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await stripe.subscriptions.cancel(subscriptionId);
    } catch (error) {
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  async updateSubscription(subscriptionId: string, priceId: string): Promise<Subscription> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      
      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: priceId,
        }],
        proration_behavior: 'create_prorations',
      });

      return {
        id: updatedSubscription.id,
        customerId: updatedSubscription.customer as string,
        priceId,
        status: updatedSubscription.status,
        currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
      };
    } catch (error) {
      throw new Error(`Failed to update subscription: ${error.message}`);
    }
  }

  async getSubscription(subscriptionId: string): Promise<Subscription> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      
      return {
        id: subscription.id,
        customerId: subscription.customer as string,
        priceId: subscription.items.data[0].price.id,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };
    } catch (error) {
      throw new Error(`Failed to retrieve subscription: ${error.message}`);
    }
  }

  async handleWebhook(body: string, signature: string): Promise<any> {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new Error('Webhook secret not configured');
      }

      const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      
      switch (event.type) {
        case 'payment_intent.succeeded':
          // Handle successful payment
          console.log('Payment succeeded:', event.data.object);
          break;
        case 'invoice.payment_succeeded':
          // Handle successful subscription payment
          console.log('Subscription payment succeeded:', event.data.object);
          break;
        case 'customer.subscription.updated':
          // Handle subscription updates
          console.log('Subscription updated:', event.data.object);
          break;
        case 'customer.subscription.deleted':
          // Handle subscription cancellation
          console.log('Subscription cancelled:', event.data.object);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return event;
    } catch (error) {
      throw new Error(`Webhook error: ${error.message}`);
    }
  }

  // PagSeguro Integration (Simplified)
  async createPagSeguroPayment(amount: number, description: string): Promise<any> {
    // This would integrate with PagSeguro API
    // For now, returning a mock response
    return {
      id: `pagseguro_${Date.now()}`,
      amount,
      description,
      status: 'pending',
      payment_url: `https://pagseguro.uol.com.br/checkout/payment.html?code=example`,
    };
  }
}

export const paymentService = new PaymentService();
