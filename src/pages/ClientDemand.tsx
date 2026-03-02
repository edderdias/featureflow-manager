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
import { v4 as uuidv4 } from 'uuid';

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
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cnpjIsValid, setCnpjIsValid] = useState<boolean | null>(null);
  const [isCnpjValidating, setIsCnpjValidating] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFileToUpload(event.target.files[0]);
    } else {
      setFileToUpload(null);
    }
  };

  const uploadFile = async (file: File): Promise<Attachment | null> => {
    try {
      const fileExtension = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const filePath = `public/${fileName}`;

      const { error } = await supabase.storage
        .from('client-attachments')
        .upload(filePath, file);

      if (error) throw error;

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
      toast.error(`Erro no upload: ${error.message}`);
      return null;
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments?.filter((att) => att.id !== id),
    }));
  };

  const validateCnpj = async (cnpj: string) => {
    const cleanedCnpj = cnpj.replace(/[^\d]/g, '');
    if (cleanedCnpj.length !== 14) {
      setCnpjIsValid(null);
      return;
    }

    setIsCnpjValidating(true);
    try {
      const apiUrl = `https://api.toqweb.com.br:2004/auth/LoginService/LoginCnpj?Cnpj=${cleanedCnpj}&sKey=ybHF9drnd%26FK%26UA$t*XSDu%23mfehqfg`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      const isValid = Object.keys(data).length > 0;
      setCnpjIsValid(isValid);
    } catch (error) {
      console.error("Error validating CNPJ:", error);
      setCnpjIsValid(false);
    } finally {
      setIsCnpjValidating(false);
    }
  };

  const debouncedValidateCnpj = useCallback(debounce(validateCnpj, 800), []);

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, 14);
    setFormData({ ...formData, client_cnpj: value });
    debouncedValidateCnpj(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.title || !formData.description || !formData.system || !formData.client_cnpj || !formData.client_email) {
      toast.error("Preencha todos os campos obrigatórios.");
      setIsSubmitting(false);
      return;
    }

    if (cnpjIsValid === false) {
      toast.error("CNPJ inválido.");
      setIsSubmitting(false);
      return;
    }

    let attachments = [...(formData.attachments || [])];
    if (fileToUpload) {
      const uploaded = await uploadFile(fileToUpload);
      if (uploaded) attachments.push(uploaded);
    }

    const { error } = await supabase
      .from("demands")
      .insert([
        {
          title: formData.title,
          description: formData.description,
          type: formData.type,
          priority: formData.priority,
          status: formData.status,
          system: formData.system,
          responsible: formData.responsible,
          client_cnpj: formData.client_cnpj,
          client_email: formData.client_email,
          client_name: formData.client_name,
          attachments: attachments,
          creator_name: formData.client_name,
          creator_email: formData.client_email,
        },
      ]);
    
    if (error) {
      toast.error(`Erro ao enviar: ${error.message}`);
    } else {
      toast.success("Demanda enviada com sucesso!");
      navigate("/");
    }
    setIsSubmitting(false);
  };

  const systemOptions: SystemType[] = ["toqweb", "gmax", "toqblend", "t5", "t10", "ecopdv", "toqped", "toqvenda"];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Abrir Demanda de Cliente</CardTitle>
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
                  placeholder="Nome da empresa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_cnpj">CNPJ *</Label>
                <div className="relative">
                  <Input
                    id="client_cnpj"
                    value={formData.client_cnpj || ""}
                    onChange={handleCnpjChange}
                    placeholder="Apenas números"
                    required
                    maxLength={14}
                    className={cn(cnpjIsValid === true && "border-green-500", cnpjIsValid === false && "border-red-500")}
                  />
                  {isCnpjValidating && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_email">E-mail de Contato *</Label>
              <Input
                id="client_email"
                type="email"
                value={formData.client_email || ""}
                onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                placeholder="seu@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={5}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="system">Sistema *</Label>
              <Select
                value={formData.system}
                onValueChange={(value) => setFormData({ ...formData, system: value as SystemType })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {systemOptions.map((system) => (
                    <SelectItem key={system} value={system}>{system.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachments">Anexo</Label>
              <Input id="attachments" type="file" onChange={handleFileChange} />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting || isCnpjValidating || cnpjIsValid === false}>
              {isSubmitting ? "Enviando..." : "Enviar Demanda"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDemand;