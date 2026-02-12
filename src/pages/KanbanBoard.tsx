import React, { useState, Suspense } from "react";
import { DemandStatus, Demand } from "@/types/demand";
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

import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  UniqueIdentifier,
  useDroppable,
  useDndContext,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const DemandDialog = React.lazy(() => import("@/components/DemandDialog").then(m => ({ default: m.DemandDialog })));

interface DraggableDemandCardProps {
  demand: Demand;
  onEdit: (demand: Demand) => void;
}

const DraggableDemandCard = ({ demand, onEdit }: DraggableDemandCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: demand.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  const completedItems = demand.checklist?.filter((item) => item.completed).length || 0;
  const totalItems = demand.checklist?.length || 0;
  const checklistProgress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onDoubleClick={() => onEdit(demand)}
      className="cursor-grab hover:shadow-lg transition-all duration-300 group mb-3"
    >
      {demand.tags && demand.tags.length > 0 && (
        <div className="px-4 pt-3 pb-0">
          <div className="flex flex-wrap gap-1">
            {demand.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] h-5">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckSquare className="h-3 w-3" />
              <span>
                {completedItems}/{totalItems}
              </span>
            </div>
            <Progress value={checklistProgress} className="h-1" />
          </div>
        )}
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{demand.responsible}</span>
          </div>
          {demand.dueDate && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{format(demand.dueDate, "dd/MM", { locale: ptBR })}</span>
            </div>
          )}
          {demand.storyPoints && demand.storyPoints > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Target className="h-3 w-3" />
              <span>{demand.storyPoints}pts</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between pt-1">
          <Badge variant="outline" className="text-xs font-mono">
            {(demand.system || "N/A").toUpperCase()}
          </Badge>
          {demand.attachments && demand.attachments.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Paperclip className="h-3 w-3" />
              <span>{demand.attachments.length}</span>
            </div>
          )}
        </div>
        {demand.sprint && (
          <div className="pt-1 border-t">
            <Badge variant="secondary" className="text-xs">
              {demand.sprint}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface KanbanColumnProps {
  id: DemandStatus;
  title: string;
  demands: Demand[];
  totalDemandsCount: number;
  onEdit: (demand: Demand) => void;
  showLoadMore?: boolean;
  onLoadMore?: () => void;
}

const KanbanColumn = ({ id, title, demands, totalDemandsCount, onEdit, showLoadMore, onLoadMore }: KanbanColumnProps) => {
  const { setNodeRef } = useDroppable({ id });
  const { active } = useDndContext();
  const isDraggingOver = active && active.id !== id;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col bg-muted/30 p-4 rounded-lg shadow-sm min-h-[200px]",
        isDraggingOver && "border-2 border-dashed border-primary-foreground/50 bg-primary/10"
      )}
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-1">{title}</h2>
        <p className="text-sm text-muted-foreground">
          {totalDemandsCount} {totalDemandsCount === 1 ? "demanda" : "demandas"}
        </p>
      </div>
      <div className="space-y-3 flex-1">
        <SortableContext items={demands.map(d => d.id)} id={id}>
          {demands.map((demand) => (
            <DraggableDemandCard key={demand.id} demand={demand} onEdit={onEdit} />
          ))}
        </SortableContext>
        {demands.length === 0 && totalDemandsCount === 0 && (
          <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg border-border text-muted-foreground text-sm">
            Nenhuma demanda
          </div>
        )}
      </div>
      {showLoadMore && onLoadMore && (
        <Button variant="outline" className="w-full mt-4" onClick={onLoadMore}>
          Ver mais {Math.min(5, totalDemandsCount - demands.length)} demandas
        </Button>
      )}
    </div>
  );
};

const columns: DemandStatus[] = ["todo", "in-progress", "testing", "done"];

const KanbanBoard = () => {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [activeDragId, setActiveDragId] = useState<UniqueIdentifier | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDemand, setEditingDemand] = useState<Demand | undefined>(undefined);
  const [visibleDoneDemandsCount, setVisibleDoneDemandsCount] = useState(5);

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
      storyPoints: d.story_points,
      completedAt: d.completed_at ? new Date(d.completed_at) : undefined,
      creatorName: d.creator_name,
      creatorEmail: d.creator_email,
    })) as Demand[];
  };

  const { data: demands, isLoading, error } = useQuery<Demand[], Error>({
    queryKey: ["demands", user?.id, userRole],
    queryFn: fetchDemands,
    enabled: !!user,
  });

  const updateDemandMutation = useMutation({
    mutationFn: async (updatedDemandData: Partial<Demand>) => {
      if (!user) throw new Error("Usuário não autenticado");
      if (!updatedDemandData.id) throw new Error("ID da demanda é obrigatório.");

      // Mapeamento explícito para garantir que as colunas batam com o banco
      const payload: any = {
        title: updatedDemandData.title,
        description: updatedDemandData.description,
        type: updatedDemandData.type,
        priority: updatedDemandData.priority,
        status: updatedDemandData.status,
        system: updatedDemandData.system,
        stack: updatedDemandData.stack || 'none',
        responsible: updatedDemandData.responsible,
        due_date: updatedDemandData.dueDate ? updatedDemandData.dueDate.toISOString() : null,
        completed_at: updatedDemandData.completedAt ? updatedDemandData.completedAt.toISOString() : null,
        story_points: updatedDemandData.storyPoints,
        sprint: updatedDemandData.sprint,
        checklist: updatedDemandData.checklist,
        attachments: updatedDemandData.attachments,
        tags: updatedDemandData.tags,
        client_cnpj: updatedDemandData.client_cnpj,
        client_email: updatedDemandData.client_email,
        client_name: updatedDemandData.client_name,
        creator_name: updatedDemandData.creatorName,
        creator_email: updatedDemandData.creatorEmail,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("demands")
        .update(payload)
        .eq("id", updatedDemandData.id)
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
    onError: (err: any) => {
      toast.error(`Erro ao atualizar demanda: ${err.message}`);
    },
  });

  const handleEditDemand = (demand: Demand) => {
    setEditingDemand(demand);
    setIsDialogOpen(true);
  };

  const handleSaveDemand = (demandData: Partial<Demand>) => {
    updateDemandMutation.mutate(demandData);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getDemandsByStatus = (status: DemandStatus) => {
    return (demands || []).filter((d) => d.status === status);
  };

  const handleDragStart = (event: any) => {
    setActiveDragId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setActiveDragId(null);
      return;
    }
    const draggedDemandId = active.id as string;
    let newStatus: DemandStatus | undefined;
    if (columns.includes(over.id as DemandStatus)) {
      newStatus = over.id as DemandStatus;
    } else if (over.data.current?.sortable?.containerId) {
      newStatus = over.data.current.sortable.containerId as DemandStatus;
    } else {
      setActiveDragId(null);
      return;
    }
    const draggedDemand = demands?.find(d => d.id === draggedDemandId);
    if (draggedDemand && draggedDemand.status !== newStatus) {
      const updatedDemand: Partial<Demand> = {
        ...draggedDemand,
        status: newStatus,
        updatedAt: new Date(),
      };
      if (newStatus === "done" && !draggedDemand.completedAt) {
        updatedDemand.completedAt = new Date();
      } else if (newStatus !== "done" && draggedDemand.completedAt) {
        updatedDemand.completedAt = undefined;
      }
      updateDemandMutation.mutate(updatedDemand);
    }
    setActiveDragId(null);
  };

  const activeDemand = activeDragId ? demands?.find(d => d.id === activeDragId) : null;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-muted-foreground">Carregando Kanban...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-destructive">Erro ao carregar Kanban: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Board Kanban</h1>
          <p className="text-muted-foreground">
            Visualize e organize o fluxo de trabalho das demandas
          </p>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {columns.map((status) => {
              const allDemandsForStatus = getDemandsByStatus(status);
              const demandsToDisplay = status === "done"
                ? allDemandsForStatus.slice(0, visibleDoneDemandsCount)
                : allDemandsForStatus;
              const showLoadMore = status === "done" && allDemandsForStatus.length > visibleDoneDemandsCount;
              return (
                <KanbanColumn
                  key={status}
                  id={status}
                  title={statusLabels[status]}
                  demands={demandsToDisplay}
                  totalDemandsCount={allDemandsForStatus.length}
                  onEdit={handleEditDemand}
                  showLoadMore={showLoadMore}
                  onLoadMore={() => setVisibleDoneDemandsCount(prev => prev + 5)}
                />
              );
            })}
          </div>
          <DragOverlay>
            {activeDemand ? (
              <DraggableDemandCard demand={activeDemand} onEdit={handleEditDemand} />
            ) : null}
          </DragOverlay>
        </DndContext>
        {editingDemand && (
          <Suspense fallback={null}>
            <DemandDialog
              demand={editingDemand}
              onSave={handleSaveDemand}
              open={isDialogOpen}
              onOpenChange={setIsDialogOpen}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
};

export default KanbanBoard;