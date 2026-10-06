import { PaymentRecord } from '../../types';

export interface CreatePaymentParams {
  donationId: string;
  amount: number;
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
  isAnonymous?: boolean;
  paymentMethod: 'qris' | 'dana' | 'shopeepay'; // From frontend UI
}

export interface IPaymentService {
  createPayment(params: CreatePaymentParams): Promise<{
    paymentRecord: PaymentRecord;
    paymentUrl: string;
    reference: string;
    qrString?: string;
    vaNumber?: string;
  }>;
}

export class DuitkuPaymentService implements IPaymentService {
  async createPayment(params: CreatePaymentParams) {
    // Map frontend choice to actual Duitku code
    // qris → ShopeePay QRIS (SP), dana → DANA (DA), shopeepay → ShopeePay Apps (SA)
    const duitkuPaymentMethod =
      params.paymentMethod === 'qris' ? 'SP' : params.paymentMethod === 'shopeepay' ? 'SA' : 'DA';

    const res = await fetch('/api/payments/duitku/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, paymentMethod: duitkuPaymentMethod }),
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Gagal membuat pembayaran Duitku');
    }

    const referenceId = data.reference;
    const paymentUrl = data.paymentUrl;
    const qrString = data.qrString;
    const vaNumber = data.vaNumber;

    const paymentRecord: PaymentRecord = {
      id: `pay-${params.donationId}`,
      donationId: params.donationId,
      provider: 'duitku',
      providerReference: referenceId,
      paymentMethod: duitkuPaymentMethod,
      paymentChannel:
        params.paymentMethod === 'qris'
          ? 'ShopeePay QRIS'
          : params.paymentMethod === 'shopeepay'
          ? 'ShopeePay'
          : 'DANA',
      amount: params.amount,
      fee: 0,
      paidAmount: params.amount,
      status: 'pending',
      paymentUrl: paymentUrl,
      qrString: qrString,
      vaNumber: vaNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      paymentRecord,
      paymentUrl,
      reference: referenceId,
      qrString,
      vaNumber,
    };
  }
}

export const paymentService: IPaymentService = new DuitkuPaymentService();

