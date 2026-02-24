import { useState, Suspense, ReactNode, lazy } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Button } from "@/components/ui/button";
import { Download, Plus, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { Demand } from "@/types/demand";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DateRange } from "react-day-picker";
import { startOfDay, endOfDay, isWithinInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const DemandDialog = lazy(() => import("@/components/DemandDialog").then(m => ({ default: m.DemandDialog })));

const Reports = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchDemands = async () => {
    if (!user) return [];
    const { data, error } = await supabase.from("demands").select("*");
    if (error) throw error;
    return data.map((d: any) => ({ ...d, createdAt: new Date(d.created_at), updatedAt: new Date(d.updated_at), dueDate: d.due_date ? new Date(d.due_date) : undefined })) as Demand[];
  };

  const { data: demands, isLoading } = useQuery<Demand[]>({ queryKey: ["demands", user?.id], queryFn: fetchDemands, enabled: !!user });

  const saveMutation = useMutation({
    mutationFn: async (demandData: Partial<Demand>) => {
      const { id, ...rest } = demandData;
      if (id) return supabase.from("demands").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id);
      return supabase.from("demands").insert({ ...rest, user_id: user?.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["demands"] }); setIsDialogOpen(false); toast.success("Demanda salva!"); },
  });

  if (isLoading) return <div className="p-8 text-center">Carregando...</div>;

  const filtered = (demands || []).filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase()) || d.description.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesDate = true;
    if (dateRange?.from && dateRange?.to) matchesDate = isWithinInterval(d.createdAt, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
    else if (dateRange?.from) matchesDate = isSameDay(d.createdAt, dateRange.from);
    return matchesSearch && matchesDate;
  }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const bugsBySystem = filtered.filter(d => d.type === "bug").reduce((acc, d) => {
    const system = d.system.toUpperCase();
    const existing = acc.find(item => item.sistema === system);
    if (existing) existing.bugs += 1; else acc.push({ sistema: system, bugs: 1 });
    return acc;
  }, [] as { sistema: string; bugs: number }[]).sort((a, b) => b.bugs - a.bugs);

  const priorityData = [
    { prioridade: "Alta", quantidade: filtered.filter(d => d.priority === "high").length },
    { prioridade: "Média", quantidade: filtered.filter(d => d.priority === "medium").length },
    { prioridade: "Baixa", quantidade: filtered.filter(d => d.priority === "low").length },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div><h1 className="text-4xl font-bold mb-2">Relatórios</h1><p className="text-muted-foreground">Análise detalhada das demandas</p></div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
            <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div>
            <Button size="lg" variant="outline" className="gap-2"><Download className="h-5 w-5" /> Exportar</Button>
            <Suspense fallback={<Button size="lg" disabled>Carregando...</Button>}>
              <DemandDialog onSave={saveMutation.mutate} open={isDialogOpen} onOpenChange={setIsDialogOpen} trigger={<Button size="lg" className="gap-2" onClick={() => setIsDialogOpen(true)}><Plus className="h-5 w-5" /> Nova Demanda</Button>} />
            </Suspense>
          </div>
        </div>
        <div className="grid gap-6">
          <Card><CardHeader><CardTitle>Problemas por Sistema</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={350}><BarChart data={bugsBySystem}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="sistema" /><YAxis /><Tooltip /><Legend /><Bar dataKey="bugs" fill="hsl(var(--destructive))" name="Bugs" /></BarChart></ResponsiveContainer></CardContent></Card>
          <div className="grid gap-6 md:grid-cols-2">
            <Card><CardHeader><CardTitle>Prioridade</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={priorityData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="prioridade" /><YAxis /><Tooltip /><Bar dataKey="quantidade" fill="hsl(var(--primary))" /></BarChart></ResponsiveContainer></CardContent></Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;