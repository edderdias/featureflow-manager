import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Demand, DemandPriority, DemandStatus, DemandType, SystemType, ChecklistItem, Attachment } from "@/types/demand";
import { Plus, Paperclip, Link2, CheckSquare, X, Upload, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface DemandDialogProps {
  demand?: Demand;
  onSave: (demand: Partial<Demand>) => void;
  trigger?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DemandDialog = ({ demand, onSave, trigger, open, onOpenChange }: DemandDialogProps) => {
  const [formData, setFormData] = useState<Partial<Demand>>(
    demand || {
      title: "",
      description: "",
      type: "feature",
      priority: "medium",
      status: "todo",
      system: "toqweb",
      responsible: "",
      checklist: [],
      attachments: [],
      tags: [],
      storyPoints: 0,
    }
  );

  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [newLink, setNewLink] = useState({ name: "", url: "" });
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (demand) {
      setFormData(demand);
    } else {
      setFormData({
        title: "",
        description: "",
        type: "feature",
        priority: "medium",
        status: "todo",
        system: "toqweb",
        responsible: "",
        checklist: [],
        attachments: [],
        tags: [],
        storyPoints: 0,
      });
    }
  }, [demand, open]); // Reset form when dialog opens or demand changes

  const handleSave = () => {
    onSave(formData);
    onOpenChange(false);
  };

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setFormData({
        ...formData,
        checklist: [
          ...(formData.checklist || []),
          { id: Date.now().toString(), text: newChecklistItem, completed: false },
        ],
      });
      setNewChecklistItem("");
    }
  };

  const toggleChecklistItem = (id: string) => {
    setFormData({
      ...formData,
      checklist: formData.checklist?.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      ),
    });
  };

  const removeChecklistItem = (id: string) => {
    setFormData({
      ...formData,
      checklist: formData.checklist?.filter((item) => item.id !== id),
    });
  };

  const addLink = () => {
    if (newLink.name && newLink.url) {
      setFormData({
        ...formData,
        attachments: [
          ...(formData.attachments || []),
          {
            id: Date.now().toString(),
            name: newLink.name,
            type: "link",
            url: newLink.url,
            uploadedAt: new Date(),
          },
        ],
      });
      setNewLink({ name: "", url: "" });
    }
  };

  const removeAttachment = (id: string) => {
    setFormData({
      ...formData,
      attachments: formData.attachments?.filter((att) => att.id !== id),
    });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag)) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), newTag],
      });
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((t) => t !== tag),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{demand ? "Editar Demanda" : "Nova Demanda"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="attachments">Anexos</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Implementar login com Google"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva os detalhes da demanda..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as DemandType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feature">Novo Recurso</SelectItem>
                    <SelectItem value="bug">Bug</SelectItem>
                    <SelectItem value="repair">Reparo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade *</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value as DemandPriority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as DemandStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">A Fazer</SelectItem>
                    <SelectItem value="in-progress">Em Andamento</SelectItem>
                    <SelectItem value="testing">Em Teste</SelectItem>
                    <SelectItem value="done">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="system">Sistema *</Label>
                <Select
                  value={formData.system}
                  onValueChange={(value) => setFormData({ ...formData, system: value as SystemType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="toqweb">TOQWEB</SelectItem>
                    <SelectItem value="gmax">GMAX</SelectItem>
                    <SelectItem value="toqblend">TOQBLEND</SelectItem>
                    <SelectItem value="t5">T5</SelectItem>
                    <SelectItem value="t10">T10</SelectItem>
                    <SelectItem value="ecopdv">ECOPDV</SelectItem>
                    <SelectItem value="toqped">TOQPED</SelectItem>
                    <SelectItem value="toqvenda">TOQVENDA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="responsible">Responsável *</Label>
                <Input
                  id="responsible"
                  value={formData.responsible}
                  onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                  placeholder="Nome do responsável"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sprint">Sprint</Label>
                <Input
                  id="sprint"
                  value={formData.sprint || ""}
                  onChange={(e) => setFormData({ ...formData, sprint: e.target.value })}
                  placeholder="Ex: Sprint 23"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="storyPoints">Story Points</Label>
                <Input
                  id="storyPoints"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.storyPoints || 0}
                  onChange={(e) => setFormData({ ...formData, storyPoints: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Data de Entrega</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate ? formData.dueDate.toISOString().split("T")[0] : ""}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value ? new Date(e.target.value) : undefined })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Adicionar tag..."
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                />
                <Button type="button" size="sm" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags?.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="checklist" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Input
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                placeholder="Adicionar item..."
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addChecklistItem())}
              />
              <Button type="button" size="sm" onClick={addChecklistItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {formData.checklist?.map((item) => (
                <div key={item.id} className="flex items-center gap-2 p-2 rounded border">
                  <Checkbox checked={item.completed} onCheckedChange={() => toggleChecklistItem(item.id)} />
                  <span className={item.completed ? "line-through text-muted-foreground flex-1" : "flex-1"}>
                    {item.text}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => removeChecklistItem(item.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {(!formData.checklist || formData.checklist.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum item adicionado</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="attachments" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Adicionar Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={newLink.name}
                    onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
                    placeholder="Nome do link"
                    className="flex-1"
                  />
                  <Input
                    value={newLink.url}
                    onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                    placeholder="URL"
                    className="flex-1"
                  />
                  <Button type="button" size="sm" onClick={addLink}>
                    <Link2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Anexos</Label>
                {formData.attachments?.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-2 p-2 rounded border">
                    {attachment.type === "link" ? (
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{attachment.name}</p>
                      {attachment.type === "link" && (
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          {attachment.url}
                        </a>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeAttachment(attachment.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {(!formData.attachments || formData.attachments.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum anexo adicionado</p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};