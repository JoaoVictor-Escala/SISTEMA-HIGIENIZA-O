import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './Layout';
import Login from './pages/Login';
import VerifyEmail from './pages/VerifyEmail';
import ResetPassword from './pages/ResetPassword';
import CheckoutSuccess from './pages/CheckoutSuccess';
import CheckoutCancel from './pages/CheckoutCancel';
import PageLoader from './components/PageLoader';

// Lazy-loaded routes
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const CRM = React.lazy(() => import('./pages/CRM'));
const Calendar = React.lazy(() => import('./pages/Calendar'));
const Estoque = React.lazy(() => import('./pages/Estoque'));
const Financeiro = React.lazy(() => import('./pages/Financeiro'));
const Orcamentos = React.lazy(() => import('./pages/Orcamentos'));
const Configuracoes = React.lazy(() => import('./pages/Configuracoes'));
const PortalCliente = React.lazy(() => import('./pages/PortalCliente'));
const FollowUp = React.lazy(() => import('./pages/FollowUp'));
const ConsultorIA = React.lazy(() => import('./pages/ConsultorIA'));
const Afiliados = React.lazy(() => import('./pages/Afiliados'));
const ParceiroPortal = React.lazy(() => import('./pages/ParceiroPortal'));
const Admin = React.lazy(() => import('./pages/Admin'));

const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/verify" element={<VerifyEmail />} />
          <Route path="/proposta/:id" element={<PortalCliente />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/checkout/cancel" element={<CheckoutCancel />} />
          <Route path="/parceiro" element={<ParceiroPortal />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="clientes" element={<CRM />} />
              <Route path="agenda" element={<Calendar />} />
              <Route path="orcamentos" element={<Orcamentos />} />
              <Route path="financeiro" element={<Financeiro />} />
              <Route path="estoque" element={<Estoque />} />
              <Route path="configuracoes" element={<Configuracoes />} />
              <Route path="followup" element={<FollowUp />} />
              <Route path="consultor-ia" element={<ConsultorIA />} />
              <Route path="afiliados" element={<Afiliados />} />
              <Route path="admin" element={<Admin />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
