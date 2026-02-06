import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { toast } from "sonner";

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserProfileDialog = ({ open, onOpenChange }: UserProfileDialogProps) => {
  const queryClient = useQueryClient();
  const { user, userRole } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      if (user && open) {
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, last_name, avatar_url")
          .eq("id", user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching user profile:", error);
          toast.error("Erro ao carregar seu perfil.");
        } else if (data) {
          setFirstName(data.first_name || "");
          setLastName(data.last_name || "");
          setAvatarUrl(data.avatar_url || "");
        }
        setNewPassword("");
        setConfirmPassword("");
      }
    };
    fetchProfile();
  }, [user, open]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não autenticado.");

      // 1. Atualizar dados do perfil na tabela public.profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          first_name: firstName, 
          last_name: lastName, 
          avatar_url: avatarUrl, 
          updated_at: new Date().toISOString() 
        })
        .eq("id", user.id);
      
      if (profileError) throw profileError;

      // 2. Se houver uma nova senha, atualizar no Auth
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error("As senhas não coincidem.");
        }
        if (newPassword.length < 6) {
          throw new Error("A senha deve ter pelo menos 6 caracteres.");
        }
        
        const { error: authError } = await supabase.auth.updateUser({
          password: newPassword
        });
        
        if (authError) throw authError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Perfil e senha atualizados com sucesso!");
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(`Erro ao atualizar: ${err.message}`);
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Seu Perfil</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              E-mail
            </Label>
            <Input
              id="email"
              value={user?.email || ""}
              readOnly
              className="col-span-3 bg-muted"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="first_name" className="text-right">
              Nome
            </Label>
            <Input
              id="first_name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="last_name" className="text-right">
              Sobrenome
            </Label>
            <Input
              id="last_name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="avatar_url" className="text-right">
              Avatar URL
            </Label>
            <Input
              id="avatar_url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="border-t my-2 pt-4">
            <p className="text-sm font-medium mb-4">Alterar Senha (opcional)</p>
            <div className="grid gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new_password" className="text-right">
                  Nova Senha
                </Label>
                <Input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="col-span-3"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="confirm_password" className="text-right">
                  Confirmar
                </Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={updateProfileMutation.isPending}>
            {updateProfileMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};