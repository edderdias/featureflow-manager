import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { Demand } from "@/types/demand";

const Reports = () => {
  const { user } = useAuth();

  const fetchDemands = async () => {
    if (!user) return [];
    const { data, error } = await supabase
      .from("demands")
      .select("*")
      .eq("user_id", user.id);
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
        <p className="text-muted-foreground">Carregando relatórios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-destructive">Erro ao carregar relatórios: {error.message}</p>
      </div>
    );
  }

  // Bug reports by system
  const bugsBySystem = (demands || [])
    .filter(d => d.type === "bug")
    .reduce((acc, demand) => {
      const system = demand.system.toUpperCase();
      const existing = acc.find(item => item.sistema === system);
      if (existing) {
        existing.bugs += 1;
      } else {
        acc.push({ sistema: system, bugs: 1 });
      }
      return acc;
    }, [] as { sistema: string; bugs: number }[])
    .sort((a, b) => b.bugs - a.bugs);

  // Priority distribution
  const priorityData = [
    { prioridade: "Alta", quantidade: (demands || []).filter(d => d.priority === "high").length },
    { prioridade: "Média", quantidade: (demands || []).filter(d => d.priority === "medium").length },
    { prioridade: "Baixa", quantidade: (demands || []).filter(d => d.priority === "low").length },
  ];

  // Type distribution
  const typeData = [
    { tipo: "Novo Recurso", quantidade: (demands || []).filter(d => d.type === "feature").length },
    { tipo: "Bug", quantidade: (demands || []).filter(d => d.type === "bug").length },
    { tipo: "Reparo", quantidade: (demands || []).filter(d => d.type === "repair").length },
  ];

  // Status progress (mock timeline data) - This would ideally come from actual demand history
  const progressData = [
    { semana: "Sem 1", concluidas: 5, iniciadas: 8 },
    { semana: "Sem 2", concluidas: 7, iniciadas: 6 },
    { semana: "Sem 3", concluidas: 4, iniciadas: 9 },
    { semana: "Sem 4", concluidas: 6, iniciadas: 7 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Relatórios</h1>
            <p className="text-muted-foreground">
              Análise detalhada das demandas e métricas do sistema
            </p>
          </div>
          <Button size="lg" className="gap-2">
            <Download className="h-5 w-5" />
            Exportar PDF
          </Button>
        </div>

        <div className="grid gap-6">
          {/* Bugs by System */}
          <Card>
            <CardHeader>
              <CardTitle>Problemas Mais Relatados por Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={bugsBySystem}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sistema" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="bugs" fill="hsl(var(--destructive))" name="Bugs Reportados" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Priority and Type Distribution */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Prioridade</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={priorityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="prioridade" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="quantidade" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={typeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="tipo" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="quantidade" fill="hsl(var(--accent))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Progress Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Progresso ao Longo do Tempo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="semana" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="concluidas"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    name="Demandas Concluídas"
                  />
                  <Line
                    type="monotone"
                    dataKey="iniciadas"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="Demandas Iniciadas"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Reports;