import { PaymentRecord } from '../../types';
import { calculateAdminFee } from '../../lib/fees';

export interface CreatePaymentParams {
  donationId: string;
  userId?: string;
  amount: number;
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
  isAnonymous?: boolean;
  paymentMethod: 'qris'; // QRIS is the only supported payment method
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
    // QRIS only → Duitku code SP (ShopeePay QRIS)
    const duitkuPaymentMethod = 'SP';

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

    // Server is the source of truth for the 0,17% admin fee; fall back to the
    // shared helper only if an older backend response lacks the field.
    const fee: number =
      typeof data.fee === 'number' ? data.fee : calculateAdminFee(params.amount);
    const totalAmount: number =
      typeof data.totalAmount === 'number' ? data.totalAmount : params.amount + fee;

    const paymentRecord: PaymentRecord = {
      id: `pay-${params.donationId}`,
      donationId: params.donationId,
      userId: params.userId,
      provider: 'duitku',
      providerReference: referenceId,
      paymentMethod: duitkuPaymentMethod,
      paymentChannel: 'QRIS',
      amount: params.amount,
      fee,
      paidAmount: totalAmount,
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
