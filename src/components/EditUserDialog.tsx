import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserProfile } from "@/pages/UserManagement"; // Importar a interface UserProfile

interface EditUserDialogProps {
  user: UserProfile;
  onSave: (updatedUser: Partial<UserProfile>) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditUserDialog = ({ user, onSave, open, onOpenChange }: EditUserDialogProps) => {
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    avatar_url: user.avatar_url || "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        avatar_url: user.avatar_url || "",
      });
    }
  }, [user, open]);

  const handleSave = () => {
    onSave({ id: user.id, ...formData });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Perfil do Usuário</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="first_name" className="text-right">
              Primeiro Nome
            </Label>
            <Input
              id="first_name"
              value={formData.first_name || ""}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="last_name" className="text-right">
              Sobrenome
            </Label>
            <Input
              id="last_name"
              value={formData.last_name || ""}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="avatar_url" className="text-right">
              URL do Avatar
            </Label>
            <Input
              id="avatar_url"
              value={formData.avatar_url || ""}
              onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};