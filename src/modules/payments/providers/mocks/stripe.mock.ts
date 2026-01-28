import { PaymentProvider } from '../payment-provider.interface';

export class StripeMockProvider implements PaymentProvider {
  async initPayment(_params: { amount: string; currency: string }) {
    return {
      providerRef: `stripe_${Date.now()}`,
      checkoutUrl: `https://mock.stripe/checkout/${Date.now()}`,
    };
  }
}
