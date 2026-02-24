import React, { useState, Suspense } from "react";
import { DemandCard } from "@/components/DemandCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, LayoutGrid, Table2, Calendar as CalendarIcon, GanttChartSquare, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
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
import { DateRangePicker } from "@/components/DateRangePicker";
import { DateRange } from "react-day-picker";

const DemandDialog = React.lazy(() => import("@/components/DemandDialog").then(m => ({ default: m.DemandDialog })));

const DemandList = () => {
  const queryClient = useQueryClient();
  const { user, userRole } = useAuth();

  const [currentView, setCurrentView] = useState<"grid" | "table" | "calendar" | "gantt">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [filterType, setFilterType] = useState<string>("all");
  const [editingDemand, setEditingDemand] = useState<Demand | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [calendarCurrentDate, setCalendarCurrentDate] = useState(new Date());
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

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

  const saveDemandMutation = useMutation({
    mutationFn: async (demandData: Partial<Demand>) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { id, dueDate, createdAt, updatedAt, completedAt, storyPoints, creatorName, creatorEmail, ...rest } = demandData;
      const payload = {
        ...rest,
        updated_at: new Date().toISOString(),
        due_date: dueDate ? dueDate.toISOString() : null,
        completed_at: completedAt ? completedAt.toISOString() : null,
        story_points: storyPoints,
        creator_name: creatorName,
        creator_email: creatorEmail,
      };
      if (id) {
        const { data, error } = await supabase.from("demands").update(payload).eq("id", id).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase.from("demands").insert({ ...payload, user_id: user.id, created_at: new Date().toISOString() }).select().single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demands"] });
      toast.success("Demanda salva!");
      setIsDialogOpen(false);
      setEditingDemand(undefined);
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });

  const filteredDemands = (demands || []).filter((demand) => {
    const matchesSearch = demand.title.toLowerCase().includes(searchTerm.toLowerCase()) || demand.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === "all" || demand.priority === filterPriority;
    const matchesStatus = filterStatus === "all" ? true : filterStatus === "active" ? demand.status !== "done" : demand.status === filterStatus;
    const matchesType = filterType === "all" || demand.type === filterType;
    
    let matchesDateRange = true;
    if (dateRange?.from && dateRange?.to) {
      const start = startOfDay(dateRange.from);
      const end = endOfDay(dateRange.to);
      matchesDateRange = isWithinInterval(demand.createdAt, { start, end });
    } else if (dateRange?.from) {
      matchesDateRange = isSameDay(demand.createdAt, dateRange.from);
    }

    return matchesSearch && matchesPriority && matchesStatus && matchesType && matchesDateRange;
  });

  const sortedDemands = [...filteredDemands].sort((a, b) => {
    let aValue: any = (a as any)[sortField];
    let bValue: any = (b as any)[sortField];
    if (aValue instanceof Date) aValue = aValue.getTime();
    if (bValue instanceof Date) bValue = bValue.getTime();
    return sortOrder === "asc" ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
  });

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
                    <div key={d.id} onClick={() => { setEditingDemand(d); setIsDialogOpen(true); }} className="text-[10px] p-1 rounded bg-primary/10 text-primary truncate cursor-pointer hover:bg-primary/20">
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

  const renderGantt = () => {
    return (
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
              <TableRow key={d.id} onDoubleClick={() => { setEditingDemand(d); setIsDialogOpen(true); }} className="cursor-pointer">
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
    );
  };

  if (isLoading) return <div className="p-8 text-center">Carregando...</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Gerenciar Demandas</h1>
            <p className="text-muted-foreground">Visualize suas demandas de diferentes formas</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="active">Demandas Ativas</SelectItem>
                <SelectItem value="todo">A Fazer</SelectItem>
                <SelectItem value="in-progress">Em Andamento</SelectItem>
                <SelectItem value="testing">Em Teste</SelectItem>
                <SelectItem value="done">Concluído</SelectItem>
              </SelectContent>
            </Select>
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

        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar demandas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger><SelectValue placeholder="Prioridade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Prioridades</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="feature">Novo Recurso</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="repair">Reparo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {currentView === "grid" && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedDemands.map((demand) => (
              <DemandCard key={demand.id} demand={demand} onEdit={setEditingDemand} />
            ))}
          </div>
        )}

        {currentView === "table" && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => { setSortField("title"); setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }} className="cursor-pointer">Título <ArrowUpDown className="inline h-4 w-4" /></TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sistema</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead onClick={() => { setSortField("createdAt"); setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }} className="cursor-pointer">Criado em <ArrowUpDown className="inline h-4 w-4" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDemands.map((demand) => (
                  <TableRow key={demand.id} onDoubleClick={() => { setEditingDemand(demand); setIsDialogOpen(true); }} className="cursor-pointer">
                    <TableCell className="font-medium">{demand.title}</TableCell>
                    <TableCell><Badge variant={getTypeColor(demand.type) as any}>{typeLabels[demand.type]}</Badge></TableCell>
                    <TableCell><Badge variant={getPriorityColor(demand.priority) as any}>{priorityLabels[demand.priority]}</Badge></TableCell>
                    <TableCell><Badge variant={getStatusColor(demand.status) as any}>{statusLabels[demand.status]}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{demand.system.toUpperCase()}</Badge></TableCell>
                    <TableCell>{demand.responsible}</TableCell>
                    <TableCell>{format(demand.createdAt, "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {currentView === "calendar" && renderCalendar()}
        {currentView === "gantt" && renderGantt()}
      </div>
    </div>
  );
};

export default DemandList;