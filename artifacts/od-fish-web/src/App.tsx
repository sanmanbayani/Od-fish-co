import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { AuthProvider } from '@/lib/auth';
import { AdminGuard, RiderGuard } from '@/components/auth-guards';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { RiderLayout } from '@/components/layouts/RiderLayout';

// Public Pages
import Storefront from '@/pages/public/Storefront';

// Admin Pages
import AdminLogin from '@/pages/admin/AdminLogin';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminOrders from '@/pages/admin/AdminOrders';
import AdminOrderDetails from '@/pages/admin/AdminOrderDetails';
import AdminProducts from '@/pages/admin/AdminProducts';
import AdminInventory from '@/pages/admin/AdminInventory';
import AdminStaff from '@/pages/admin/AdminStaff';
import AdminServiceAreas from '@/pages/admin/AdminServiceAreas';
import AdminSettings from '@/pages/admin/AdminSettings';

// Rider Pages
import RiderLogin from '@/pages/rider/RiderLogin';
import RiderDashboard from '@/pages/rider/RiderDashboard';
import RiderOrderDetails from '@/pages/rider/RiderOrderDetails';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  }
});

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        {/* PUBLIC ROUTES */}
        <Route path="/">
          <PublicLayout><Storefront /></PublicLayout>
        </Route>

        {/* ADMIN ROUTES */}
        <Route path="/admin/login">
          <AdminLogin />
        </Route>
        
        <Route path="/admin">
          <AdminGuard><AdminLayout><AdminDashboard /></AdminLayout></AdminGuard>
        </Route>
        <Route path="/admin/orders">
          <AdminGuard><AdminLayout><AdminOrders /></AdminLayout></AdminGuard>
        </Route>
        <Route path="/admin/orders/:id">
          <AdminGuard><AdminLayout><AdminOrderDetails /></AdminLayout></AdminGuard>
        </Route>
        <Route path="/admin/products">
          <AdminGuard><AdminLayout><AdminProducts /></AdminLayout></AdminGuard>
        </Route>
        <Route path="/admin/inventory">
          <AdminGuard><AdminLayout><AdminInventory /></AdminLayout></AdminGuard>
        </Route>
        <Route path="/admin/staff">
          <AdminGuard><AdminLayout><AdminStaff /></AdminLayout></AdminGuard>
        </Route>
        <Route path="/admin/service-areas">
          <AdminGuard><AdminLayout><AdminServiceAreas /></AdminLayout></AdminGuard>
        </Route>
        <Route path="/admin/settings">
          <AdminGuard><AdminLayout><AdminSettings /></AdminLayout></AdminGuard>
        </Route>

        {/* RIDER ROUTES */}
        <Route path="/rider/login">
          <RiderLogin />
        </Route>
        <Route path="/rider">
          <RiderGuard><RiderLayout><RiderDashboard /></RiderLayout></RiderGuard>
        </Route>
        <Route path="/rider/orders/:id">
          <RiderGuard><RiderLayout><RiderOrderDetails /></RiderLayout></RiderGuard>
        </Route>

        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
