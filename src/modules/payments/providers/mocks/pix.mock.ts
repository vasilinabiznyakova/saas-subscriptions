import { PaymentProvider } from '../payment-provider.interface';

export class PixMockProvider implements PaymentProvider {
  async initPayment(): Promise<{
    providerRef: string;
    checkoutUrl: string;
  }> {
    const ref = `pix_${Date.now()}`;

    return {
      providerRef: ref,
      checkoutUrl: `https://mock.pix/checkout/${ref}`,
    };
  }
}
