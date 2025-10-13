import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";

const InviteUserPage = () => {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const inviteUserMutation = useMutation({
    mutationFn: async (userData: { email: string; first_name: string; last_name: string }) => {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: JSON.stringify(userData),
        headers: { "Content-Type": "application/json" },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Convite enviado com sucesso! O usuário receberá um e-mail para definir a senha.");
      setEmail("");
      setFirstName("");
      setLastName("");
    },
    onError: (err) => {
      toast.error(`Erro ao enviar convite: ${err.message}`);
    },
  });

  const handleInviteUser = () => {
    if (!email.trim()) {
      toast.error("O e-mail é obrigatório.");
      return;
    }
    inviteUserMutation.mutate({ email: email.trim(), first_name: firstName.trim(), last_name: lastName.trim() });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Convidar Novo Usuário</h1>
          <p className="text-muted-foreground">
            Envie um convite por e-mail para novos membros da equipe se cadastrarem.
          </p>
        </div>

        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>Detalhes do Convite</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={inviteUserMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName">Primeiro Nome</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="João"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={inviteUserMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Sobrenome</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Silva"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={inviteUserMutation.isPending}
              />
            </div>
            <Button
              onClick={handleInviteUser}
              disabled={inviteUserMutation.isPending || !email.trim()}
              className="w-full"
            >
              {inviteUserMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Enviar Convite
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InviteUserPage;