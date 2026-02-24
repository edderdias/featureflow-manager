import React, { useState, Suspense } from "react";
import { DemandStatus, Demand } from "@/types/demand";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { statusLabels, getPriorityColor, getTypeColor, priorityLabels, typeLabels } from "@/lib/demandUtils";
import { User, Calendar, CheckSquare, Paperclip, Target, Plus, Search } from "lucide-react";
import { format, isWithinInterval, startOfDay, endOfDay, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DateRange } from "react-day-picker";

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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: demand.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 100 : 'auto', opacity: isDragging ? 0.5 : 1 };
  const completedItems = demand.checklist?.filter((item) => item.completed).length || 0;
  const totalItems = demand.checklist?.length || 0;
  const checklistProgress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card onDoubleClick={() => onEdit(demand)} className="cursor-grab hover:shadow-lg transition-all duration-300 group mb-3 overflow-hidden">
        {demand.tags && demand.tags.length > 0 && (
          <div className="px-3 pt-2 pb-0"><div className="flex flex-wrap gap-1">{demand.tags.slice(0, 2).map((tag) => <Badge key={tag} variant="outline" className="text-[9px] h-4 px-1 truncate max-w-[80px]">{tag}</Badge>)}</div></div>
        )}
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2 break-words">{demand.title}</CardTitle>
          <div className="flex flex-wrap gap-1 pt-1">
            <Badge variant={getPriorityColor(demand.priority) as any} className="text-[9px] h-4 px-1">{priorityLabels[demand.priority]}</Badge>
            <Badge variant={getTypeColor(demand.type) as any} className="text-[9px] h-4 px-1">{typeLabels[demand.type]}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          <p className="text-xs text-muted-foreground line-clamp-2 break-words">{demand.description}</p>
          {demand.checklist && demand.checklist.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[9px] text-muted-foreground"><span className="flex items-center gap-1"><CheckSquare className="h-2.5 w-2.5" /> {completedItems}/{totalItems}</span><span>{Math.round(checklistProgress)}%</span></div>
              <Progress value={checklistProgress} className="h-1" />
            </div>
          )}
          <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1 truncate max-w-[100px]"><User className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{demand.responsible}</span></div>
            {demand.dueDate && <div className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5 shrink-0" /><span>{format(demand.dueDate, "dd/MM", { locale: ptBR })}</span></div>}
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-border/50">
            <Badge variant="outline" className="text-[9px] font-mono h-4 px-1">{(demand.system || "N/A").toUpperCase()}</Badge>
            <div className="flex items-center gap-2">
              {demand.storyPoints && demand.storyPoints > 0 && <span className="text-[9px] font-medium text-muted-foreground">{demand.storyPoints} pts</span>}
              {demand.attachments && demand.attachments.length > 0 && <Paperclip className="h-2.5 w-2.5 text-muted-foreground" />}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const KanbanColumn = ({ id, title, demands, totalDemandsCount, onEdit, showLoadMore, onLoadMore }: any) => {
  const { setNodeRef } = useDroppable({ id });
  const { active } = useDndContext();
  const isDraggingOver = active && active.id !== id;
  
  return (
    <div ref={setNodeRef} className={cn("flex flex-col bg-muted/30 p-3 rounded-lg shadow-sm min-h-[200px] w-full", isDraggingOver && "border-2 border-dashed border-primary/50 bg-primary/5")}>
      <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h2><Badge variant="secondary" className="text-[10px] h-5">{totalDemandsCount}</Badge></div>
      <div className="space-y-2 flex-1">
        <SortableContext items={demands.map((d: any) => d.id)} id={id}>
          {demands.map((demand: any) => <DraggableDemandCard key={demand.id} demand={demand} onEdit={onEdit} />)}
        </SortableContext>
      </div>
      {showLoadMore && <Button variant="ghost" size="sm" className="w-full mt-2 text-[10px] h-7" onClick={onLoadMore}>Ver mais</Button>}
    </div>
  );
};

const columns: DemandStatus[] = ["todo", "in-progress", "testing", "done"];

const KanbanBoard = () => {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [activeDragId, setActiveDragId] = useState<UniqueIdentifier | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDemand, setEditingDemand] = useState<Demand | undefined>(undefined);
  const [visibleDoneDemandsCount, setVisibleDoneDemandsCount] = useState(5);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchDemands = async () => {
    if (!user) return [];
    let query = supabase.from("demands").select("*");
    if (userRole === "user") query = query.eq("user_id", user.id);
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

  const { data: demands, isLoading } = useQuery<Demand[]>({
    queryKey: ["demands", user?.id, userRole],
    queryFn: fetchDemands,
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (demandData: Partial<Demand>) => {
      const { id, ...rest } = demandData;
      const payload = { ...rest, updated_at: new Date().toISOString() };
      if (id) return supabase.from("demands").update(payload).eq("id", id);
      return supabase.from("demands").insert({ ...payload, user_id: user?.id, created_at: new Date().toISOString() });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["demands"] }); setIsDialogOpen(false); },
  });

  const handleEdit = (demand: Demand) => {
    setEditingDemand(demand);
    setIsDialogOpen(true);
  };

  const filteredDemands = (demands || []).filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase()) || d.description.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesDate = true;
    if (dateRange?.from && dateRange?.to) matchesDate = isWithinInterval(d.createdAt, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
    else if (dateRange?.from) matchesDate = isSameDay(d.createdAt, dateRange.from);
    return matchesSearch && matchesDate;
  }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const findContainer = (id: UniqueIdentifier) => {
    console.log('Id ---> ', id)
    if (columns.includes(id as DemandStatus)) {
      return id as DemandStatus;
    }
    console.log('Demands ---> ' , demands)
    const demand = demands?.find((d) => d.id === id);
    console.log('Demand --> ', demand)
    return demand ? demand.status : null;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveDragId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) {
      setActiveDragId(null);
      return;
    }

    if (activeContainer !== overContainer) {
      const newStatus = overContainer as DemandStatus;
      console.log('New Status ---> ', newStatus)
      saveMutation.mutate({ 
        id: activeId, 
        status: newStatus, 
        completed_at: newStatus === "done" ? new Date().toISOString() : null 
      });
      toast.success(`Status alterado para: ${statusLabels[newStatus]}`);
    }
    
    setActiveDragId(null);
  };

  if (isLoading) return <div className="p-8 text-center">Carregando...</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div><h1 className="text-4xl font-bold mb-2">Board Kanban</h1><p className="text-muted-foreground">Visualize e organize o fluxo de trabalho</p></div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
            <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div>
            <Suspense fallback={<Button size="lg" disabled>Carregando...</Button>}>
              <DemandDialog demand={editingDemand} onSave={saveMutation.mutate} open={isDialogOpen} onOpenChange={setIsDialogOpen} trigger={<Button size="lg" className="gap-2" onClick={() => { setEditingDemand(undefined); setIsDialogOpen(true); }}><Plus className="h-5 w-5" /> Nova Demanda</Button>} />
            </Suspense>
          </div>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => setActiveDragId(e.active.id)} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {columns.map((status) => {
              const colDemands = filteredDemands.filter(d => d.status === status);
              const display = status === "done" ? colDemands.slice(0, visibleDoneDemandsCount) : colDemands;
              return <KanbanColumn key={status} id={status} title={statusLabels[status]} demands={display} totalDemandsCount={colDemands.length} onEdit={handleEdit} showLoadMore={status === "done" && colDemands.length > visibleDoneDemandsCount} onLoadMore={() => setVisibleDoneDemandsCount(v => v + 5)} />;
            })}
          </div>
          <DragOverlay>{activeDragId ? <div className="w-[280px]"><DraggableDemandCard demand={demands!.find(d => d.id === activeDragId)!} onEdit={handleEdit} /></div> : null}</DragOverlay>
        </DndContext>
      </div>
    </div>
  );
};

export default KanbanBoard;