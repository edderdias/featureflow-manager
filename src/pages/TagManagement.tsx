import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Tag {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

const TagManagement = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [newTagName, setNewTagName] = useState("");

  const fetchTags = async () => {
    if (!user) return [];
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .eq("user_id", user.id);
    if (error) throw error;
    return data as Tag[];
  };

  const { data: tags, isLoading, error } = useQuery<Tag[], Error>({
    queryKey: ["tags", user?.id],
    queryFn: fetchTags,
    enabled: !!user,
  });

  const addTagMutation = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success("Tag adicionada com sucesso!");
      setNewTagName("");
    },
    onError: (err) => {
      toast.error(`Erro ao adicionar tag: ${err.message}`);
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { error } = await supabase
        .from("tags")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success("Tag excluída com sucesso!");
    },
    onError: (err) => {
      toast.error(`Erro ao excluir tag: ${err.message}`);
    },
  });

  const handleAddTag = () => {
    if (newTagName.trim()) {
      addTagMutation.mutate(newTagName.trim());
    }
  };

  const handleDeleteTag = (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta tag?")) {
      deleteTagMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-muted-foreground">Carregando tags...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-destructive">Erro ao carregar tags: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Gerenciar Tags</h1>
          <p className="text-muted-foreground">
            Adicione, edite ou remova tags para organizar suas demandas
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Adicionar Nova Tag</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Nome da tag (ex: Urgente, Frontend)"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
              />
              <Button onClick={handleAddTag}>
                <Plus className="h-4 w-4 mr-2" /> Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tags Existentes</CardTitle>
          </CardHeader>
          <CardContent>
            {tags && tags.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome da Tag</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tags.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell className="font-medium">{tag.name}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteTag(tag.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-4">Nenhuma tag cadastrada ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TagManagement;