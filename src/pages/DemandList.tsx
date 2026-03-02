import React, { useState, Suspense, useMemo } from "react";
import { DemandCard } from "@/components/DemandCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, LayoutGrid, Table2, Calendar as CalendarIcon, GanttChartSquare, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DemandPriority, DemandStatus, DemandType, Demand } from "@/types/demand";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { statusLabels, getPriorityColor, getTypeColor, priorityLabels, typeLabels, getStatusColor } from "@/lib/demandUtils";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { DemandFilters } from "@/components/DemandFilters";

const DemandDialog = React.lazy(() => import("@/components/DemandDialog").then(m => ({ default: m.DemandDialog })));

const DemandList = () => {
  const queryClient = useQueryClient();
  const { user, userRole } = useAuth();

  const [currentView, setCurrentView] = useState<"grid" | "table" | "calendar" | "gantt">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStack, setFilterStack] = useState<string>("all");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [filterResponsible, setFilterResponsible] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [dueDateRange, setDueDateRange] = useState<DateRange | undefined>(undefined);

  const [editingDemand, setEditingDemand] = useState<Demand | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [calendarCurrentDate, setCalendarCurrentDate] = useState(new Date());

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
      completedAt: d.completed_at ? new Date(d.completed_at) : undefined,
      storyPoints: d.story_points,
      creatorName: d.creator_name,
      creatorEmail: d.creator_email,
    })) as Demand[];
  };

  const { data: demands, isLoading } = useQuery<Demand[], Error>({
    queryKey: ["demands", user?.id, userRole],
    queryFn: fetchDemands,
    enabled: !!user,
  });

  const { data: tags } = useQuery({
    queryKey: ["tags", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tags").select("name");
      if (error) throw error;
      return data.map(t => t.name);
    },
    enabled: !!user,
  });

  const availableResponsibles = useMemo(() => {
    if (!demands) return [];
    const responsibles = demands.map(d => d.responsible).filter(Boolean);
    return Array.from(new Set(responsibles));
  }, [demands]);

  const saveDemandMutation = useMutation({
    mutationFn: async (demandData: Partial<Demand>) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { id, dueDate, createdAt, updatedAt, completedAt, storyPoints, creatorName, creatorEmail, ...rest } = demandData;
      const payload = {
        ...rest,
        updated_at: new Date().toISOString(),
        due_date: dueDate ? (dueDate instanceof Date ? dueDate.toISOString() : dueDate) : null,
        completed_at: completedAt ? (completedAt instanceof Date ? completedAt.toISOString() : completedAt) : null,
        story_points: storyPoints,
        creator_name: creatorName,
        creator_email: creatorEmail,
      };
      if (id) {
        const { error } = await supabase.from("demands").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("demands").insert({ ...payload, user_id: user.id, created_at: new Date().toISOString() });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demands"] });
      toast.success("Demanda salva!");
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });

  const deleteDemandMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("demands").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demands"] });
      toast.success("Demanda excluída!");
    },
  });

  const completeDemandMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("demands").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demands"] });
      toast.success("Demanda concluída!");
    },
  });

  const filteredDemands = useMemo(() => {
    return (demands || []).filter((demand) => {
      const matchesSearch = demand.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           demand.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPriority = filterPriority === "all" || demand.priority === filterPriority;
      const matchesStatus = filterStatus === "all" || demand.status === filterStatus;
      const matchesType = filterType === "all" || demand.type === filterType;
      const matchesStack = filterStack === "all" || demand.stack === filterStack;
      const matchesTag = filterTag === "all" || (demand.tags && demand.tags.includes(filterTag));
      const matchesResponsible = filterResponsible === "all" || demand.responsible === filterResponsible;
      
      let matchesDateRange = true;
      if (dateRange?.from && dateRange?.to) {
        matchesDateRange = isWithinInterval(demand.createdAt, { 
          start: startOfDay(dateRange.from), 
          end: endOfDay(dateRange.to) 
        });
      } else if (dateRange?.from) {
        matchesDateRange = isSameDay(demand.createdAt, dateRange.from);
      }

      let matchesDueDateRange = true;
      if (dueDateRange?.from && dueDateRange?.to) {
        if (!demand.dueDate) matchesDueDateRange = false;
        else {
          matchesDueDateRange = isWithinInterval(demand.dueDate, { 
            start: startOfDay(dueDateRange.from), 
            end: endOfDay(dueDateRange.to) 
          });
        }
      } else if (dueDateRange?.from) {
        if (!demand.dueDate) matchesDueDateRange = false;
        else matchesDueDateRange = isSameDay(demand.dueDate, dueDateRange.from);
      }

      return matchesSearch && matchesPriority && matchesStatus && matchesType && 
             matchesStack && matchesTag && matchesResponsible && 
             matchesDateRange && matchesDueDateRange;
    });
  }, [demands, searchTerm, filterPriority, filterStatus, filterType, filterStack, filterTag, filterResponsible, dateRange, dueDateRange]);

  const sortedDemands = useMemo(() => {
    return [...filteredDemands].sort((a, b) => {
      let aValue: any = (a as any)[sortField];
      let bValue: any = (b as any)[sortField];
      if (aValue instanceof Date) aValue = aValue.getTime();
      if (bValue instanceof Date) bValue = bValue.getTime();
      return sortOrder === "asc" ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
    });
  }, [filteredDemands, sortField, sortOrder]);

  const handleEdit = (demand: Demand) => {
    setEditingDemand(demand);
    setIsDialogOpen(true);
  };

  const renderCalendar = () => {
    const start = startOfWeek(startOfMonth(calendarCurrentDate));
    const end = endOfWeek(endOfMonth(calendarCurrentDate));
    const days = eachDayOfInterval({ start, end });

    return (
      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold capitalize">
            {format(calendarCurrentDate, "MMMM yyyy", { locale: ptBR })}
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCalendarCurrentDate(subMonths(calendarCurrentDate, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCalendarCurrentDate(new Date())}>Hoje</Button>
            <Button variant="outline" size="sm" onClick={() => setCalendarCurrentDate(addMonths(calendarCurrentDate, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
            <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayDemands = filteredDemands.filter(d => d.dueDate && isSameDay(d.dueDate, day));
            return (
              <div key={i} className={cn("min-h-[120px] border-b border-r p-2 transition-colors hover:bg-muted/20", !isSameMonth(day, calendarCurrentDate) && "bg-muted/10 text-muted-foreground")}>
                <div className="text-right text-xs mb-1">{format(day, "d")}</div>
                <div className="space-y-1">
                  {dayDemands.map(d => (
                    <div 
                      key={d.id} 
                      onClick={() => handleEdit(d)} 
                      className={cn(
                        "text-[10px] p-1 rounded border truncate cursor-pointer hover:brightness-90 transition-all",
                        d.type === "bug" ? "bg-destructive text-white" : d.type === "feature" ? "bg-primary text-white" : "bg-warning text-white"
                      )}
                    >
                      {d.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (isLoading) return <div className="p-8 text-center">Carregando...</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Gerenciar Demandas</h1>
            <p className="text-muted-foreground">Visualize e filtre suas demandas de forma eficiente</p>
          </div>
          <Suspense fallback={<Button size="lg" disabled>Carregando...</Button>}>
            <DemandDialog
              demand={editingDemand}
              onSave={saveDemandMutation.mutate}
              open={isDialogOpen}
              onOpenChange={setIsDialogOpen}
              trigger={
                <Button size="lg" className="gap-2" onClick={() => { setEditingDemand(undefined); setIsDialogOpen(true); }}>
                  <Plus className="h-5 w-5" /> Nova Demanda
                </Button>
              }
            />
          </Suspense>
        </div>

        <div className="mb-6">
          <DemandFilters 
            searchTerm={searchTerm} setSearchTerm={setSearchTerm}
            filterPriority={filterPriority} setFilterPriority={setFilterPriority}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            filterType={filterType} setFilterType={setFilterType}
            filterStack={filterStack} setFilterStack={setFilterStack}
            filterTag={filterTag} setFilterTag={setFilterTag}
            filterResponsible={filterResponsible} setFilterResponsible={setFilterResponsible}
            dateRange={dateRange} setDateRange={setDateRange}
            dueDateRange={dueDateRange} setDueDateRange={setDueDateRange}
            availableTags={tags || []}
            availableResponsibles={availableResponsibles}
          />
        </div>

        <div className="mb-6">
          <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto">
              <TabsTrigger value="grid" className="gap-2"><LayoutGrid className="h-4 w-4" /><span className="hidden sm:inline">Cards</span></TabsTrigger>
              <TabsTrigger value="table" className="gap-2"><Table2 className="h-4 w-4" /><span className="hidden sm:inline">Tabela</span></TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2"><CalendarIcon className="h-4 w-4" /><span className="hidden sm:inline">Calendário</span></TabsTrigger>
              <TabsTrigger value="gantt" className="gap-2"><GanttChartSquare className="h-4 w-4" /><span className="hidden sm:inline">Gantt</span></TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {currentView === "grid" && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedDemands.map((demand) => (
              <DemandCard 
                key={demand.id} 
                demand={demand} 
                onEdit={handleEdit} 
                onDelete={deleteDemandMutation.mutate}
                onComplete={completeDemandMutation.mutate}
              />
            ))}
          </div>
        )}

        {currentView === "table" && (
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => { setSortField("title"); setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }} className="cursor-pointer">Título <ArrowUpDown className="inline h-4 w-4" /></TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stack</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead onClick={() => { setSortField("createdAt"); setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }} className="cursor-pointer">Criado em <ArrowUpDown className="inline h-4 w-4" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDemands.map((demand) => (
                  <TableRow key={demand.id} onDoubleClick={() => handleEdit(demand)} className="cursor-pointer">
                    <TableCell className="font-medium">{demand.title}</TableCell>
                    <TableCell><Badge variant={getTypeColor(demand.type) as any}>{typeLabels[demand.type]}</Badge></TableCell>
                    <TableCell><Badge variant={getPriorityColor(demand.priority) as any}>{priorityLabels[demand.priority]}</Badge></TableCell>
                    <TableCell><Badge variant={getStatusColor(demand.status) as any}>{statusLabels[demand.status]}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{(demand.stack || "none").toUpperCase()}</Badge></TableCell>
                    <TableCell>{demand.responsible}</TableCell>
                    <TableCell>{format(demand.createdAt, "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {currentView === "calendar" && renderCalendar()}
        {currentView === "gantt" && (
          <div className="bg-card rounded-lg border shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Demanda</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead className="min-w-[400px]">Cronograma</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDemands.map(d => (
                  <TableRow key={d.id} onDoubleClick={() => handleEdit(d)} className="cursor-pointer">
                    <TableCell className="font-medium truncate max-w-[250px]">{d.title}</TableCell>
                    <TableCell><Badge variant={getStatusColor(d.status) as any}>{statusLabels[d.status]}</Badge></TableCell>
                    <TableCell className="text-xs">{d.dueDate ? format(d.dueDate, "dd/MM/yy") : "S/P"}</TableCell>
                    <TableCell>
                      <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                        <div className="absolute h-full bg-primary opacity-50" style={{ left: '10%', width: '60%' }} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DemandList;