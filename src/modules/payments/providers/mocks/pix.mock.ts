import { PaymentProvider } from '../payment-provider.interface';

export class PixMockProvider implements PaymentProvider {
  async initPayment(_params: { amount: string; currency: string }) {
    return {
      providerRef: `pix_${Date.now()}`,
      checkoutUrl: `https://mock.pix/checkout/${Date.now()}`,
    };
  }
}
