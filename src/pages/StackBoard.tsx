import React, { useState, Suspense } from "react";
import { Demand } from "@/types/demand";
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

const DemandDialog = React.lazy(() => import("@/components/DemandDialog").then(m => ({ default: m.DemandDialog })));

const StackCard = ({ demand, onEdit }: { demand: Demand; onEdit: (d: Demand) => void }) => {
  const completedItems = demand.checklist?.filter((item) => item.completed).length || 0;
  const totalItems = demand.checklist?.length || 0;
  const checklistProgress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  return (
    <Card onDoubleClick={() => onEdit(demand)} className="hover:shadow-lg transition-all duration-300 group mb-3 cursor-pointer overflow-hidden">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2 break-words">{demand.title}</CardTitle>
        <div className="flex flex-wrap gap-1 pt-1">
          <Badge variant={getPriorityColor(demand.priority) as any} className="text-[9px] h-4 px-1">{priorityLabels[demand.priority]}</Badge>
          <Badge variant={getTypeColor(demand.type) as any} className="text-[9px] h-4 px-1">{typeLabels[demand.type]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        <p className="text-xs text-muted-foreground line-clamp-2 break-words">{demand.description}</p>
        {demand.checklist && demand.checklist.length > 0 && <div className="space-y-1"><Progress value={checklistProgress} className="h-1" /></div>}
        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1 truncate max-w-[100px]"><User className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{demand.responsible}</span></div>
          {demand.dueDate && <div className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5 shrink-0" /><span>{format(demand.dueDate, "dd/MM", { locale: ptBR })}</span></div>}
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <Badge variant="outline" className="text-[9px] font-mono h-4 px-1">{(demand.system || "N/A").toUpperCase()}</Badge>
          <Badge variant="secondary" className="text-[9px] h-4 px-1">{(demand.stack || "none").toUpperCase()}</Badge>
        </div>
      </CardContent>
    </Card>
  );
};

const StackColumn = ({ title, demands, onEdit, visibleCount, onShowMore }: any) => {
  const display = demands.slice(0, visibleCount);
  return (
    <div className="flex flex-col bg-muted/30 p-3 rounded-lg shadow-sm min-h-[200px] w-full">
      <div className="mb-3"><h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h2><p className="text-[10px] text-muted-foreground">{demands.length} demandas</p></div>
      <div className="space-y-2 flex-1">{display.map((d: any) => <StackCard key={d.id} demand={d} onEdit={onEdit} />)}</div>
      {demands.length > visibleCount && <Button variant="ghost" size="sm" className="w-full mt-2 text-[10px] h-7" onClick={onShowMore}>Ver mais</Button>}
    </div>
  );
};

const StackBoard = () => {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDemand, setEditingDemand] = useState<Demand | undefined>(undefined);
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({ splint: 5, backend: 5, frontend: 5, apps: 5, done: 5 });

  const fetchDemands = async () => {
    if (!user) return [];
    let query = supabase.from("demands").select("*");
    if (userRole === "user") query = query.eq("user_id", user.id);
    const { data, error } = await query;
    if (error) throw error;
    return data.map((d: any) => ({ ...d, createdAt: new Date(d.created_at), updatedAt: new Date(d.updated_at), dueDate: d.due_date ? new Date(d.due_date) : undefined, completedAt: d.completed_at ? new Date(d.completed_at) : undefined, storyPoints: d.story_points, creatorName: d.creator_name, creatorEmail: d.creator_email })) as Demand[];
  };

  const { data: demands, isLoading } = useQuery<Demand[]>({ queryKey: ["demands", user?.id, userRole], queryFn: fetchDemands, enabled: !!user });

  const saveMutation = useMutation({
    mutationFn: async (demandData: Partial<Demand>) => {
      const { id, ...rest } = demandData;
      const payload = { ...rest, updated_at: new Date().toISOString() };
      if (id) return supabase.from("demands").update(payload).eq("id", id);
      return supabase.from("demands").insert({ ...payload, user_id: user?.id, created_at: new Date().toISOString() });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["demands"] }); setIsDialogOpen(false); },
  });

  const filtered = (demands || []).filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase()) || d.description.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesDate = true;
    if (dateRange?.from && dateRange?.to) matchesDate = isWithinInterval(d.createdAt, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
    else if (dateRange?.from) matchesDate = isSameDay(d.createdAt, dateRange.from);
    return matchesSearch && matchesDate;
  }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (isLoading) return <div className="p-8 text-center">Carregando...</div>;

  const cols = {
    splint: filtered.filter(d => d.status === "todo"),
    backend: filtered.filter(d => (d.status === "in-progress" || d.status === "testing") && d.stack === "backend"),
    frontend: filtered.filter(d => (d.status === "in-progress" || d.status === "testing") && d.stack === "frontend"),
    apps: filtered.filter(d => (d.status === "in-progress" || d.status === "testing") && d.stack === "apps"),
    done: filtered.filter(d => d.status === "done")
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div><h1 className="text-4xl font-bold mb-2">Lista por Stacks</h1><p className="text-muted-foreground">Visualização organizada por tecnologia</p></div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
            <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div>
            <Suspense fallback={<Button size="lg" disabled>Carregando...</Button>}>
              <DemandDialog demand={editingDemand} onSave={saveMutation.mutate} open={isDialogOpen} onOpenChange={setIsDialogOpen} trigger={<Button size="lg" className="gap-2" onClick={() => { setEditingDemand(undefined); setIsDialogOpen(true); }}><Plus className="h-5 w-5" /> Nova Demanda</Button>} />
            </Suspense>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Object.entries(cols).map(([key, list]) => (
            <StackColumn key={key} title={key.toUpperCase()} demands={list} onEdit={setEditingDemand} visibleCount={visibleCounts[key]} onShowMore={() => setVisibleCounts(v => ({ ...v, [key]: v[key] + 5 }))} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default StackBoard;