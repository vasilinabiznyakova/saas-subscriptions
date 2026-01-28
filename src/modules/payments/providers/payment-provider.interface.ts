export type PaymentInitResult = {
  providerRef: string;
  checkoutUrl?: string; // optional, if we want to simulate a redirect
};

export interface PaymentProvider {
  initPayment(params: {
    amount: string;
    currency: string;
  }): Promise<PaymentInitResult>;
}
