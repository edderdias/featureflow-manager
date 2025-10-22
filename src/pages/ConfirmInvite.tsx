import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const ConfirmInvite = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleInviteSession = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error getting session:", sessionError);
        setError("Erro ao carregar a sessão. O link pode ser inválido ou expirado.");
        setIsLoading(false);
        return;
      }

      if (!session) {
        // If no session, it means the user hasn't clicked the invite link yet or it's expired.
        // Supabase's invite flow automatically signs in the user when they click the link.
        // If they land here without a session, it's likely an invalid/expired link or direct access.
        setError("Nenhuma sessão ativa encontrada. Por favor, verifique seu link de convite ou faça login.");
        setIsLoading(false);
        return;
      }

      // Check if the user is indeed in an invite flow (e.g., by checking the URL hash for 'type=invite')
      const urlParams = new URLSearchParams(window.location.hash.substring(1));
      const isInviteFlow = urlParams.get('type') === 'invite';

      if (!isInviteFlow) {
        // If there's a session but it's not an invite flow, redirect to dashboard
        toast.info("Você já está logado.");
        navigate("/");
        return;
      }

      setIsLoading(false);
    };

    handleInviteSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setIsSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      console.error("Error updating password:", updateError);
      setError(`Erro ao definir a senha: ${updateError.message}`);
      toast.error(`Erro ao definir a senha: ${updateError.message}`);
    } else {
      toast.success("Sua senha foi definida com sucesso! Você será redirecionado para o dashboard.");
      navigate("/");
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Definir Sua Senha</CardTitle>
          <p className="text-muted-foreground text-center">
            Bem-vindo! Por favor, crie uma nova senha para sua conta.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Pelo menos 6 caracteres"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme sua nova senha"
                required
                disabled={isSubmitting}
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Definindo Senha...
                </>
              ) : (
                "Definir Senha"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmInvite;