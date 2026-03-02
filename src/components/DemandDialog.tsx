import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Demand, DemandPriority, DemandStatus, DemandType, SystemType, ChecklistItem, Attachment, StackType } from "@/types/demand";
import { Plus, Paperclip, Link2, CheckSquare, X, Upload, FileText, Loader2, User as UserIcon, ExternalLink, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { v4 as uuidv4 } from 'uuid';

interface DemandDialogProps {
  demand?: Demand;
  onSave: (demand: Partial<Demand>) => void;
  trigger?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Tag {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

interface DevUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

export const DemandDialog = ({ demand, onSave, trigger, open, onOpenChange }: DemandDialogProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

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

  const { data: devUsers, isLoading: isLoadingDevs } = useQuery<DevUser[]>({
    queryKey: ["dev-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("is_dev", true);
      
      if (error) throw error;
      return data.map(d => ({
        id: d.id,
        first_name: d.first_name,
        last_name: d.last_name,
        email: "" 
      }));
    },
    enabled: open,
  });

  const currentUserName = profileData?.first_name || profileData?.last_name
    ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim()
    : user?.email || "Usuário Desconhecido";

  const [formData, setFormData] = useState<Partial<Demand>>({});
  const [activeTab, setActiveTab] = useState("info");
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [newLink, setNewLink] = useState({ name: "", url: "" });
  const [newTag, setNewTag] = useState("");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (demand) {
        setFormData({
          ...demand,
          creatorEmail: demand.creatorEmail || demand.client_email || user?.email,
          creatorName: demand.creatorName || demand.client_name || currentUserName,
          stack: demand.stack || "none",
        });
      } else {
        setFormData({
          title: "",
          description: "",
          type: "feature",
          priority: "medium",
          status: "todo",
          system: "toqweb",
          stack: "none",
          responsible: "", 
          checklist: [],
          attachments: [],
          tags: [],
          storyPoints: 0,
          createdAt: new Date(),
          dueDate: undefined,
          creatorName: currentUserName,
          creatorEmail: user?.email,
        });
      }
      setStatusError(null);
      setActiveTab("info");
    }
  }, [demand, open, currentUserName, user?.email]);

  const uploadFileToSupabase = async (file: File): Promise<Attachment | null> => {
    try {
      const fileExtension = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('client-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('client-attachments')
        .getPublicUrl(filePath);

      return {
        id: uuidv4(),
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'doc',
        url: publicUrlData.publicUrl,
        uploadedAt: new Date(),
      };
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast.error(`Erro ao fazer upload: ${error.message}`);
      return null;
    }
  };

  const handlePaste = useCallback(async (event: ClipboardEvent) => {
    if (!open || activeTab !== "attachments") return;

    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setIsUploading(true);
          const newAttachment = await uploadFileToSupabase(file);
          if (newAttachment) {
            setFormData(prev => ({
              ...prev,
              attachments: [...(prev.attachments || []), newAttachment]
            }));
            toast.success("Imagem colada e enviada com sucesso!");
          }
          setIsUploading(false);
        }
      }
    }
  }, [open, activeTab]);

  useEffect(() => {
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const { data: existingTags, isLoading: isLoadingTags } = useQuery<Tag[], Error>({
    queryKey: ["tags-full", user?.id],
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
      queryClient.invalidateQueries({ queryKey: ["tags-full"] });
      queryClient.invalidateQueries({ queryKey: ["tags-names"] });
      toast.success("Nova tag criada no sistema!");
    },
    onError: (err) => {
      toast.error(`Erro ao criar nova tag: ${err.message}`);
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const newAttachment = await uploadFileToSupabase(file);
    if (newAttachment) {
      setFormData(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), newAttachment]
      }));
      toast.success("Arquivo enviado com sucesso!");
    }
    setIsUploading(false);
    event.target.value = '';
  };

  const handleSave = () => {
    if (!formData.title) {
      toast.error("O título da demanda é obrigatório.");
      return;
    }
    if (!formData.status) {
      setStatusError("O status da demanda é obrigatório.");
      toast.error("Por favor, selecione um status para a demanda.");
      return;
    }
    if (!formData.responsible) {
      toast.error("O responsável é obrigatório.");
      return;
    }
    
    const email = formData.creatorEmail || formData.client_email || user?.email;
    if (!email) {
      toast.error("O e-mail é obrigatório para salvar a demanda.");
      return;
    }

    setStatusError(null);
    onSave({
      ...formData,
      creatorEmail: email,
      client_email: formData.client_email || email
    });
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
      const tagExistsInDb = existingTags?.some(tag => tag.name.toLowerCase() === trimmedTag.toLowerCase());

      if (!tagExistsInDb) {
        await addTagToDbMutation.mutateAsync(trimmedTag);
      }
      
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

  const displayEmail = formData.creatorEmail || formData.client_email || user?.email || "";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{demand ? "Editar Demanda" : "Nova Demanda"}</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="checklist">Checklist</TabsTrigger>
              <TabsTrigger value="attachments">Anexos</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
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
                  <Label htmlFor="creatorEmail">E-mail</Label>
                  <Input
                    id="creatorEmail"
                    value={displayEmail}
                    readOnly
                    className="bg-muted/50 cursor-not-allowed"
                    placeholder="E-mail do criador"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title || ""}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Implementar login com Google"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
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
                      setStatusError(null);
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
                      <SelectItem value="api">API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="responsible">Responsável *</Label>
                  <Select
                    value={formData.responsible}
                    onValueChange={(value) => setFormData({ ...formData, responsible: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingDevs ? "Carregando..." : "Selecione um dev"} />
                    </SelectTrigger>
                    <SelectContent>
                      {devUsers?.map((dev) => (
                        <SelectItem key={dev.id} value={`${dev.first_name || ''} ${dev.last_name || ''}`.trim()}>
                          {`${dev.first_name || ''} ${dev.last_name || ''}`.trim()}
                        </SelectItem>
                      ))}
                      {devUsers?.length === 0 && (
                        <SelectItem value="none" disabled>Nenhum desenvolvedor cadastrado</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
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
                  <Label htmlFor="dueDate">Data de Vencimento</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate ? format(formData.dueDate, "yyyy-MM-dd") : ""}
                    onChange={(e) => {
                      const dateString = e.target.value;
                      if (dateString) {
                        const [year, month, day] = dateString.split('-').map(Number);
                        const localDate = new Date(year, month - 1, day);
                        setFormData({ ...formData, dueDate: localDate });
                      } else {
                        setFormData({ ...formData, dueDate: undefined });
                      }
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stack">Stack *</Label>
                  <Select
                    value={formData.stack}
                    onValueChange={(value) => setFormData({ ...formData, stack: value as StackType })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a stack" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem Stack</SelectItem>
                      <SelectItem value="backend">BackEnd</SelectItem>
                      <SelectItem value="frontend">FrontEnd</SelectItem>
                      <SelectItem value="apps">Apps</SelectItem>
                    </SelectContent>
                  </Select>
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
              <div className="space-y-6">
                <div className="p-4 border-2 border-dashed rounded-lg text-center bg-muted/20">
                  <p className="text-sm text-muted-foreground">
                    Dica: Você pode colar uma imagem diretamente aqui (Ctrl+V)
                  </p>
                </div>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Fazer Upload de Arquivo</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="cursor-pointer"
                      />
                      {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Ou adicionar link</span>
                    </div>
                  </div>

                  <div className="space-y-2">
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
                </div>

                <div className="space-y-2">
                  <Label>Anexos Adicionados</Label>
                  <div className="grid gap-3">
                    {formData.attachments?.map((attachment) => (
                      <div key={attachment.id} className="flex items-center gap-3 p-2 rounded border bg-muted/30 group">
                        {attachment.type === "image" ? (
                          <div 
                            className="relative h-12 w-12 rounded overflow-hidden border bg-background cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setSelectedImageUrl(attachment.url)}
                          >
                            <img src={attachment.url} alt={attachment.name} className="h-full w-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Eye className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        ) : attachment.type === "link" ? (
                          <div className="h-12 w-12 rounded border bg-background flex items-center justify-center">
                            <Link2 className="h-5 w-5 text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="h-12 w-12 rounded border bg-background flex items-center justify-center">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.name}</p>
                          <div className="flex items-center gap-2">
                            <a
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline truncate flex items-center gap-1"
                            >
                              {attachment.type === "link" ? "Abrir link" : "Ver original"}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
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

      {/* Visualizador de Imagem em Tela Cheia */}
      <Dialog open={!!selectedImageUrl} onOpenChange={(open) => !open && setSelectedImageUrl(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center">
          {selectedImageUrl && (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <img 
                src={selectedImageUrl} 
                alt="Visualização" 
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" 
              />
              <Button 
                variant="secondary" 
                size="icon" 
                className="absolute top-6 right-6 rounded-full shadow-md"
                onClick={() => setSelectedImageUrl(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};