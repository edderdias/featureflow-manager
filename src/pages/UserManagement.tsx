import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, User, Mail, Shield, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: string;
  email?: string; // Adicionado para exibir o e-mail
}

const UserManagement = () => {
  const queryClient = useQueryClient();
  const { user, userRole } = useAuth();
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  const fetchUsers = async () => {
    if (userRole !== "admin") return [];
    
    // Fetch profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, avatar_url, role");

    if (profilesError) throw profilesError;

    // Fetch auth.users to get emails (only accessible with service role, so we'll simulate or use a function)
    // For security, direct access to auth.users from client is restricted.
    // We'll assume for now that the email can be derived or is not strictly needed for all users,
    // or that a separate edge function would provide it securely.
    // For this example, we'll just show the profile data.
    // If emails are critical, an admin-only edge function would be needed to fetch them.

    // We cannot directly list auth.users from the client-side with the anon key.
    // A more robust solution would involve another Edge Function to fetch user emails securely for admins.
    // For simplicity in this example, we'll just show profile data and indicate email as N/A if not available.
    // If you need emails, you'd extend the 'invite-user' Edge Function or create a new one to list users.

    const usersWithEmails = profiles.map(profile => {
      // In a real app, you'd fetch emails via an admin-protected Edge Function
      // For now, we'll just show the profile data.
      return {
        ...profile,
        email: "N/A", // Placeholder, as client-side anon key cannot list auth.users emails
      };
    });

    return usersWithEmails as UserProfile[];
  };

  const { data: users, isLoading, error } = useQuery<UserProfile[], Error>({
    queryKey: ["users", user?.id, userRole],
    queryFn: fetchUsers,
    enabled: userRole === "admin", // Only fetch if current user is admin
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (email: string) => {
      setIsInviting(true);
      // Call the Edge Function to invite the user
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: JSON.stringify({ email }),
        headers: { "Content-Type": "application/json" },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Convite enviado com sucesso!");
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["users"] }); // Invalida o cache para recarregar a lista de usuários
    },
    onError: (err) => {
      toast.error(`Erro ao enviar convite: ${err.message}`);
    },
    onSettled: () => {
      setIsInviting(false);
    }
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", id)
        // RLS will ensure only admins can update others.
        // The `eq("user_id", user.id)` is not needed here because the RLS policy
        // "Admins can update other profiles" already checks `auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')`.
        // Removing `eq("user_id", user.id)` to allow admin to update any profile, not just their own.
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Papel do usuário atualizado com sucesso!");
    },
    onError: (err) => {
      toast.error(`Erro ao atualizar papel: ${err.message}`);
    },
  });

  const handleInviteUser = () => {
    if (inviteEmail.trim()) {
      inviteUserMutation.mutate(inviteEmail.trim());
    }
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    updateUserRoleMutation.mutate({ id: userId, role: newRole });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-muted-foreground">Carregando gerenciamento de usuários...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-destructive">Erro ao carregar usuários: {error.message}</p>
      </div>
    );
  }

  if (userRole !== "admin") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-destructive">Acesso negado. Você não tem permissão de administrador.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground">
            Convide novos usuários e gerencie os papéis existentes
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Convidar Novo Usuário</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="E-mail do novo usuário"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleInviteUser()}
                disabled={isInviting}
              />
              <Button onClick={handleInviteUser} disabled={isInviting}>
                {isInviting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Convidar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usuários Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            {users && users.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">
                        {profile.first_name || profile.last_name ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : "Usuário sem nome"}
                      </TableCell>
                      <TableCell>{profile.email}</TableCell>
                      <TableCell>
                        <Select
                          value={profile.role}
                          onValueChange={(newRole) => handleRoleChange(profile.id, newRole)}
                          disabled={profile.id === user?.id} // Não permite mudar o próprio papel
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Selecionar Papel" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Usuário</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        {/* Futuras ações como remover usuário */}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-4">Nenhum usuário cadastrado ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserManagement;