import { PaymentProvider } from '../payment-provider.interface';

export class MonobankMockProvider implements PaymentProvider {
  async initPayment(_params: { amount: string; currency: string }) {
    return {
      providerRef: `mono_${Date.now()}`,
      checkoutUrl: `https://mock.monobank/checkout/${Date.now()}`,
    };
  }
}
