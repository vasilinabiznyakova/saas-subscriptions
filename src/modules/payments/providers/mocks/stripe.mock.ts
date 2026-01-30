import { PaymentProvider } from '../payment-provider.interface';

export class StripeMockProvider implements PaymentProvider {
  async initPayment(_params: { amount: string; currency: string }) {
    const providerRef = `stripe_${Date.now()}`;

    return {
      providerRef,
      checkoutUrl: `https://mock.stripe/checkout/${providerRef}`,
    };
  }
}
