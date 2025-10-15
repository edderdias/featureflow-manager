import { StatsCard } from "@/components/StatsCard";
import { DemandCard } from "@/components/DemandCard";
import { AlertCircle, CheckCircle2, Clock, ListTodo, Plus } from "lucide-react"; // Added Plus icon
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Added Button
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { Demand } from "@/types/demand";
import { Link } from "react-router-dom"; // Added Link

const Dashboard = () => {
  const { user } = useAuth();

  const fetchDemands = async () => {
    if (!user) return []; // Still require user to be logged in to fetch any demands

    // Alterado: Removido .eq("user_id", user.id) para buscar todas as demandas
    const { data, error } = await supabase
      .from("demands")
      .select("*");
    if (error) throw error;
    return data.map((d: any) => ({
      ...d,
      createdAt: new Date(d.created_at),
      updatedAt: new Date(d.updated_at),
      dueDate: d.due_date ? new Date(d.due_date) : undefined,
    })) as Demand[];
  };

  const { data: demands, isLoading, error } = useQuery<Demand[], Error>({
    queryKey: ["demands", user?.id],
    queryFn: fetchDemands,
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-muted-foreground">Carregando dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-destructive">Erro ao carregar dashboard: {error.message}</p>
      </div>
    );
  }

  const totalDemands = demands?.length || 0;
  const highPriority = demands?.filter(d => d.priority === "high").length || 0;
  const inProgress = demands?.filter(d => d.status === "in-progress").length || 0;
  const completed = demands?.filter(d => d.status === "done").length || 0;

  // Data for charts
  const typeData = [
    { name: "Novo Recurso", value: demands?.filter(d => d.type === "feature").length || 0, color: "hsl(var(--primary))" },
    { name: "Bug", value: demands?.filter(d => d.type === "bug").length || 0, color: "hsl(var(--destructive))" },
    { name: "Reparo", value: demands?.filter(d => d.type === "repair").length || 0, color: "hsl(var(--warning))" },
  ];

  const systemData = (demands || []).reduce((acc, demand) => {
    const system = demand.system.toUpperCase();
    const existing = acc.find(item => item.name === system);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: system, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const recentDemands = (demands || [])
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral das demandas de desenvolvimento e suporte
            </p>
          </div>
          <Link to="/client-demand">
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Abrir Demanda
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatsCard
            title="Total de Demandas"
            value={totalDemands}
            icon={ListTodo}
            description="Demandas ativas no sistema"
          />
          <StatsCard
            title="Alta Prioridade"
            value={highPriority}
            icon={AlertCircle}
            description="Requerem atenção urgente"
          />
          <StatsCard
            title="Em Andamento"
            value={inProgress}
            icon={Clock}
            description="Sendo trabalhadas agora"
          />
          <StatsCard
            title="Concluídas"
            value={completed}
            icon={CheckCircle2}
            description="Finalizadas este mês"
            trend={{ value: 15, isPositive: true }}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Demandas por Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={systemData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Demands */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Demandas Recentes</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentDemands.map((demand) => (
              <DemandCard key={demand.id} demand={demand} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;