import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getPriorityColor } from "@/lib/demandUtils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { Demand } from "@/types/demand";

const CalendarView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
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
        <p className="text-muted-foreground">Carregando calendário...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-destructive">Erro ao carregar calendário: {error.message}</p>
      </div>
    );
  }

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getDemandsByDate = (date: Date) => {
    return (demands || []).filter((demand) => isSameDay(demand.createdAt, date));
  };

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Visualização em Calendário</h1>
          <p className="text-muted-foreground">Veja as demandas organizadas por data</p>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold capitalize">
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
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

          {daysInMonth.map((day) => {
            const dayDemands = getDemandsByDate(day);
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <Card
                key={day.toISOString()}
                className={`min-h-[120px] p-2 ${!isCurrentMonth ? "opacity-50" : ""}`}
              >
                <div className="text-sm font-medium mb-1">{format(day, "d")}</div>
                <div className="space-y-1">
                  {dayDemands.map((demand) => (
                    <div
                      key={demand.id}
                      className="text-xs p-1 rounded bg-primary/10 hover:bg-primary/20 cursor-pointer truncate"
                    >
                      <Badge variant={getPriorityColor(demand.priority) as any} className="h-4 text-[10px] mb-1">
                        {demand.priority}
                      </Badge>
                      <div className="truncate">{demand.title}</div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;