import { useState, useEffect } from "react";
import { DemandCard } from "@/components/DemandCard";
import { DemandDialog } from "@/components/DemandDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, LayoutGrid, Table2, Calendar as CalendarIcon, GanttChartSquare } from "lucide-react";
import { DemandPriority, DemandStatus, DemandType, Demand } from "@/types/demand";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { toast } from "sonner";

const DemandList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [editingDemand, setEditingDemand] = useState<Demand | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchDemands = async () => {
    if (!user) return [];
    const { data, error } = await supabase
      .from("demands")
      .select("*")
      .eq("user_id", user.id);
    if (error) throw error;
    return data.map((d: any) => ({
      ...d,
      createdAt: new Date(d.created_at),
      updatedAt: new Date(d.updated_at),
      dueDate: d.due_date ? new Date(d.due_date) : undefined,
    })) as Demand[];
  };

  const { data: demands, isLoading, error } = useQuery<Demand[], Error>({
    queryKey: ["demands", user?.id],
    queryFn: fetchDemands,
    enabled: !!user,
  });

  const addDemandMutation = useMutation({
    mutationFn: async (newDemand: Partial<Demand>) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("demands")
        .insert({
          ...newDemand,
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          due_date: newDemand.dueDate?.toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demands"] });
      toast.success("Demanda criada com sucesso!");
      setIsDialogOpen(false);
    },
    onError: (err) => {
      toast.error(`Erro ao criar demanda: ${err.message}`);
    },
  });

  const updateDemandMutation = useMutation({
    mutationFn: async (updatedDemand: Partial<Demand>) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("demands")
        .update({
          ...updatedDemand,
          updated_at: new Date().toISOString(),
          due_date: updatedDemand.dueDate?.toISOString(),
        })
        .eq("id", updatedDemand.id)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demands"] });
      toast.success("Demanda atualizada com sucesso!");
      setIsDialogOpen(false);
      setEditingDemand(undefined);
    },
    onError: (err) => {
      toast.error(`Erro ao atualizar demanda: ${err.message}`);
    },
  });

  const deleteDemandMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { error } = await supabase
        .from("demands")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demands"] });
      toast.success("Demanda excluída com sucesso!");
    },
    onError: (err) => {
      toast.error(`Erro ao excluir demanda: ${err.message}`);
    },
  });

  const handleSaveDemand = (demandData: Partial<Demand>) => {
    if (demandData.id) {
      updateDemandMutation.mutate(demandData);
    } else {
      addDemandMutation.mutate(demandData);
    }
  };

  const handleEditDemand = (demand: Demand) => {
    setEditingDemand(demand);
    setIsDialogOpen(true);
  };

  const handleDeleteDemand = (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta demanda?")) {
      deleteDemandMutation.mutate(id);
    }
  };

  const filteredDemands = (demands || []).filter((demand) => {
    const matchesSearch =
      demand.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demand.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demand.responsible.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPriority = filterPriority === "all" || demand.priority === filterPriority;
    const matchesStatus = filterStatus === "all" || demand.status === filterStatus;
    const matchesType = filterType === "all" || demand.type === filterType;

    return matchesSearch && matchesPriority && matchesStatus && matchesType;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-muted-foreground">Carregando demandas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-destructive">Erro ao carregar demandas: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Gerenciar Demandas</h1>
            <p className="text-muted-foreground">
              Visualize suas demandas de diferentes formas
            </p>
          </div>
          <DemandDialog
            demand={editingDemand}
            onSave={handleSaveDemand}
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            trigger={
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Nova Demanda
              </Button>
            }
          />
        </div>

        {/* View Selector */}
        <div className="mb-6">
          <Tabs defaultValue="grid" className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto">
              <TabsTrigger value="grid" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Cards</span>
              </TabsTrigger>
              <TabsTrigger value="table" className="gap-2" onClick={() => navigate("/table")}>
                <Table2 className="h-4 w-4" />
                <span className="hidden sm:inline">Tabela</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2" onClick={() => navigate("/calendar")}>
                <CalendarIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Calendário</span>
              </TabsTrigger>
              <TabsTrigger value="gantt" className="gap-2" onClick={() => navigate("/gantt")}>
                <GanttChartSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Gantt</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar demandas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Prioridades</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="todo">A Fazer</SelectItem>
                <SelectItem value="in-progress">Em Andamento</SelectItem>
                <SelectItem value="testing">Em Teste</SelectItem>
                <SelectItem value="done">Concluído</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="feature">Novo Recurso</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="repair">Reparo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Demands Grid */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Mostrando {filteredDemands.length} de {demands?.length || 0} demandas
          </p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDemands.map((demand) => (
            <DemandCard key={demand.id} demand={demand} onEdit={handleEditDemand} onDelete={handleDeleteDemand} />
          ))}
        </div>

        {filteredDemands.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhuma demanda encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DemandList;