import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { UserProfile } from "@/pages/UserManagement";

interface EditUserDialogProps {
  user: UserProfile;
  onSave: (updatedUser: Partial<UserProfile> & { password?: string }) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditUserDialog = ({ user, onSave, open, onOpenChange }: EditUserDialogProps) => {
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    avatar_url: user.avatar_url || "",
    role: user.role || "user",
    is_dev: user.is_dev || false,
  });
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        avatar_url: user.avatar_url || "",
        role: user.role || "user",
        is_dev: user.is_dev || false,
      });
      setNewPassword("");
    }
  }, [user, open]);

  const handleSave = () => {
    onSave({ 
      id: user.id, 
      ...formData, 
      password: newPassword || undefined
    });
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
            <Label htmlFor="email" className="text-right">
              E-mail
            </Label>
            <Input
              id="email"
              value={user.email || ""}
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
            <Label htmlFor="role" className="text-right">
              Papel
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecionar Papel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuário</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="technician">Técnico</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Dev</Label>
            <div className="col-span-3 flex items-center space-x-2">
              <Checkbox 
                id="is_dev" 
                checked={formData.is_dev} 
                onCheckedChange={(checked) => setFormData({ ...formData, is_dev: !!checked })} 
              />
              <Label htmlFor="is_dev" className="text-xs text-muted-foreground">Marcar como desenvolvedor</Label>
            </div>
          </div>
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
              placeholder="Deixe em branco para não alterar"
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