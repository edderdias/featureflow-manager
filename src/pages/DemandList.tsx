import { useState, useEffect } from "react";
import { DemandCard } from "@/components/DemandCard";
import { DemandDialog } from "@/components/DemandDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, LayoutGrid, Table2, Calendar as CalendarIcon, GanttChartSquare, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DemandPriority, DemandStatus, DemandType, Demand } from "@/types/demand";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { toast } from "sonner";
import { format, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isWithinInterval } from "date-fns"; // Adicionado isWithinInterval
import { ptBR } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { statusLabels, getPriorityColor, getTypeColor, priorityLabels, typeLabels, getStatusColor } from "@/lib/demandUtils";
import { DateRangePicker } from "@/components/DateRangePicker"; // Novo import
import { DateRange } from "react-day-picker"; // Novo import

const DemandList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, userRole } = useAuth(); // Obter userRole

  const [currentView, setCurrentView] = useState<"grid" | "table" | "calendar" | "gantt">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [editingDemand, setEditingDemand] = useState<Demand | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // State for Table View sorting
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // State for Calendar View
  const [calendarCurrentDate, setCalendarCurrentDate] = useState(new Date());

  // Novo estado para o intervalo de datas
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const fetchDemands = async () => {
    if (!user) return [];

    let query = supabase.from("demands").select("*");

    // Se o papel for 'user', filtra apenas as demandas criadas por ele
    if (userRole === "user") {
      query = query.eq("user_id", user.id);
    }
    // Para 'technician' e 'admin', nenhuma filtragem adicional é necessária,
    // pois as políticas RLS já permitem que vejam todas as demandas.

    const { data, error } = await query;
    
    if (error) throw error;
    return data.map((d: any) => ({
      ...d,
      createdAt: new Date(d.created_at),
      updatedAt: new Date(d.updated_at),
      dueDate: d.due_date ? new Date(d.due_date) : undefined,
      completedAt: d.completed_at ? new Date(d.completed_at) : undefined, // Mapear completed_at
      storyPoints: d.story_points,
      creatorName: d.creator_name, // Mapear o novo campo creatorName
      creatorEmail: d.creator_email, // Mapear o novo campo creatorEmail
    })) as Demand[];
  };

  const { data: demands, isLoading, error } = useQuery<Demand[], Error>({
    queryKey: ["demands", user?.id, userRole], // Adicionado userRole ao queryKey
    queryFn: fetchDemands,
    enabled: !!user,
  });

  const addDemandMutation = useMutation({
    mutationFn: async (newDemandData: Partial<Demand>) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { dueDate, createdAt, updatedAt, completedAt, storyPoints, creatorName, creatorEmail, ...rest } = newDemandData; // Incluir creatorEmail

      const { data, error } = await supabase
        .from("demands")
        .insert({
          ...rest,
          user_id: user.id,
          created_at: (createdAt || new Date()).toISOString(),
          updated_at: (updatedAt || new Date()).toISOString(),
          due_date: dueDate ? dueDate.toISOString() : null,
          completed_at: completedAt ? completedAt.toISOString() : null, // Salvar completed_at
          story_points: storyPoints,
          creator_name: creatorName, // Salvar creatorName
          creator_email: creatorEmail, // Salvar creatorEmail
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
    mutationFn: async (updatedDemandData: Partial<Demand>) => {
      if (!user) throw new Error("Usuário não autenticado");

      // Agora, creatorName e creatorEmail são incluídos na atualização
      const { dueDate, createdAt, updatedAt, completedAt, storyPoints, creatorName, creatorEmail, ...rest } = updatedDemandData;

      const { data, error } = await supabase
        .from("demands")
        .update({
          ...rest,
          updated_at: (updatedAt || new Date()).toISOString(),
          due_date: dueDate ? dueDate.toISOString() : null,
          completed_at: completedAt ? completedAt.toISOString() : null, // Salvar completed_at
          story_points: storyPoints,
          creator_name: creatorName, // Incluir creatorName na atualização
          creator_email: creatorEmail, // Incluir creatorEmail na atualização
        })
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

  const deleteDemandMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { error } = await supabase
        .from("demands")
        .delete()
        .eq("id", id);
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

  const completeDemandMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("demands")
        .update({ status: "done", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demands"] });
      toast.success("Demanda concluída com sucesso!");
    },
    onError: (err) => {
      toast.error(`Erro ao concluir demanda: ${err.message}`);
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

  const handleCompleteDemand = (id: string) => {
    if (window.confirm("Tem certeza que deseja concluir esta demanda?")) {
      completeDemandMutation.mutate(id);
    }
  };

  const filteredDemands = (demands || []).filter((demand) => {
    const matchesSearch =
      demand.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demand.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demand.responsible.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (demand.client_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (demand.client_email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (demand.client_cnpj?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (demand.creatorName?.toLowerCase().includes(searchTerm.toLowerCase())) || // Incluir creatorName na busca
      (demand.creatorEmail?.toLowerCase().includes(searchTerm.toLowerCase())); // Incluir creatorEmail na busca

    const matchesPriority = filterPriority === "all" || demand.priority === filterPriority;
    const matchesStatus = filterStatus === "all" || demand.status === filterStatus;
    const matchesType = filterType === "all" || demand.type === filterType;

    // Novo filtro por intervalo de datas
    const matchesDateRange = !dateRange?.from || !dateRange?.to || (
      demand.createdAt && isWithinInterval(demand.createdAt, { start: dateRange.from, end: dateRange.to })
    );

    return matchesSearch && matchesPriority && matchesStatus && matchesType && matchesDateRange;
  });

  // --- Table View Logic ---
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedDemands = [...filteredDemands].sort((a, b) => {
    let aValue: any = (a as any)[sortField];
    let bValue: any = (b as any)[sortField];

    if (aValue instanceof Date) aValue = aValue.getTime();
    if (bValue instanceof Date) bValue = bValue.getTime();

    if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
    if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // --- Calendar View Logic ---
  const monthStart = startOfMonth(calendarCurrentDate);
  const monthEnd = endOfMonth(calendarCurrentDate);
  
  // Ajuste para incluir dias do mês anterior e seguinte para preencher a grade da semana
  const startDayOfCalendar = startOfWeek(monthStart);
  const endDayOfCalendar = endOfWeek(monthEnd);
  const daysInCalendar = eachDayOfInterval({ start: startDayOfCalendar, end: endDayOfCalendar });

  const getDemandsByDate = (date: Date) => {
    return filteredDemands.filter((demand) => demand.createdAt && isSameDay(demand.createdAt, date));
  };

  const previousMonth = () => setCalendarCurrentDate(subMonths(calendarCurrentDate, 1));
  const nextMonth = () => setCalendarCurrentDate(addMonths(calendarCurrentDate, 1));

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  // --- Gantt View Logic ---
  const ganttMonthStart = startOfMonth(calendarCurrentDate); // Reusing calendar date for Gantt
  const ganttMonthEnd = endOfMonth(calendarCurrentDate);
  const ganttDaysInMonth = eachDayOfInterval({ start: ganttMonthStart, end: ganttMonthEnd });

  const getTaskPosition = (startDate: Date, endDate: Date) => {
    const start = Math.max(0, differenceInDays(startDate, ganttMonthStart));
    const duration = differenceInDays(endDate, startDate) || 1;
    const totalDays = ganttDaysInMonth.length;

    return {
      left: `${(start / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
  };

  const demandsWithDates = filteredDemands.map((demand) => ({
    ...demand,
    endDate: demand.dueDate || new Date(demand.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000),
  }));


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
        <p className="text-destructive">Erro ao carregar demandas: ${error.message}</p>
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
          <div className="flex flex-col sm:flex-row items-center gap-4"> {/* Novo wrapper div para alinhamento */}
            <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} /> {/* Novo componente */}
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
        </div>

        {/* View Selector */}
        <div className="mb-6">
          <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as "grid" | "table" | "calendar" | "gantt")} className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto">
              <TabsTrigger value="grid" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Cards</span>
              </TabsTrigger>
              <TabsTrigger value="table" className="gap-2">
                <Table2 className="h-4 w-4" />
                <span className="hidden sm:inline">Tabela</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Calendário</span>
              </TabsTrigger>
              <TabsTrigger value="gantt" className="gap-2">
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

        {/* Demands Display Area */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Mostrando {filteredDemands.length} de {demands?.length || 0} demandas
          </p>
        </div>

        {filteredDemands.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhuma demanda encontrada</p>
          </div>
        )}

        {currentView === "grid" && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDemands.map((demand) => (
              <DemandCard 
                key={demand.id} 
                demand={demand} 
                onEdit={handleEditDemand} 
                onDelete={handleDeleteDemand} 
                onComplete={handleCompleteDemand} // Passar a função de concluir
              />
            ))}
          </div>
        )}

        {currentView === "table" && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort("title")} className="h-8 px-2">
                      Título
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort("type")} className="h-8 px-2">
                      Tipo
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort("priority")} className="h-8 px-2">
                      Prioridade
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort("status")} className="h-8 px-2">
                      Status
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort("system")} className="h-8 px-2">
                      Sistema
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort("responsible")} className="h-8 px-2">
                      Responsável
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort("createdAt")} className="h-8 px-2">
                      Criado em
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDemands.map((demand) => (
                  <TableRow key={demand.id}>
                    <TableCell className="font-medium">{demand.title}</TableCell>
                    <TableCell>
                      <Badge variant={getTypeColor(demand.type) as any}>{typeLabels[demand.type]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityColor(demand.priority) as any}>{priorityLabels[demand.priority]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(demand.status) as any}>{statusLabels[demand.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{demand.system.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>{demand.responsible}</TableCell>
                    <TableCell>{format(demand.createdAt, "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {currentView === "calendar" && (
          <div className="space-y-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-semibold capitalize">
                {format(calendarCurrentDate, "MMMM yyyy", { locale: ptBR })}
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={previousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCalendarCurrentDate(new Date())}>
                  Hoje
                </Button>
                <Button variant="outline" size="sm" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => (
                <div key={day} className="text-center font-semibold text-sm p-2">
                  {day}
                </div>
              ))}

              {daysInCalendar.map((day) => { {/* Alterado para daysInCalendar */}
                const dayDemands = getDemandsByDate(day);
                const isCurrentMonth = isSameMonth(day, calendarCurrentDate);

                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[120px] p-2 border rounded-md ${!isCurrentMonth ? "opacity-50 bg-muted/20" : "bg-card"}`}
                  >
                    <div className="text-sm font-medium mb-1">{format(day, "d")}</div>
                    <div className="space-y-1">
                      {dayDemands.map((demand) => (
                        <div
                          key={demand.id}
                          className="text-xs p-1 rounded bg-primary/10 hover:bg-primary/20 cursor-pointer truncate"
                          onClick={() => handleEditDemand(demand)}
                        >
                          <Badge variant={getPriorityColor(demand.priority) as any} className="h-4 text-[10px] mb-1">
                            {priorityLabels[demand.priority]}
                          </Badge>
                          <div className="truncate">{demand.title}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {currentView === "gantt" && (
          <div className="space-y-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold capitalize">
                {format(calendarCurrentDate, "MMMM yyyy", { locale: ptBR })}
              </h2>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[1200px]">
                {/* Header with dates */}
                <div className="flex border-b mb-4 pb-2">
                  <div className="w-64 font-semibold">Demanda</div>
                  <div className="flex-1 flex">
                    {ganttDaysInMonth.map((day, index) => (
                      <div key={index} className="flex-1 text-center text-xs text-muted-foreground">
                        {format(day, "d")}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gantt rows */}
                <div className="space-y-2">
                  {demandsWithDates.map((demand) => (
                    <div key={demand.id} className="p-2 border rounded-md">
                      <div className="flex items-center">
                        <div className="w-64 pr-4">
                          <div className="font-medium text-sm truncate">{demand.title}</div>
                          <div className="flex gap-1 mt-1">
                            <Badge variant={getPriorityColor(demand.priority) as any} className="text-xs">
                              {priorityLabels[demand.priority]}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {statusLabels[demand.status]}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex-1 relative h-8">
                          <div className="absolute top-0 left-0 right-0 h-full border-t border-dashed border-border" />
                          {ganttDaysInMonth.map((_, index) => (
                            <div
                              key={index}
                              className="absolute top-0 h-full border-r border-border"
                              style={{ left: `${((index + 1) / ganttDaysInMonth.length) * 100}%` }}
                            />
                          ))}
                          <div
                            className="absolute top-1/2 -translate-y-1/2 h-6 bg-primary/80 hover:bg-primary rounded cursor-pointer transition-colors"
                            style={getTaskPosition(demand.createdAt, demand.endDate)}
                            title={`${format(demand.createdAt, "dd/MM")} - ${format(demand.endDate, "dd/MM")}`}
                            onClick={() => handleEditDemand(demand)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DemandList;