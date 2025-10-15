import React, { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import { Navigation } from "./components/Navigation"; // Removido para lazy loading
import NotFound from "./pages/NotFound";
import { SessionContextProvider, useAuth } from "./integrations/supabase/auth";
import AdminProtectedRoute from "./components/AdminProtectedRoute";

const queryClient = new QueryClient();

// Lazy load page components
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const DemandList = React.lazy(() => import("./pages/DemandList"));
const KanbanBoard = React.lazy(() => import("./pages/KanbanBoard"));
const TableView = React.lazy(() => import("./pages/TableView"));
const CalendarView = React.lazy(() => import("./pages/CalendarView"));
const GanttView = React.lazy(() => import("./pages/GanttView"));
const Reports = React.lazy(() => import("./pages/Reports"));
const TagManagement = React.lazy(() => import("./pages/TagManagement"));
const UserManagement = React.lazy(() => import("./pages/UserManagement"));
const Login = React.lazy(() => import("./pages/Login"));
const ClientDemand = React.lazy(() => import("./pages/ClientDemand")); // Lazy load ClientDemand

// Lazy load GlobalProviders
const LazyGlobalProviders = React.lazy(() => import("./components/GlobalProviders"));

// Lazy load Navigation
const LazyNavigation = React.lazy(() => import("./components/Navigation").then(module => ({ default: module.Navigation })));

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
        <Suspense fallback={null}> {/* Fallback para Navigation */}
          <LazyNavigation />
        </Suspense>
      )}
      <Suspense fallback={<div className="flex justify-center items-center min-h-screen text-muted-foreground">Carregando página...</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/client-demand" element={<ClientDemand />} /> {/* New public route */}
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
            path="/table"
            element={
              <ProtectedRoute>
                <TableView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <CalendarView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gantt"
            element={
              <ProtectedRoute>
                <GanttView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tags"
            element={
              <ProtectedRoute>
                <TagManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
};

export default App;