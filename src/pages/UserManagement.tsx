import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, User, Mail, Shield, Loader2, Edit, Trash2, CheckCircle2, UserPlus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { EditUserDialog } from "@/components/EditUserDialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

export interface UserProfile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
}

const UserManagement = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isDirectRegistration, setIsDirectRegistration] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | undefined>(undefined);

  const fetchUsers = async () => {
    if (!currentUser) return [];
    const { data, error } = await supabase.functions.invoke("admin-actions", {
      method: "GET",
    });
    if (error) throw error;
    return data as UserProfile[];
  };

  const { data: users, isLoading, error } = useQuery<UserProfile[], Error>({
    queryKey: ["users", currentUser?.id],
    queryFn: fetchUsers,
    enabled: !!currentUser,
  });

  const userActionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.functions.invoke("admin-actions", {
        method: "POST",
        body: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      const message = variables.action === "create" ? "Usuário cadastrado com sucesso!" : 
                      variables.action === "confirm" ? "Usuário confirmado com sucesso!" : 
                      "Convite enviado com sucesso!";
      toast.success(message);
      if (variables.action !== "confirm") {
        setNewFirstName("");
        setNewLastName("");
        setNewEmail("");
        setNewPassword("");
      }
    },
    onError: (err: any) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const updateUserProfileMutation = useMutation({
    mutationFn: async (updatedUser: Partial<UserProfile> & { password?: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-actions", {
        method: "PATCH",
        body: { userId: updatedUser.id, ...updatedUser },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Perfil atualizado!");
      setIsEditDialogOpen(false);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-actions", {
        method: "DELETE",
        body: { userId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuário excluído!");
    },
  });

  const handleAddUser = () => {
    if (!newEmail.trim()) return toast.error("E-mail é obrigatório");
    if (isDirectRegistration && !newPassword.trim()) return toast.error("Senha é obrigatória para cadastro direto");

    userActionMutation.mutate({
      email: newEmail.trim(),
      first_name: newFirstName.trim(),
      last_name: newLastName.trim(),
      password: newPassword.trim(),
      action: isDirectRegistration ? "create" : "invite"
    });
  };

  const handleConfirmUser = (userId: string) => {
    userActionMutation.mutate({ userId, action: "confirm" });
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="container mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground">Administre os acessos e perfis do sistema.</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{isDirectRegistration ? "Cadastrar Novo Usuário" : "Convidar Novo Usuário"}</span>
              <Button variant="ghost" size="sm" onClick={() => setIsDirectRegistration(!isDirectRegistration)}>
                {isDirectRegistration ? "Mudar para Convite" : "Mudar para Cadastro Direto"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="space-y-2">
                <Label>Primeiro Nome</Label>
                <Input value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} placeholder="Ex: João" />
              </div>
              <div className="space-y-2">
                <Label>Sobrenome</Label>
                <Input value={newLastName} onChange={(e) => setNewLastName(e.target.value)} placeholder="Ex: Silva" />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@exemplo.com" />
              </div>
              {isDirectRegistration && (
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Senha inicial" />
                </div>
              )}
            </div>
            <Button onClick={handleAddUser} disabled={userActionMutation.isPending} className="w-full md:w-auto">
              {userActionMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : (isDirectRegistration ? <UserPlus className="mr-2 h-4 w-4" /> : <Mail className="mr-2 h-4 w-4" />)}
              {isDirectRegistration ? "Cadastrar Agora" : "Enviar Convite"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usuários do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.first_name} {u.last_name}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      {u.email_confirmed_at ? (
                        <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Confirmado</Badge>
                      ) : (
                        <Badge variant="warning">Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                    <TableCell className="text-right space-x-2">
                      {!u.email_confirmed_at && (
                        <Button variant="outline" size="sm" onClick={() => handleConfirmUser(u.id)} title="Confirmar Manualmente">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => { setEditingUser(u); setIsEditDialogOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Usuário?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação removerá permanentemente o acesso deste usuário.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteUserMutation.mutate(u.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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