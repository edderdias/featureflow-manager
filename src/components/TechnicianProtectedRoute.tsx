import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/integrations/supabase/auth";

const TechnicianProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { userRole, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Carregando...</div>;
  }

  // Permite acesso se for 'admin' ou 'technician'
  if (userRole !== "admin" && userRole !== "technician") {
    return <Navigate to="/" replace />; // Redireciona para o dashboard se não for admin nem técnico
  }

  return <>{children}</>;
};

export default TechnicianProtectedRoute;