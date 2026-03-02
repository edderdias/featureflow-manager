import React, { Suspense, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { Demand } from "@/types/demand";
import { StatsCard } from "@/components/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from "recharts";
import { 
  LayoutDashboard, ListTodo, CheckCircle2, Clock, AlertCircle, 
  Plus, Loader2, ArrowRight 
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { statusLabels, getStatusColor, typeLabels, priorityLabels } from "@/lib/demandUtils";
import { toast } from "sonner";

const DemandDialog = React.lazy(() => import("@/components/DemandDialog").then(m => ({ default: m.DemandDialog })));

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Dashboard = () => {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

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
      if (id) {
        const { error } = await supabase.from("demands").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("demands").insert({ ...payload, user_id: user?.id, created_at: new Date().toISOString() });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demands"] });
      setIsDialogOpen(false);
      toast.success("Demanda salva com sucesso!");
    },
  });

  // Cálculos para os gráficos
  const stats = useMemo(() => {
    if (!demands) return null;
    const total = demands.length;
    const done = demands.filter(d => d.status === "done").length;
    const inProgress = demands.filter(d => d.status === "in-progress").length;
    const todo = demands.filter(d => d.status === "todo").length;
    const testing = demands.filter(d => d.status === "testing").length;

    // Por Sistema
    const bySystem = demands.reduce((acc: any, d) => {
      const sys = (d.system || "N/A").toUpperCase();
      acc[sys] = (acc[sys] || 0) + 1;
      return acc;
    }, {});
    const systemData = Object.keys(bySystem).map(name => ({ name, value: bySystem[name] }));

    // Por Tipo
    const byType = demands.reduce((acc: any, d) => {
      const type = typeLabels[d.type] || d.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    const typeData = Object.keys(byType).map(name => ({ name, value: byType[name] }));

    // Por Responsável
    const byResponsible = demands.reduce((acc: any, d) => {
      const resp = d.responsible || "Não Atribuído";
      acc[resp] = (acc[resp] || 0) + 1;
      return acc;
    }, {});
    const responsibleData = Object.keys(byResponsible)
      .map(name => ({ name, value: byResponsible[name] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Por Stack
    const byStack = demands.reduce((acc: any, d) => {
      const stack = (d.stack || "none").toUpperCase();
      acc[stack] = (acc[stack] || 0) + 1;
      return acc;
    }, {});
    const stackData = Object.keys(byStack).map(name => ({ name, value: byStack[name] }));

    // Últimas 5 demandas
    const latestDemands = [...demands]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);

    return { total, done, inProgress, todo, testing, systemData, typeData, responsibleData, stackData, latestDemands };
  }, [demands]);

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral do sistema e indicadores de desempenho</p>
          </div>
          <Suspense fallback={<Button size="lg" disabled>Carregando...</Button>}>
            <DemandDialog 
              onSave={saveMutation.mutate} 
              open={isDialogOpen} 
              onOpenChange={setIsDialogOpen} 
              trigger={
                <Button size="lg" className="gap-2" onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-5 w-5" /> Nova Demanda
                </Button>
              } 
            />
          </Suspense>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard title="Total de Demandas" value={stats?.total || 0} icon={ListTodo} />
          <StatsCard title="Em Andamento" value={stats?.inProgress || 0} icon={Clock} />
          <StatsCard title="Em Teste" value={stats?.testing || 0} icon={AlertCircle} />
          <StatsCard title="Concluídas" value={stats?.done || 0} icon={CheckCircle2} />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Demandas por Sistema */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Demandas por Sistema</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.systemData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Demandas por Tipo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribuição por Tipo</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats?.typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Demandas por Responsável */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top 5 Responsáveis</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.responsibleData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={12} />
                  <YAxis dataKey="name" type="category" fontSize={10} width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Demandas por Stack */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Demandas por Stack</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.stackData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Últimas Demandas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl">Últimas Demandas Criadas</CardTitle>
            <Link to="/demands">
              <Button variant="ghost" size="sm" className="gap-2">
                Ver todas <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.latestDemands.map((demand) => (
                <div key={demand.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-sm line-clamp-1">{demand.title}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{format(demand.createdAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                      <span>•</span>
                      <span className="font-medium">{(demand.system || "N/A").toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={getStatusColor(demand.status) as any} className="text-[10px]">
                      {statusLabels[demand.status]}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] hidden sm:flex">
                      {demand.responsible}
                    </Badge>
                  </div>
                </div>
              ))}
              {stats?.latestDemands.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma demanda encontrada.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;