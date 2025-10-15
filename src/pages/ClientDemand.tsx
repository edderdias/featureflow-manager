import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Upload, FileText, X } from "lucide-react";
import { Demand, SystemType, Attachment } from "@/types/demand";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid'; // For unique file names

const ClientDemand = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Partial<Demand>>({
    title: "",
    description: "",
    type: "feature", // Default type
    priority: "medium", // Default priority
    status: "todo", // Default status
    system: undefined,
    responsible: "Cliente", // Default responsible for client demands
    client_cnpj: "",
    client_email: "",
    client_name: "",
    attachments: [],
  });
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFileToUpload(event.target.files[0]);
    } else {
      setFileToUpload(null);
    }
  };

  const uploadFile = async (file: File): Promise<Attachment | null> => {
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `public/${fileName}`; // Store in a 'public' subfolder within the bucket

    const { data, error } = await supabase.storage
      .from('client-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error("Error uploading file:", error);
      toast.error(`Erro ao fazer upload do arquivo: ${error.message}`);
      return null;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('client-attachments')
      .getPublicUrl(filePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error("Error getting public URL for file:", filePath);
      toast.error("Erro ao obter URL pública do arquivo.");
      return null;
    }

    return {
      id: uuidv4(),
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 'doc', // Basic type detection
      url: publicUrlData.publicUrl,
      uploadedAt: new Date(),
    };
  };

  const handleRemoveAttachment = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments?.filter((att) => att.id !== id),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.title || !formData.description || !formData.system || !formData.client_cnpj || !formData.client_email) {
      toast.error("Por favor, preencha todos os campos obrigatórios (Título, Descrição, Sistema, CNPJ, E-mail).");
      setIsSubmitting(false);
      return;
    }

    let uploadedAttachment: Attachment | null = null;
    if (fileToUpload) {
      uploadedAttachment = await uploadFile(fileToUpload);
      if (!uploadedAttachment) {
        setIsSubmitting(false);
        return; // Stop submission if file upload failed
      }
    }

    const demandToSave: Partial<Demand> = {
      ...formData,
      user_id: null, // Explicitly set to null for client demands
      createdAt: new Date(),
      updatedAt: new Date(),
      attachments: uploadedAttachment ? [...(formData.attachments || []), uploadedAttachment] : formData.attachments,
    };

    const { data, error } = await supabase
      .from("demands")
      .insert([
        {
          user_id: demandToSave.user_id,
          title: demandToSave.title,
          description: demandToSave.description,
          type: demandToSave.type,
          priority: demandToSave.priority,
          status: demandToSave.status,
          system: demandToSave.system,
          responsible: demandToSave.responsible,
          created_at: demandToSave.createdAt.toISOString(),
          updated_at: demandToSave.updatedAt.toISOString(),
          client_cnpj: demandToSave.client_cnpj,
          client_email: demandToSave.client_email,
          client_name: demandToSave.client_name,
          attachments: demandToSave.attachments,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error submitting demand:", error);
      toast.error(`Erro ao enviar demanda: ${error.message}`);
    } else {
      toast.success("Demanda enviada com sucesso! Entraremos em contato em breve.");
      setFormData({
        title: "",
        description: "",
        type: "feature",
        priority: "medium",
        status: "todo",
        system: undefined,
        responsible: "Cliente",
        client_cnpj: "",
        client_email: "",
        client_name: "",
        attachments: [],
      });
      setFileToUpload(null);
      navigate("/"); // Redirect to home or a confirmation page
    }
    setIsSubmitting(false);
  };

  const systemOptions: SystemType[] = ["toqweb", "gmax", "toqblend", "t5", "t10", "ecopdv", "toqped", "toqvenda"];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Abrir Demanda de Cliente</CardTitle>
          <p className="text-muted-foreground text-center">
            Preencha os campos abaixo para enviar sua solicitação.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_name">Nome do Cliente</Label>
                <Input
                  id="client_name"
                  value={formData.client_name || ""}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="Nome da sua empresa ou seu nome"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_cnpj">CNPJ *</Label>
                <Input
                  id="client_cnpj"
                  value={formData.client_cnpj || ""}
                  onChange={(e) => setFormData({ ...formData, client_cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_email">E-mail de Contato *</Label>
              <Input
                id="client_email"
                type="email"
                value={formData.client_email || ""}
                onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                placeholder="seu.email@exemplo.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Título da Demanda *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Problema ao emitir nota fiscal"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição Detalhada *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o problema ou a solicitação com o máximo de detalhes possível."
                rows={5}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="system">Sistema Afetado *</Label>
                <Select
                  value={formData.system}
                  onValueChange={(value) => setFormData({ ...formData, system: value as SystemType })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o sistema" />
                  </SelectTrigger>
                  <SelectContent>
                    {systemOptions.map((system) => (
                      <SelectItem key={system} value={system}>
                        {system.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Demanda</Label>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachments">Anexar Arquivos</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="attachments"
                  type="file"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                {fileToUpload && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFileToUpload(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {fileToUpload && (
                <p className="text-sm text-muted-foreground mt-1">Arquivo selecionado: {fileToUpload.name}</p>
              )}
              <div className="space-y-2 mt-2">
                {formData.attachments?.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-2 p-2 rounded border">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-sm font-medium text-primary hover:underline truncate"
                    >
                      {attachment.name}
                    </a>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveAttachment(attachment.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Plus className="h-4 w-4 mr-2 animate-spin" /> Enviando Demanda...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" /> Enviar Demanda
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDemand;