import React, { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";
import { SessionContextProvider, useAuth } from "./integrations/supabase/auth";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import TechnicianProtectedRoute from "./components/TechnicianProtectedRoute";

const queryClient = new QueryClient();

// Lazy load page components
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const DemandList = React.lazy(() => import("./pages/DemandList"));
const KanbanBoard = React.lazy(() => import("./pages/KanbanBoard"));
const Reports = React.lazy(() => import("./pages/Reports"));
const TagManagement = React.lazy(() => import("./pages/TagManagement"));
const UserManagement = React.lazy(() => import("./pages/UserManagement"));
const Login = React.lazy(() => import("./pages/Login")); // Alterado para lazy load
const ClientDemand = React.lazy(() => import("./pages/ClientDemand"));
const ConfirmInvite = React.lazy(() => import("./pages/ConfirmInvite"));

// Lazy load GlobalProviders e Navigation
const LazyGlobalProviders = React.lazy(() => import("./components/GlobalProviders"));
const Navigation = React.lazy(() => import("./components/Navigation").then(m => ({ default: m.Navigation })));

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
        <Suspense fallback={null}>
          <Navigation />
        </Suspense>
      )}
      <Suspense fallback={<div className="flex justify-center items-center min-h-screen text-muted-foreground">Carregando página...</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/client-demand" element={<ClientDemand />} />
          <Route path="/confirm-invite" element={<ConfirmInvite />} />
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
              <TechnicianProtectedRoute>
                <Reports />
              </TechnicianProtectedRoute>
            }
          />
          <Route
            path="/tags"
            element={
              <TechnicianProtectedRoute>
                <TagManagement />
              </TechnicianProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <AdminProtectedRoute>
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