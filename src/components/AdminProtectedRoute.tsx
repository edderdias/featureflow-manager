import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/integrations/supabase/auth";

const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { userRole, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Carregando...</div>;
  }

  if (userRole !== "admin") {
    return <Navigate to="/" replace />; // Redireciona para o dashboard se não for admin
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;