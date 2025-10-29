import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Upload, FileText, X, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Demand, SystemType, Attachment } from "@/types/demand";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid'; // For unique file names

// Função de debounce para limitar chamadas à API
const debounce = (func: (...args: any[]) => void, delay: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

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
  const [cnpjIsValid, setCnpjIsValid] = useState<boolean | null>(null); // null: not checked, true: valid, false: invalid
  const [isCnpjValidating, setIsCnpjValidating] = useState(false);

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

  const validateCnpj = async (cnpj: string) => {
    const cleanedCnpj = cnpj.replace(/[^\d]/g, ''); // Remove non-digits
    if (cleanedCnpj.length !== 14) { // CNPJ must have 14 digits
      setCnpjIsValid(null); // Reset validation state if not a full CNPJ
      return;
    }

    setIsCnpjValidating(true);
    setCnpjIsValid(null); // Reset before new validation

    try {
      const apiUrl = `https://api.toqweb.com.br:2004/auth/LoginService/LoginCnpj?Cnpj=${cleanedCnpj}&sKey=ybHF9drnd%26FK%26UA$t*XSDu%23mfehqfg`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }

      const data = await response.json();
      // Correção: CNPJ é válido se o objeto retornado não for vazio
      const isValid = Object.keys(data).length > 0;

      setCnpjIsValid(isValid);
      if (!isValid) {
        toast.error("CNPJ não cadastrado na nossa base de dados.");
      } else {
        toast.success("CNPJ validado com sucesso!");
      }
    } catch (error) {
      console.error("Error validating CNPJ:", error);
      toast.error("Erro ao validar CNPJ. Tente novamente mais tarde.");
      setCnpjIsValid(false); // Assume invalid on error
    } finally {
      setIsCnpjValidating(false);
    }
  };

  // Debounced version of validateCnpj
  const debouncedValidateCnpj = useCallback(debounce(validateCnpj, 800), []);

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Limita o valor a 14 caracteres antes de atualizar o estado
    const limitedValue = value.slice(0, 14); 
    setFormData({ ...formData, client_cnpj: limitedValue });
    debouncedValidateCnpj(limitedValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.title || !formData.description || !formData.system || !formData.client_cnpj || !formData.client_email) {
      toast.error("Por favor, preencha todos os campos obrigatórios (Título, Descrição, Sistema, CNPJ, E-mail).");
      setIsSubmitting(false);
      return;
    }

    // Re-validate CNPJ on submit to ensure it's current
    // Await the debounced function to ensure validation completes before proceeding
    await new Promise(resolve => {
      const checkValidation = () => {
        if (!isCnpjValidating) {
          resolve(null);
        } else {
          setTimeout(checkValidation, 100);
        }
      };
      checkValidation();
    });

    if (!cnpjIsValid) {
      toast.error("Por favor, corrija o CNPJ antes de enviar a demanda.");
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
      creatorName: formData.client_name || null, // Popula creatorName com client_name, ou null se vazio
      creatorEmail: formData.client_email || null, // Popula creatorEmail com client_email, ou null se vazio
      client_name: formData.client_name || null, // Garante que client_name seja null se vazio
      client_cnpj: formData.client_cnpj || null, // Garante que client_cnpj seja null se vazio (embora seja obrigatório)
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
          created_at: demandToSave.createdAt?.toISOString(),
          updated_at: demandToSave.updatedAt?.toISOString(),
          client_cnpj: demandToSave.client_cnpj,
          client_email: demandToSave.client_email ? demandToSave.client_email : demandToSave.creatorEmail,
          client_name: demandToSave.client_name,
          attachments: demandToSave.attachments,
          creator_name: demandToSave.creatorName,
          creator_email: demandToSave.creatorEmail,
        },
      ])
      .select()
      .single();
    console.log('Demanda a ser salva:', JSON.stringify(demandToSave)); // Log para depuração
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
      setCnpjIsValid(null); // Reset CNPJ validation state
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
                <div className="relative">
                  <Input
                    id="client_cnpj"
                    value={formData.client_cnpj || ""}
                    onChange={handleCnpjChange}
                    placeholder="00.000.000/0000-00"
                    required
                    maxLength={14} // Limita a 14 caracteres
                    className={
                      cnpjIsValid === true
                        ? "border-green-500 focus-visible:ring-green-500"
                        : cnpjIsValid === false
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }
                  />
                  {isCnpjValidating && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                  )}
                  {cnpjIsValid === true && !isCnpjValidating && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                  {cnpjIsValid === false && !isCnpjValidating && (
                    <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                  )}
                </div>
                {cnpjIsValid === false && (
                  <p className="text-sm text-red-500">CNPJ não cadastrado na nossa base de dados.</p>
                )}
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

            <Button type="submit" className="w-full" disabled={isSubmitting || isCnpjValidating || cnpjIsValid === false}>
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