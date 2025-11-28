import crypto from 'crypto';

interface MoMoConfig {
  partnerCode: string;
  accessKey: string;
  secretKey: string;
  endpoint: string;
}

interface VietcombankConfig {
  merchantId: string;
  apiKey: string;
  endpoint: string;
}

class PaymentService {
  private momoConfig: MoMoConfig;
  private vietcombankConfig: VietcombankConfig;

  constructor() {
    this.momoConfig = {
      partnerCode: process.env.MOMO_PARTNER_CODE || '',
      accessKey: process.env.MOMO_ACCESS_KEY || '',
      secretKey: process.env.MOMO_SECRET_KEY || '',
      endpoint: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create'
    };

    this.vietcombankConfig = {
      merchantId: process.env.VCB_MERCHANT_ID || '',
      apiKey: process.env.VCB_API_KEY || '',
      endpoint: process.env.VCB_ENDPOINT || 'https://api.vietcombank.com.vn/payment/v1'
    };
  }

  async createMoMoPayment(orderId: number, amount: number, orderInfo: string) {
    try {
      const requestId = Date.now().toString();
      const orderIdStr = orderId.toString();
      const amountStr = amount.toString();
      const extraData = '';

      const rawSignature = `partnerCode=${this.momoConfig.partnerCode}&accessKey=${this.momoConfig.accessKey}&requestId=${requestId}&amount=${amountStr}&orderId=${orderIdStr}&orderInfo=${orderInfo}&returnUrl=${process.env.MOMO_RETURN_URL}&ipnUrl=${process.env.MOMO_IPN_URL}&extraData=${extraData}`;
      const signature = crypto.createHmac('sha256', this.momoConfig.secretKey)
        .update(rawSignature)
        .digest('hex');

      const requestBody = {
        partnerCode: this.momoConfig.partnerCode,
        accessKey: this.momoConfig.accessKey,
        requestId: requestId,
        amount: amountStr,
        orderId: orderIdStr,
        orderInfo: orderInfo,
        returnUrl: process.env.MOMO_RETURN_URL,
        ipnUrl: process.env.MOMO_IPN_URL,
        extraData: extraData,
        requestType: 'captureWallet',
        signature: signature
      };

      const response = await fetch(this.momoConfig.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('MoMo payment creation error:', error);
      throw new Error('Failed to create MoMo payment');
    }
  }

  async createVietcombankPayment(orderId: number, amount: number, orderInfo: string) {
    try {
      const timestamp = Date.now();
      const signature = crypto.createHmac('sha256', this.vietcombankConfig.apiKey)
        .update(`${orderId}${amount}${timestamp}`)
        .digest('hex');

      const requestBody = {
        merchantId: this.vietcombankConfig.merchantId,
        orderId: orderId.toString(),
        amount: amount.toString(),
        orderInfo: orderInfo,
        timestamp: timestamp,
        signature: signature,
        returnUrl: process.env.VCB_RETURN_URL,
        cancelUrl: process.env.VCB_CANCEL_URL
      };

      const response = await fetch(`${this.vietcombankConfig.endpoint}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Vietcombank payment creation error:', error);
      throw new Error('Failed to create Vietcombank payment');
    }
  }

  verifyMoMoCallback(data: any): boolean {
    const signature = data.signature;
    const rawSignature = `partnerCode=${data.partnerCode}&accessKey=${data.accessKey}&requestId=${data.requestId}&amount=${data.amount}&orderId=${data.orderId}&orderInfo=${data.orderInfo}&orderType=${data.orderType}&transId=${data.transId}&resultCode=${data.resultCode}&message=${data.message}&payType=${data.payType}&signature=${signature}`;

    const expectedSignature = crypto.createHmac('sha256', this.momoConfig.secretKey)
      .update(rawSignature)
      .digest('hex');

    return signature === expectedSignature;
  }

  verifyVietcombankCallback(data: any): boolean {
    const signature = data.signature;
    const expectedSignature = crypto.createHmac('sha256', this.vietcombankConfig.apiKey)
      .update(`${data.orderId}${data.amount}${data.timestamp}`)
      .digest('hex');

    return signature === expectedSignature;
  }
}

export const paymentService = new PaymentService();
