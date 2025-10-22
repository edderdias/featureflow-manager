import React, { createContext, useContext, useState, useEffect } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "./client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  userRole: string | null; // Adicionado para armazenar o papel do usuário
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const SessionContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null); // Estado para o papel do usuário
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user || null);

      if (session?.user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (error) {
          console.error("Error fetching user profile:", error);
          setUserRole(null);
        } else {
          setUserRole(profile?.role || "user"); // Define o papel, padrão para 'user'
        }
      } else {
        setUserRole(null);
      }
      setIsLoading(false);
    };

    fetchSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      if (session?.user) {
        // Re-fetch profile on auth state change to get updated role
        supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single()
          .then(({ data: profile, error }) => {
            if (error) {
              console.error("Error fetching user profile on auth state change:", error);
              setUserRole(null);
            } else {
              setUserRole(profile?.role || "user");
            }
          });
      } else {
        setUserRole(null);
      }
      setIsLoading(false);
      if (_event === 'SIGNED_OUT') {
        navigate('/login');
      } else if (_event === 'SIGNED_IN') {
        // Verifica se o URL contém o parâmetro 'type=invite' na hash
        const urlParams = new URLSearchParams(window.location.hash.substring(1)); // Remove '#'
        const isInviteFlow = urlParams.get('type') === 'invite';

        if (isInviteFlow) {
          // Se for um fluxo de convite, redireciona para a página de confirmação de convite
          navigate('/confirm-invite');
        } else if (window.location.pathname === '/login') {
          // Se não for um fluxo de convite e o usuário estiver na página de login, redireciona para o dashboard
          navigate('/');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ session, user, isLoading, userRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within a SessionContextProvider");
  }
  return context;
};