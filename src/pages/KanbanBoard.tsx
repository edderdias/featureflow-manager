import { useState } from "react";
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
import { toast } from "sonner"; // Import toast for notifications
import { DemandDialog } from "@/components/DemandDialog"; // Importar DemandDialog
import { cn } from "@/lib/utils"; // Importar cn para classes condicionais

// DND imports
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
  useDndContext, // Importar useDndContext
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Component for a draggable DemandCard
interface DraggableDemandCardProps {
  demand: Demand;
  onEdit: (demand: Demand) => void; // Adicionado prop onEdit
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

  const handleClick = (e: React.MouseEvent) => {
    // Previne que o clique seja tratado como início de arrasto se o drag não estiver ativo
    if (!isDragging) {
      onEdit(demand);
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners} // Listeners para arrastar
      onClick={handleClick} // Handler para clique simples
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
            {demand.system.toUpperCase()}
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

// Component for a droppable Kanban column
interface KanbanColumnProps {
  id: DemandStatus;
  title: string;
  demands: Demand[];
  onEdit: (demand: Demand) => void; // Adicionado prop onEdit
}

const KanbanColumn = ({ id, title, demands, onEdit }: KanbanColumnProps) => {
  const { setNodeRef } = useDroppable({ id });
  const { active } = useDndContext(); // Hook para verificar se há um item sendo arrastado
  const isDraggingOver = active && active.id !== id; // Verifica se um item está sendo arrastado e não é a própria coluna

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col bg-muted/30 p-4 rounded-lg shadow-sm min-h-[200px]",
        isDraggingOver && "border-2 border-dashed border-primary-foreground/50 bg-primary/10" // Estilo visual quando arrastando sobre a coluna
      )}
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-1">{title}</h2>
        <p className="text-sm text-muted-foreground">
          {demands.length} {demands.length === 1 ? "demanda" : "demandas"}
        </p>
      </div>

      <div className="space-y-3 flex-1">
        <SortableContext items={demands.map(d => d.id)} id={id}> {/* Explicitamente definindo o id aqui */}
          {demands.map((demand) => (
            <DraggableDemandCard key={demand.id} demand={demand} onEdit={onEdit} />
          ))}
        </SortableContext>

        {demands.length === 0 && (
          <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg border-border text-muted-foreground text-sm">
            Nenhuma demanda
          </div>
        )}
      </div>
    </div>
  );
};


const columns: DemandStatus[] = ["todo", "in-progress", "testing", "done"];

const KanbanBoard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeDragId, setActiveDragId] = useState<UniqueIdentifier | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false); // Estado para o diálogo de edição
  const [editingDemand, setEditingDemand] = useState<Demand | undefined>(undefined); // Estado para a demanda sendo editada

  const fetchDemands = async () => {
    if (!user) return [];
    const { data, error } = await supabase
      .from("demands")
      .select("*");
    if (error) throw error;
    return data.map((d: any) => ({
      ...d,
      createdAt: new Date(d.created_at),
      updatedAt: new Date(d.updated_at),
      dueDate: d.due_date ? new Date(d.due_date) : undefined,
      storyPoints: d.story_points,
      completedAt: d.completed_at ? new Date(d.completed_at) : undefined,
      creatorName: d.creator_name,
    })) as Demand[];
  };

  const { data: demands, isLoading, error } = useQuery<Demand[], Error>({
    queryKey: ["demands", user?.id],
    queryFn: fetchDemands,
    enabled: !!user,
  });

  const updateDemandMutation = useMutation({
    mutationFn: async (updatedDemandData: Partial<Demand>) => {
      console.log("Received updatedDemandData in mutation:", updatedDemandData);
      console.log("Status received in mutation:", updatedDemandData.status);

      if (!user) throw new Error("Usuário não autenticado");
      if (!updatedDemandData.id) throw new Error("Demand ID is required for update.");
      if (!updatedDemandData.status) throw new Error("Demand status cannot be empty."); // Ensure status is always present

      const payload = {
        title: updatedDemandData.title ?? null,
        description: updatedDemandData.description ?? null,
        type: updatedDemandData.type ?? null,
        priority: updatedDemandData.priority ?? null,
        status: updatedDemandData.status, // This is the critical field, must be present
        system: updatedDemandData.system ?? null,
        responsible: updatedDemandData.responsible ?? null,
        due_date: updatedDemandData.dueDate ? updatedDemandData.dueDate.toISOString() : null,
        completed_at: updatedDemandData.completedAt ? updatedDemandData.completedAt.toISOString() : null,
        story_points: updatedDemandData.storyPoints ?? null,
        sprint: updatedDemandData.sprint ?? null,
        checklist: updatedDemandData.checklist ?? [], // Ensure it's an array, not null
        attachments: updatedDemandData.attachments ?? [], // Ensure it's an array, not null
        tags: updatedDemandData.tags ?? [], // Ensure it's an array, not null
        client_cnpj: updatedDemandData.client_cnpj ?? null,
        client_email: updatedDemandData.client_email ?? null,
        client_name: updatedDemandData.client_name ?? null,
        creator_name: updatedDemandData.creatorName ?? null,
        updated_at: new Date().toISOString(), // Always update updatedAt
      };

      console.log("Payload being sent to Supabase:", payload); // Log para depuração

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
    onError: (err) => {
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
        delay: 250, // Ativa o arrasto após 250ms de clique e segurar
        tolerance: 5, // Ou após mover 5px
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

    // Check if the drop target is a column itself (droppable area)
    if (columns.includes(over.id as DemandStatus)) {
      newStatus = over.id as DemandStatus;
      console.log("Dropped directly onto column (empty area or between items):", newStatus);
    } else if (over.data.current?.sortable?.containerId) {
      // If dropped onto a sortable item, get the ID of its parent container (the column)
      newStatus = over.data.current.sortable.containerId as DemandStatus;
      console.log("Dropped onto sortable item, parent column:", newStatus);
    } else {
      console.error("Could not determine new status for the demand. over.id:", over.id, "over.data.current:", over.data.current);
      setActiveDragId(null);
      return;
    }

    console.log("Dragged Demand ID:", draggedDemandId);
    console.log("Determined New Status:", newStatus);

    const draggedDemand = demands?.find(d => d.id === draggedDemandId);

    if (draggedDemand && draggedDemand.status !== newStatus) {
      console.log("Original Demand Status:", draggedDemand.status);

      // Optimistic update
      queryClient.setQueryData(["demands", user?.id], (oldDemands: Demand[] | undefined) => {
        if (!oldDemands) return [];
        return oldDemands.map(d =>
          d.id === draggedDemandId ? { ...d, status: newStatus } : d
        );
      });

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

      console.log("Constructed updatedDemand object sent to mutate:", updatedDemand);
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
            {columns.map((status) => (
              <KanbanColumn
                key={status}
                id={status}
                title={statusLabels[status]}
                demands={getDemandsByStatus(status)}
                onEdit={handleEditDemand} // Passar onEdit para a coluna
              />
            ))}
          </div>

          <DragOverlay>
            {activeDemand ? (
              <DraggableDemandCard demand={activeDemand} onEdit={handleEditDemand} />
            ) : null}
          </DragOverlay>
        </DndContext>

        {editingDemand && (
          <DemandDialog
            demand={editingDemand}
            onSave={handleSaveDemand}
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
          />
        )}
      </div>
    </div>
  );
};

export default KanbanBoard;