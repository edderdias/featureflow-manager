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

  useEffect(() => {
    const fetchProfile = async () => {
      if (user && open) {
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, last_name, avatar_url")
          .eq("id", user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 é o código de erro para "No rows found" com .single()
          console.error("Error fetching user profile:", error);
          toast.error("Erro ao carregar seu perfil.");
        } else if (data) {
          setFirstName(data.first_name || "");
          setLastName(data.last_name || "");
          setAvatarUrl(data.avatar_url || "");
        } else {
          // Se nenhum perfil for encontrado (data é null), inicializa com valores vazios
          setFirstName("");
          setLastName("");
          setAvatarUrl("");
        }
      }
    };
    fetchProfile();
  }, [user, open]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não autenticado.");
      const { error } = await supabase
        .from("profiles")
        .update({ first_name: firstName, last_name: lastName, avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles", user?.id] }); // Invalida o cache do perfil
      queryClient.invalidateQueries({ queryKey: ["users"] }); // Invalida o cache de usuários para atualizar a lista de gerenciamento
      toast.success("Perfil atualizado com sucesso!");
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(`Erro ao atualizar perfil: ${err.message}`);
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
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="first_name" className="text-right">
              Primeiro Nome
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
              URL do Avatar
            </Label>
            <Input
              id="avatar_url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">
              Papel
            </Label>
            <Input
              id="role"
              value={userRole || "user"}
              readOnly
              className="col-span-3"
            />
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