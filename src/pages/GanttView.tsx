import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { format, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getPriorityColor, statusLabels } from "@/lib/demandUtils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { Demand } from "@/types/demand";

const GanttView = () => {
  const [currentDate] = useState(new Date());
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
        <p className="text-muted-foreground">Carregando gráfico de Gantt...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-destructive">Erro ao carregar gráfico de Gantt: {error.message}</p>
      </div>
    );
  }

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getTaskPosition = (startDate: Date, endDate: Date) => {
    const start = Math.max(0, differenceInDays(startDate, monthStart));
    const duration = differenceInDays(endDate, startDate) || 1;
    const totalDays = daysInMonth.length;

    return {
      left: `${(start / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
  };

  const demandsWithDates = (demands || []).map((demand) => ({
    ...demand,
    endDate: demand.dueDate || new Date(demand.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000),
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Gráfico de Gantt</h1>
          <p className="text-muted-foreground">Timeline visual das demandas</p>
        </div>

        <div className="mb-4">
          <h2 className="text-xl font-semibold capitalize">
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[1200px]">
            {/* Header with dates */}
            <div className="flex border-b mb-4 pb-2">
              <div className="w-64 font-semibold">Demanda</div>
              <div className="flex-1 flex">
                {daysInMonth.map((day, index) => (
                  <div key={index} className="flex-1 text-center text-xs text-muted-foreground">
                    {format(day, "d")}
                  </div>
                ))}
              </div>
            </div>

            {/* Gantt rows */}
            <div className="space-y-2">
              {demandsWithDates.map((demand) => (
                <Card key={demand.id} className="p-2">
                  <div className="flex items-center">
                    <div className="w-64 pr-4">
                      <div className="font-medium text-sm truncate">{demand.title}</div>
                      <div className="flex gap-1 mt-1">
                        <Badge variant={getPriorityColor(demand.priority) as any} className="text-xs">
                          {demand.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {statusLabels[demand.status]}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex-1 relative h-8">
                      <div className="absolute top-0 left-0 right-0 h-full border-t border-dashed border-border" />
                      {daysInMonth.map((_, index) => (
                        <div
                          key={index}
                          className="absolute top-0 h-full border-r border-border"
                          style={{ left: `${((index + 1) / daysInMonth.length) * 100}%` }}
                        />
                      ))}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-6 bg-primary/80 hover:bg-primary rounded cursor-pointer transition-colors"
                        style={getTaskPosition(demand.createdAt, demand.endDate)}
                        title={`${format(demand.createdAt, "dd/MM")} - ${format(demand.endDate, "dd/MM")}`}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttView;