import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const portugueseLocalization = {
  variables: {
    sign_in: {
      email_label: "Seu e-mail",
      password_label: "Sua senha",
      email_input_placeholder: "Digite seu e-mail",
      password_input_placeholder: "Digite sua senha",
      button_label: "Entrar",
      social_provider_text: "Ou continue com",
      link_text: "Já tem uma conta? Faça login",
      forgotten_password_text: "Esqueceu sua senha?",
      confirmation_code_label: "Código de confirmação",
      confirmation_code_input_placeholder: "Digite seu código de confirmação",
      confirmation_code_button_label: "Confirmar",
    },
    sign_up: {
      email_label: "Seu e-mail",
      password_label: "Crie uma senha",
      email_input_placeholder: "Digite seu e-mail",
      password_input_placeholder: "Crie sua senha",
      button_label: "Registrar",
      social_provider_text: "Ou continue com",
      link_text: "Não tem uma conta? Registre-se",
    },
    forgotten_password: {
      email_label: "Seu e-mail",
      email_input_placeholder: "Digite seu e-mail para redefinir",
      button_label: "Enviar instruções de redefinição",
      link_text: "Lembrou sua senha? Faça login",
    },
    update_password: {
      password_label: "Nova senha",
      password_input_placeholder: "Digite sua nova senha",
      button_label: "Atualizar senha",
    },
    magic_link: {
      email_input_placeholder: "Digite seu e-mail para o link mágico",
      button_label: "Enviar link mágico",
      link_text: "Já tem uma conta? Faça login",
    },
  },
};

const Login = () => {
  const { session, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && session) {
      navigate("/");
    }
  }, [session, isLoading, navigate]);

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Carregando...</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="flex w-full max-w-6xl rounded-lg shadow-lg overflow-hidden bg-card">
        {/* Left side: Login Form */}
        <div className="w-full md:w-[30%] p-8 space-y-6 flex flex-col justify-center">
          <img src="/logo.svg" alt="ToqDesk Logo" className="h-24 w-24 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-center text-foreground">Bem-vindo ao ToqDesk</h2>
          <Auth
            supabaseClient={supabase}
            providers={[]}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: "hsl(var(--primary))",
                    brandAccent: "hsl(var(--primary-foreground))",
                  },
                },
              },
            }}
            theme="light"
            redirectTo={window.location.origin + '/login'}
            localization={portugueseLocalization}
          />
          <div className="text-center mt-4">
            <Link to="/client-demand">
              <Button variant="outline" className="w-full">
                Abrir Demanda de Cliente
              </Button>
            </Link>
          </div>
        </div>

        {/* Right side: Image */}
        <div className="hidden md:flex md:w-[70%] bg-primary/10 items-center justify-center p-0"> {/* Removido padding */}
          <img src="/toqdesk.png" alt="ToqDesk Illustration" className="w-full h-full object-cover" /> {/* Preenche todo o espaço */}
        </div>
      </div>
    </div>
  );
};

export default Login;