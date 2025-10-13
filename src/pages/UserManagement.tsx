import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, User, Mail, Shield, Loader2, Edit, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { EditUserDialog } from "@/components/EditUserDialog"; // Importar o novo componente de diálogo

export interface UserProfile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

const UserManagement = () => {
  const queryClient = useQueryClient();
  const { user, userRole } = useAuth();
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | undefined>(undefined);

  const fetchUsers = async () => {
    if (userRole !== "admin") return [];
    
    // Call the admin-actions Edge Function to list users
    const { data, error } = await supabase.functions.invoke("admin-actions", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (error) throw error;
    return data as UserProfile[];
  };

  const { data: users, isLoading, error } = useQuery<UserProfile[], Error>({
    queryKey: ["users", user?.id, userRole],
    queryFn: fetchUsers,
    enabled: userRole === "admin",
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (email: string) => {
      setIsInviting(true);
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
      queryClient.invalidateQueries({ queryKey: ["users"] });
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

  const updateUserProfileMutation = useMutation({
    mutationFn: async (updatedUser: Partial<UserProfile>) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { id, first_name, last_name, avatar_url } = updatedUser;
      const { data, error } = await supabase
        .from("profiles")
        .update({ first_name, last_name, avatar_url })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Perfil do usuário atualizado com sucesso!");
      setIsEditDialogOpen(false);
      setEditingUser(undefined);
    },
    onError: (err) => {
      toast.error(`Erro ao atualizar perfil: ${err.message}`);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!user) throw new Error("Usuário não autenticado");
      // Call the admin-actions Edge Function to delete the user
      const { data, error } = await supabase.functions.invoke("admin-actions", {
        method: "DELETE",
        body: JSON.stringify({ userId }),
        headers: { "Content-Type": "application/json" },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuário excluído com sucesso!");
    },
    onError: (err) => {
      toast.error(`Erro ao excluir usuário: ${err.message}`);
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

  const handleEditUser = (userToEdit: UserProfile) => {
    setEditingUser(userToEdit);
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = (userId: string) => {
    deleteUserMutation.mutate(userId);
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
            Convide novos usuários e gerencie os papéis e perfis existentes
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
                      <TableCell>{profile.email || "N/A"}</TableCell>
                      <TableCell>
                        <Select
                          value={profile.role}
                          onValueChange={(newRole) => handleRoleChange(profile.id, newRole)}
                          disabled={profile.id === user?.id}
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
                      <TableCell className="text-right flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(profile)}
                          disabled={profile.id === user?.id} // Não permite editar o próprio perfil por aqui
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={profile.id === user?.id} // Não permite excluir o próprio usuário
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Isso excluirá permanentemente o usuário
                                e removerá seus dados de nossos servidores.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteUser(profile.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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

        {editingUser && (
          <EditUserDialog
            user={editingUser}
            onSave={updateUserProfileMutation.mutate}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
          />
        )}
      </div>
    </div>
  );
};

export default UserManagement;