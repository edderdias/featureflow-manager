import React, { useState, Suspense } from "react";
import { Demand } from "@/types/demand";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { statusLabels, getPriorityColor, getTypeColor, priorityLabels, typeLabels } from "@/lib/demandUtils";
import { User, Calendar, CheckSquare, Paperclip, Target } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const DemandDialog = React.lazy(() => import("@/components/DemandDialog").then(m => ({ default: m.DemandDialog })));

interface StackColumnProps {
  title: string;
  demands: Demand[];
  onEdit: (demand: Demand) => void;
}

const StackCard = ({ demand, onEdit }: { demand: Demand; onEdit: (d: Demand) => void }) => {
  const completedItems = demand.checklist?.filter((item) => item.completed).length || 0;
  const totalItems = demand.checklist?.length || 0;
  const checklistProgress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  return (
    <Card
      onDoubleClick={() => onEdit(demand)}
      className="hover:shadow-lg transition-all duration-300 group mb-3 cursor-pointer"
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base leading-tight group-hover:text-primary transition-colors">
          {demand.title}
        </CardTitle>
        <div className="flex gap-2 pt-2">
          <Badge variant={getPriorityColor(demand.priority) as any} className="text-xs">
            {priorityLabels[demand.priority]}
          </Badge>
          <Badge variant={getTypeColor(demand.type) as any} className="text-xs">
            {typeLabels[demand.type]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{demand.description}</p>
        {demand.checklist && demand.checklist.length > 0 && (
          <div className="space-y-1">
            <Progress value={checklistProgress} className="h-1" />
          </div>
        )}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{demand.responsible}</span>
          </div>
          {demand.dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{format(demand.dueDate, "dd/MM", { locale: ptBR })}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between pt-1">
          <Badge variant="outline" className="text-xs font-mono">
            {(demand.system || "N/A").toUpperCase()}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {(demand.stack || "none").toUpperCase()}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

const StackColumn = ({ title, demands, onEdit }: StackColumnProps) => {
  return (
    <div className="flex flex-col bg-muted/30 p-4 rounded-lg shadow-sm min-h-[200px]">
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-1">{title}</h2>
        <p className="text-sm text-muted-foreground">
          {demands.length} {demands.length === 1 ? "demanda" : "demandas"}
        </p>
      </div>
      <div className="space-y-3 flex-1">
        {demands.map((demand) => (
          <StackCard key={demand.id} demand={demand} onEdit={onEdit} />
        ))}
        {demands.length === 0 && (
          <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg border-border text-muted-foreground text-sm">
            Nenhuma demanda
          </div>
        )}
      </div>
    </div>
  );
};

const StackBoard = () => {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDemand, setEditingDemand] = useState<Demand | undefined>(undefined);

  const fetchDemands = async () => {
    if (!user) return [];
    let query = supabase.from("demands").select("*");
    if (userRole === "user") {
      query = query.eq("user_id", user.id);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data.map((d: any) => ({
      ...d,
      createdAt: new Date(d.created_at),
      updatedAt: new Date(d.updated_at),
      dueDate: d.due_date ? new Date(d.due_date) : undefined,
      completedAt: d.completed_at ? new Date(d.completed_at) : undefined,
    })) as Demand[];
  };

  const { data: demands, isLoading } = useQuery<Demand[]>({
    queryKey: ["demands", user?.id, userRole],
    queryFn: fetchDemands,
    enabled: !!user,
  });

  const updateDemandMutation = useMutation({
    mutationFn: async (updatedData: Partial<Demand>) => {
      const { data, error } = await supabase
        .from("demands")
        .update({ ...updatedData, updated_at: new Date().toISOString() })
        .eq("id", updatedData.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demands"] });
      toast.success("Demanda atualizada!");
      setIsDialogOpen(false);
    },
  });

  const handleEdit = (demand: Demand) => {
    setEditingDemand(demand);
    setIsDialogOpen(true);
  };

  if (isLoading) return <div className="p-8 text-center">Carregando...</div>;

  const splintDemands = (demands || []).filter(d => d.status === "todo");
  const backendDemands = (demands || []).filter(d => (d.status === "in-progress" || d.status === "testing") && d.stack === "backend");
  const frontendDemands = (demands || []).filter(d => (d.status === "in-progress" || d.status === "testing") && d.stack === "frontend");
  const appsDemands = (demands || []).filter(d => (d.status === "in-progress" || d.status === "testing") && d.stack === "apps");
  const doneDemands = (demands || []).filter(d => d.status === "done");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Lista por Stacks</h1>
          <p className="text-muted-foreground">Visualização organizada por tecnologia e fluxo</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <StackColumn title="Splint" demands={splintDemands} onEdit={handleEdit} />
          <StackColumn title="BackEnd" demands={backendDemands} onEdit={handleEdit} />
          <StackColumn title="FrontEnd" demands={frontendDemands} onEdit={handleEdit} />
          <StackColumn title="Apps" demands={appsDemands} onEdit={handleEdit} />
          <StackColumn title="Concluído" demands={doneDemands} onEdit={handleEdit} />
        </div>

        {editingDemand && (
          <Suspense fallback={null}>
            <DemandDialog
              demand={editingDemand}
              onSave={(data) => updateDemandMutation.mutate({ ...data, id: editingDemand.id })}
              open={isDialogOpen}
              onOpenChange={setIsDialogOpen}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
};

export default StackBoard;