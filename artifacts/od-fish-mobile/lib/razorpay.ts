/**
 * Razorpay checkout wrapper for the Expo mobile app.
 *
 * On native (Android/iOS) this uses react-native-razorpay. On web, it falls
 * back to a no-op that tells the caller Razorpay is not available.
 *
 * The actual `react-native-razorpay` package must be installed separately and
 * requires a native rebuild (EAS Build or dev client). Until then, this module
 * provides a safe import that won't crash on web or in Expo Go.
 */
import { Platform } from 'react-native';

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number; // in paise
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
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayErrorResponse {
  code: number;
  description: string;
}

/**
 * Open the Razorpay checkout modal.
 *
 * Returns the payment response on success, or throws on failure/cancel.
 */
export async function openRazorpayCheckout(
  options: RazorpayCheckoutOptions,
): Promise<RazorpaySuccessResponse> {
  if (Platform.OS === 'web') {
    throw new Error('Razorpay checkout is not supported on web.');
  }

  try {
    // Dynamic import to avoid crashing when react-native-razorpay is not installed.
    const RazorpayCheckout = (await import('react-native-razorpay')).default;

    const result = await RazorpayCheckout.open({
      ...options,
      currency: options.currency ?? 'INR',
    });

    return result as RazorpaySuccessResponse;
  } catch (err: unknown) {
    // react-native-razorpay throws an object like { code: 2, description: '...' }
    // when the user cancels or the payment fails.
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      'description' in err
    ) {
      const rzpErr = err as RazorpayErrorResponse;
      throw new Error(
        rzpErr.code === 2
          ? 'Payment was cancelled.'
          : rzpErr.description || 'Payment failed.',
      );
    }
    throw err;
  }
}
