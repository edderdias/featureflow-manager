import { useState } from "react";
import { mockDemands } from "@/lib/mockData";
import { DemandStatus, Demand } from "@/types/demand";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { statusLabels, getPriorityColor, getTypeColor, priorityLabels, typeLabels } from "@/lib/demandUtils";
import { User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const columns: DemandStatus[] = ["todo", "in-progress", "testing", "done"];

const KanbanBoard = () => {
  const [demands] = useState<Demand[]>(mockDemands);

  const getDemandsByStatus = (status: DemandStatus) => {
    return demands.filter((d) => d.status === status);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Board Kanban</h1>
          <p className="text-muted-foreground">
            Visualize e organize o fluxo de trabalho das demandas
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {columns.map((status) => {
            const columnDemands = getDemandsByStatus(status);
            return (
              <div key={status} className="flex flex-col">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold mb-1">{statusLabels[status]}</h2>
                  <p className="text-sm text-muted-foreground">
                    {columnDemands.length} {columnDemands.length === 1 ? "demanda" : "demandas"}
                  </p>
                </div>

                <div className="space-y-3 flex-1">
                  {columnDemands.map((demand) => (
                    <Card
                      key={demand.id}
                      className="cursor-move hover:shadow-lg transition-all duration-300"
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base leading-tight">
                          {demand.title}
                        </CardTitle>
                        <div className="flex gap-2 pt-2">
                          <Badge variant={getPriorityColor(demand.priority) as any} className="text-xs">
                            {priorityLabels[demand.priority]}
                          </Badge>
                          <Badge variant={getTypeColor(demand.type) as any} className="text-xs">
                            {typeLabels[demand.type]}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-2">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {demand.description}
                        </p>

                        <div className="flex flex-col gap-1.5 text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{demand.responsible}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{format(demand.createdAt, "dd/MM/yyyy", { locale: ptBR })}</span>
                          </div>
                        </div>

                        <div className="pt-2">
                          <Badge variant="outline" className="text-xs font-mono">
                            {demand.system.toUpperCase()}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {columnDemands.length === 0 && (
                    <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg border-border">
                      <p className="text-sm text-muted-foreground">Nenhuma demanda</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default KanbanBoard;
