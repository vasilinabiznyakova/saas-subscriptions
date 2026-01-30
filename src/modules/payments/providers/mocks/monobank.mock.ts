import { PaymentProvider } from '../payment-provider.interface';

export class MonobankMockProvider implements PaymentProvider {
  async initPayment(_params: { amount: string; currency: string }) {
    const providerRef = `mono_${Date.now()}`;
    return {
      providerRef,
      checkoutUrl: `https://mock.monobank/checkout/${providerRef}`,
    };
  }
}
