import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';
import Dashboard from './pages/Dashboard';
import UnderDevelopment from './pages/UnderDevelopment';
import Layout from './components/layout/Layout';
import CustomersList from './pages/customers/CustomersList';
import SaleOrdersList from './pages/orders/sale/SaleOrdersList';
import NewSaleOrder from './pages/orders/sale/NewSaleOrder';
import WorkOrdersList from './pages/orders/WorkOrdersList';
import NewWorkOrder from './pages/orders/NewWorkOrder';
import Tables from './pages/Tables';
import SchedulingPage from './pages/scheduling/SchedulingPage';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/auth/login" />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return !user ? <>{children}</> : <Navigate to="/" />;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/auth/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/auth/register" element={
        <PublicRoute>
          <Register />
        </PublicRoute>
      } />
      <Route path="/auth/forgot-password" element={
        <PublicRoute>
          <ForgotPassword />
        </PublicRoute>
      } />
      <Route path="/auth/reset-password" element={
        <PublicRoute>
          <ResetPassword />
        </PublicRoute>
      } />
      <Route path="/auth/verify-email" element={
        <PublicRoute>
          <VerifyEmail />
        </PublicRoute>
      } />
    
      {/* Protected Routes */}
      <Route path="/" element={
        <PrivateRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </PrivateRoute>
      } />
      
      <Route path="/customers" element={
        <PrivateRoute>
          <Layout>
            <CustomersList />
          </Layout>
        </PrivateRoute>
      } />
      
      <Route path="/orders/sale" element={
        <PrivateRoute>
          <Layout>
            <SaleOrdersList />
          </Layout>
        </PrivateRoute>
      } />
      
      <Route path="/orders/sale/new" element={
        <PrivateRoute>
          <Layout>
            <NewSaleOrder />
          </Layout>
        </PrivateRoute>
      } />

      <Route path="/orders/work" element={
        <PrivateRoute>
          <Layout>
            <WorkOrdersList />
          </Layout>
        </PrivateRoute>
      } />

      <Route path="/orders/work/new/:orderId?" element={
        <PrivateRoute>
          <Layout>
            <NewWorkOrder />
          </Layout>
        </PrivateRoute>
      } />

      <Route path="/tables" element={
        <PrivateRoute>
          <Layout>
            <Tables />
          </Layout>
        </PrivateRoute>
      } />

      <Route path="/scheduling" element={
        <PrivateRoute>
          <Layout>
            <SchedulingPage />
          </Layout>
        </PrivateRoute>
      } />

      {/* Catch all route */}
      <Route path="*" element={
        <PrivateRoute>
          <Layout>
            <UnderDevelopment />
          </Layout>
        </PrivateRoute>
      } />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;