declare module 'react-native-razorpay' {
  interface RazorpayCheckoutOptions {
    key: string;
    amount: number;
    currency?: string;
    name: string;
    description?: string;
    order_id: string;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    theme?: {
      color?: string;
    };
    [key: string]: unknown;
  }

  interface RazorpayCheckout {
    open: (options: RazorpayCheckoutOptions) => Promise<{
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }>;
  }

  const RazorpayCheckout: RazorpayCheckout;
  export default RazorpayCheckout;
}
