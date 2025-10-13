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
import { EditUserDialog } from "@/components/EditUserDialog";

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
  const { user } = useAuth();
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | undefined>(undefined);

  const fetchUsers = async () => {
    if (!user) return [];
    
    const { data, error } = await supabase.functions.invoke("admin-actions", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (error) throw error;
    return data as UserProfile[];
  };

  const { data: users, isLoading, error } = useQuery<UserProfile[], Error>({
    queryKey: ["users", user?.id],
    queryFn: fetchUsers,
    enabled: !!user,
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (email: string) => {
      setIsInviting(true);
      // A função invite-user foi removida, então esta mutação não será mais usada.
      // Mantendo o esqueleto para referência ou caso seja reintroduzida.
      // Por enquanto, esta funcionalidade não estará disponível.
      toast.error("A funcionalidade de convidar usuário está desabilitada.");
      throw new Error("Funcionalidade de convidar usuário desabilitada.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Convite enviado com sucesso!");
      setInviteEmail("");
    },
    onError: (err) => {
      toast.error(`Erro ao enviar convite: ${err.message}`);
    },
    onSettled: () => {
      setIsInviting(false);
    }
  });

  // Removida a mutação updateUserRoleMutation, pois a edição de papel será feita via updateUserProfileMutation
  // Removida a função handleRoleChange

  const updateUserProfileMutation = useMutation({
    mutationFn: async (updatedUser: Partial<UserProfile>) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { id, first_name, last_name, avatar_url, role } = updatedUser; // Incluído 'role'
      const { data, error } = await supabase
        .from("profiles")
        .update({ first_name, last_name, avatar_url, role }) // Atualiza 'role'
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie os perfis e papéis dos usuários existentes
          </p>
        </div>

        {/* O card de convite de usuário foi removido, pois a função Edge 'invite-user' foi excluída */}
        {/* Se a funcionalidade de convite for reintroduzida, este card pode ser adicionado novamente */}

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
                        <Badge variant="secondary">{profile.role}</Badge> {/* Exibe o papel como Badge */}
                      </TableCell>
                      <TableCell className="text-right flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(profile)}
                          disabled={profile.id === user?.id} // Impede que o usuário edite a si mesmo
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={profile.id === user?.id} // Impede que o usuário se exclua
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