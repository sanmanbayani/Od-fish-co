import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import type { Customer, CustomerSession } from '@workspace/api-client-react';
import { router } from 'expo-router';
import { setCurrentToken } from '@/lib/api';
import {
  clearPushRegistration,
  syncPushRegistration,
} from '@/lib/notifications';

const TOKEN_KEY = 'odfish.session.token';
const CUSTOMER_KEY = 'odfish.session.customer';

type AuthState = {
  /** False until AsyncStorage has been read, so guards don't flash. */
  isReady: boolean;
  isSignedIn: boolean;
  customer: Customer | null;
  signIn: (session: CustomerSession) => Promise<void>;
  signOut: () => Promise<void>;
  setCustomer: (customer: Customer) => Promise<void>;
  /**
   * Returns true when the caller may proceed. Otherwise routes to the login
   * screen and returns false.
   */
  requireAuth: () => boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [customer, setCustomerState] = useState<Customer | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [storedToken, storedCustomer] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(CUSTOMER_KEY),
        ]);
        if (cancelled) return;
        if (storedToken) {
          setCurrentToken(storedToken);
          setToken(storedToken);
          // Tokens are reissued by the OS from time to time, so a returning
          // customer re-registers rather than going quiet after an update.
          void syncPushRegistration();
        }
        if (storedCustomer) {
          setCustomerState(JSON.parse(storedCustomer) as Customer);
        }
      } catch {
        // A corrupt session is not worth crashing over — start signed out.
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(
    async (session: CustomerSession) => {
      setCurrentToken(session.token);
      setToken(session.token);
      setCustomerState(session.customer);
      await AsyncStorage.multiSet([
        [TOKEN_KEY, session.token],
        [CUSTOMER_KEY, JSON.stringify(session.customer)],
      ]);
      // Cart, addresses and orders are all per-customer.
      await queryClient.invalidateQueries();
      // Attach this phone to the account that just signed in. Deliberately not
      // awaited: the permission prompt must not hold up the login screen.
      void syncPushRegistration();
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    // Before the token goes: the API needs the session to know whose device
    // this is, and the next person on this handset must not inherit someone
    // else's order updates.
    await clearPushRegistration();
    setCurrentToken(null);
    setToken(null);
    setCustomerState(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, CUSTOMER_KEY]);
    queryClient.clear();
  }, [queryClient]);

  const setCustomer = useCallback(async (next: Customer) => {
    setCustomerState(next);
    await AsyncStorage.setItem(CUSTOMER_KEY, JSON.stringify(next));
  }, []);

  const requireAuth = useCallback(() => {
    if (token) return true;
    router.push('/login');
    return false;
  }, [token]);

  const value = useMemo<AuthState>(
    () => ({
      isReady,
      isSignedIn: Boolean(token),
      customer,
      signIn,
      signOut,
      setCustomer,
      requireAuth,
    }),
    [isReady, token, customer, signIn, signOut, setCustomer, requireAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
