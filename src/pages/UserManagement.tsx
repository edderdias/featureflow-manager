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
import { Badge } from "@/components/ui/badge"; // Importação adicionada

export interface UserProfile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  email_confirmed_at: string | null; // Adicionado
  last_sign_in_at: string | null;    // Adicionado
}

const UserManagement = () => {
  const queryClient = useQueryClient();
  const { user, userRole } = useAuth(); // Obter userRole
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
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
    mutationFn: async ({ email, first_name, last_name }: { email: string; first_name: string; last_name: string }) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.functions.invoke("admin-actions", {
        method: "POST",
        body: { email, first_name, last_name }, 
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Convite enviado com sucesso!");
      setNewFirstName("");
      setNewLastName("");
      setNewEmail("");
    },
    onError: (err: any) => {
      let displayMessage = `Erro ao enviar convite: ${err.message}`;
      if (err.details) {
        try {
          const errorDetails = JSON.parse(err.details);
          if (errorDetails.error) {
            displayMessage = `Erro ao enviar convite: ${errorDetails.error}`;
          }
        } catch (parseError) {
          displayMessage = `Erro ao enviar convite: ${err.details}`;
        }
      }
      toast.error(displayMessage);
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.functions.invoke("admin-actions", {
        method: "POST",
        body: { email, action: "resend" }, // Passa a ação "resend"
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Link de convite reenviado com sucesso!");
    },
    onError: (err: any) => {
      let displayMessage = `Erro ao reenviar convite: ${err.message}`;
      if (err.details) {
        try {
          const errorDetails = JSON.parse(err.details);
          if (errorDetails.error) {
            displayMessage = `Erro ao reenviar convite: ${errorDetails.error}`;
          }
        } catch (parseError) {
          displayMessage = `Erro ao reenviar convite: ${err.details}`;
        }
      }
      toast.error(displayMessage);
    },
  });

  const updateUserProfileMutation = useMutation({
    mutationFn: async (updatedUser: Partial<UserProfile> & { password?: string }) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { id, first_name, last_name, avatar_url, role, password } = updatedUser;

      const { data, error } = await supabase.functions.invoke("admin-actions", {
        method: "PATCH",
        body: { userId: id, first_name, last_name, avatar_url, role, password },
      });

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
        body: { userId },
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
    if (newEmail.trim()) {
      inviteUserMutation.mutate({
        email: newEmail.trim(),
        first_name: newFirstName.trim(),
        last_name: newLastName.trim(),
      });
    } else {
      toast.error("O e-mail é obrigatório para o convite.");
    }
  };

  const handleResendInvite = (email: string) => {
    if (email) {
      resendInviteMutation.mutate(email);
    } else {
      toast.error("E-mail do usuário não disponível para reenviar convite.");
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

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Convidar Novo Usuário</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Input
                placeholder="Primeiro Nome"
                value={newFirstName}
                onChange={(e) => setNewFirstName(e.target.value)}
              />
              <Input
                placeholder="Sobrenome"
                value={newLastName}
                onChange={(e) => setNewLastName(e.target.value)}
              />
              <Input
                type="email"
                placeholder="E-mail do novo usuário"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleInviteUser()}
              />
            </div>
            <Button onClick={handleInviteUser} disabled={inviteUserMutation.isPending}>
              {inviteUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" /> Convidar Usuário
                </>
              )}
            </Button>
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
                  {users.map((profile) => {
                    // DEBUG: Log para inspecionar os valores
                    console.log(`User: ${profile.email}, email_confirmed_at: ${profile.email_confirmed_at}, last_sign_in_at: ${profile.last_sign_in_at}`);

                    // Condição ajustada para verificar se os campos são falsy (null, undefined, "")
                    const isInvitePending = !profile.email_confirmed_at && !profile.last_sign_in_at;

                    return (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">
                          {profile.first_name || profile.last_name ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : "Usuário sem nome"}
                        </TableCell>
                        <TableCell>{profile.email || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{profile.role}</Badge>
                        </TableCell>
                        <TableCell className="text-right flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(profile)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {/* Botão de Reenviar Convite - AGORA SÓ PARA ADMINS */}
                          {isInvitePending && userRole === "admin" && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleResendInvite(profile.email || '')}
                              disabled={resendInviteMutation.isPending}
                              title="Reenviar link de convite"
                            >
                              {resendInviteMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={profile.role !== 'admin'}
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
                    );
                  })}
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