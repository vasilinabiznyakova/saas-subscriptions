import { PaymentProvider } from './providers/payment-provider.interface';
import { MonobankMockProvider } from './providers/mocks/monobank.mock';
import { PixMockProvider } from './providers/mocks/pix.mock';
import { StripeMockProvider } from './providers/mocks/stripe.mock';

// factory selects provider by region
export function createPaymentProvider(region: string): PaymentProvider {
  if (region === 'UA') return new MonobankMockProvider();
  if (region === 'BR') return new PixMockProvider();
  return new StripeMockProvider();
}
