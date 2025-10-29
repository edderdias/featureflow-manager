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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns"; // Importar format para formatar datas

interface DemandDialogProps {
  demand?: Demand;
  onSave: (demand: Partial<Demand>) => void;
  trigger?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Definir interface para Tag (igual à usada em TagManagement)
interface Tag {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

export const DemandDialog = ({ demand, onSave, trigger, open, onOpenChange }: DemandDialogProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Query para buscar o perfil do usuário logado
  const { data: profileData } = useQuery({
    queryKey: ["profiles", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const currentUserName = profileData?.first_name || profileData?.last_name
    ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim()
    : user?.email || "Usuário Desconhecido";

  const [formData, setFormData] = useState<Partial<Demand>>(
    demand || {
      title: "",
      description: "",
      type: undefined,
      priority: "medium",
      status: "todo", // Default status
      system: undefined,
      responsible: "",
      checklist: [],
      attachments: [],
      tags: [],
      storyPoints: 0,
      createdAt: new Date(), // Default for new demands
      dueDate: undefined, // Default to undefined for new demands
      creatorName: currentUserName,
      creatorEmail: user?.email, // Inicializa creatorEmail com o e-mail do usuário logado para novas demandas
    }
  );

  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [newLink, setNewLink] = useState({ name: "", url: "" });
  const [newTag, setNewTag] = useState("");
  const [statusError, setStatusError] = useState<string | null>(null); // Novo estado para erro de status

  useEffect(() => {
    if (demand) {
      setFormData(demand);
    } else {
      setFormData({
        title: "",
        description: "",
        type: undefined,
        priority: "medium",
        status: "todo",
        system: undefined,
        responsible: "",
        checklist: [],
        attachments: [],
        tags: [],
        storyPoints: 0,
        createdAt: new Date(),
        dueDate: undefined, // Garante que seja undefined para novas demandas
        creatorName: currentUserName,
        creatorEmail: user?.email, // Garante que o email do criador seja preenchido para novas demandas
        client_email: user?.email
      });
    }
    setStatusError(null); // Limpa o erro de status ao abrir/fechar o diálogo
  }, [demand, open, currentUserName, user?.email]);

  // Query para buscar tags existentes do Supabase
  const { data: existingTags, isLoading: isLoadingTags } = useQuery<Tag[], Error>({
    queryKey: ["tags", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as Tag[];
    },
    enabled: !!user,
  });

  // Mutação para adicionar uma nova tag ao banco de dados
  const addTagToDbMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("tags")
        .insert({ name, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] }); // Invalida o cache de tags para recarregar
      toast.success("Nova tag criada no sistema!");
    },
    onError: (err) => {
      toast.error(`Erro ao criar nova tag: ${err.message}`);
    },
  });

  const handleSave = () => {
    if (!formData.status) {
      setStatusError("O status da demanda é obrigatório.");
      toast.error("Por favor, selecione um status para a demanda.");
      return;
    }
    // Adiciona validação para creatorEmail se o usuário estiver logado
    if (user && !formData.creatorEmail) {
      toast.error("O e-mail do criador é obrigatório.");
      return;
    }
    setStatusError(null); // Limpa o erro se a validação passar
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

  const addTag = async () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !formData.tags?.includes(trimmedTag)) {
      // Verifica se a tag já existe no banco de dados
      const tagExistsInDb = existingTags?.some(tag => tag.name.toLowerCase() === trimmedTag.toLowerCase());

      if (!tagExistsInDb) {
        // Se não existe, cria a tag no banco de dados
        await addTagToDbMutation.mutateAsync(trimmedTag);
      }
      
      // Adiciona a tag à demanda (seja ela nova ou já existente)
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), trimmedTag],
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

  // Determina qual e-mail exibir e qual rótulo usar
  const displayEmail = formData.creatorEmail || formData.client_email || "";
  const emailLabel = formData.creatorEmail ? "E-mail do Criador" : (formData.client_email ? "E-mail do Cliente" : "E-mail");

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
              <Label htmlFor="creatorName">Criado por</Label>
              <Input
                id="creatorName"
                value={formData.creatorName || ""}
                onChange={(e) => setFormData({ ...formData, creatorName: e.target.value })}
                placeholder="Nome do criador"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="creatorEmail">{emailLabel}</Label>
              <Input
                id="creatorEmail"
                value={displayEmail}
                readOnly
                className="bg-muted/50 cursor-not-allowed"
                placeholder="E-mail do criador ou cliente"
              />
            </div>

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
                    <SelectValue placeholder="Selecione o tipo" />
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
                    <SelectValue placeholder="Selecione a prioridade" />
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
                  onValueChange={(value) => {
                    setFormData({ ...formData, status: value as DemandStatus });
                    setStatusError(null); // Limpa o erro ao selecionar um status
                  }}
                >
                  <SelectTrigger className={cn(statusError && "border-destructive focus-visible:ring-destructive")}>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">A Fazer</SelectItem>
                    <SelectItem value="in-progress">Em Andamento</SelectItem>
                    <SelectItem value="testing">Em Teste</SelectItem>
                    <SelectItem value="done">Concluído</SelectItem>
                  </SelectContent>
                </Select>
                {statusError && <p className="text-sm text-destructive mt-1">{statusError}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="system">Sistema *</Label>
                <Select
                  value={formData.system}
                  onValueChange={(value) => setFormData({ ...formData, system: value as SystemType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o sistema" />
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
                <Label htmlFor="createdAt">Data de Criação</Label>
                <Input
                  id="createdAt"
                  type="date"
                  value={formData.createdAt ? format(formData.createdAt, "yyyy-MM-dd") : ""}
                  readOnly
                  className="bg-muted/50 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Data de Vencimento</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate ? format(formData.dueDate, "yyyy-MM-dd") : ""}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.target.value ? new Date(e.target.value) : undefined })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Adicionar tag..."
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  disabled={isLoadingTags || addTagToDbMutation.isPending}
                />
                <Button type="button" size="sm" onClick={addTag} disabled={isLoadingTags || addTagToDbMutation.isPending}>
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
                placeholder="Adicionar item ao checklist..."
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
                    placeholder="URL do link"
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