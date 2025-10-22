import React, { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";
import { SessionContextProvider, useAuth } from "./integrations/supabase/auth";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import TechnicianProtectedRoute from "./components/TechnicianProtectedRoute"; // Importar TechnicianProtectedRoute

const queryClient = new QueryClient();

// Lazy load page components
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const DemandList = React.lazy(() => import("./pages/DemandList"));
const KanbanBoard = React.lazy(() => import("./pages/KanbanBoard"));
const Reports = React.lazy(() => import("./pages/Reports"));
const TagManagement = React.lazy(() => import("./pages/TagManagement"));
const UserManagement = React.lazy(() => import("./pages/UserManagement"));
import Login from "./pages/Login"; // Importação direta para Login
const ClientDemand = React.lazy(() => import("./pages/ClientDemand"));
const ConfirmInvite = React.lazy(() => import("./pages/ConfirmInvite")); // Lazy load ConfirmInvite

// Lazy load GlobalProviders
const LazyGlobalProviders = React.lazy(() => import("./components/GlobalProviders"));

// Importação DIRETA da Navigation para depuração
import { Navigation } from "./components/Navigation"; 

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, isLoading } = useAuth();
  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Carregando...</div>;
  }
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Suspense fallback={null}>
      <LazyGlobalProviders>
        <BrowserRouter>
          <SessionContextProvider>
            <AppRoutes />
          </SessionContextProvider>
        </BrowserRouter>
      </LazyGlobalProviders>
    </Suspense>
  </QueryClientProvider>
);

const AppRoutes = () => {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Carregando...</div>;
  }

  return (
    <>
      {session && (
        // Usando a importação direta
        <Navigation /> 
      )}
      <Suspense fallback={<div className="flex justify-center items-center min-h-screen text-muted-foreground">Carregando página...</div>}>
        <Routes>
          <Route path="/login" element={<Login />} /> {/* Usando o componente Login importado diretamente */}
          <Route path="/client-demand" element={<ClientDemand />} />
          <Route path="/confirm-invite" element={<ConfirmInvite />} /> {/* Nova rota para confirmar convite */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/demands"
            element={
              <ProtectedRoute>
                <DemandList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kanban"
            element={
              <ProtectedRoute>
                <KanbanBoard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <TechnicianProtectedRoute> {/* Apenas técnicos e admins */}
                <Reports />
              </TechnicianProtectedRoute>
            }
          />
          <Route
            path="/tags"
            element={
              <TechnicianProtectedRoute> {/* Apenas técnicos e admins */}
                <TagManagement />
              </TechnicianProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <AdminProtectedRoute> {/* Apenas admins */}
                <UserManagement />
              </AdminProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
};

export default App;