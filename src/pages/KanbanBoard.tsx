import { useState } from "react";
import { mockDemands } from "@/lib/mockData";
import { DemandStatus, Demand } from "@/types/demand";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { statusLabels, getPriorityColor, getTypeColor, priorityLabels, typeLabels } from "@/lib/demandUtils";
import { User, Calendar, CheckSquare, Paperclip, Tag, Target } from "lucide-react";
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
                  {columnDemands.map((demand) => {
                    const completedItems = demand.checklist?.filter((item) => item.completed).length || 0;
                    const totalItems = demand.checklist?.length || 0;
                    const checklistProgress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

                    return (
                      <Card
                        key={demand.id}
                        className="cursor-move hover:shadow-lg transition-all duration-300 group"
                      >
                        {demand.tags && demand.tags.length > 0 && (
                          <div className="px-4 pt-3 pb-0">
                            <div className="flex flex-wrap gap-1">
                              {demand.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-[10px] h-5">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <CardHeader className="pb-3">
                          <CardTitle className="text-base leading-tight group-hover:text-primary transition-colors">
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

                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground line-clamp-2">{demand.description}</p>

                          {demand.checklist && demand.checklist.length > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <CheckSquare className="h-3 w-3" />
                                <span>
                                  {completedItems}/{totalItems}
                                </span>
                              </div>
                              <Progress value={checklistProgress} className="h-1" />
                            </div>
                          )}

                          <div className="flex flex-wrap gap-3 text-xs">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>{demand.responsible}</span>
                            </div>
                            {demand.dueDate && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{format(demand.dueDate, "dd/MM", { locale: ptBR })}</span>
                              </div>
                            )}
                            {demand.storyPoints && demand.storyPoints > 0 && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Target className="h-3 w-3" />
                                <span>{demand.storyPoints}pts</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <Badge variant="outline" className="text-xs font-mono">
                              {demand.system.toUpperCase()}
                            </Badge>
                            {demand.attachments && demand.attachments.length > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Paperclip className="h-3 w-3" />
                                <span>{demand.attachments.length}</span>
                              </div>
                            )}
                          </div>

                          {demand.sprint && (
                            <div className="pt-1 border-t">
                              <Badge variant="secondary" className="text-xs">
                                {demand.sprint}
                              </Badge>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}

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
