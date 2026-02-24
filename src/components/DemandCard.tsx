import { Demand } from "@/types/demand";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Wrench, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { typeLabels, priorityLabels, statusLabels, getPriorityColor, getTypeColor, getStatusColor } from "@/lib/demandUtils";
import { useAuth } from "@/integrations/supabase/auth";

interface DemandCardProps {
  demand: Demand;
  onEdit?: (demand: Demand) => void;
  onDelete?: (id: string) => void;
  onComplete?: (id: string) => void;
}

export const DemandCard = ({ demand, onEdit, onDelete, onComplete }: DemandCardProps) => {
  const { userRole } = useAuth();
  
  const daysUntilDue = demand.dueDate && demand.status !== "done" ? differenceInDays(demand.dueDate, new Date()) : null;
  const isOverdue = daysUntilDue !== null && daysUntilDue <= 0 && demand.status !== "done";

  return (
    <Card 
      className="hover:shadow-md transition-all duration-300 flex flex-col h-full cursor-pointer"
      onDoubleClick={() => onEdit?.(demand)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight line-clamp-2 break-words flex-1">
            {demand.title}
          </CardTitle>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant={getPriorityColor(demand.priority) as any} className="whitespace-nowrap">
              {priorityLabels[demand.priority]}
            </Badge>
            {isOverdue && (
              <Badge variant="destructive" className="flex items-center gap-1 whitespace-nowrap text-[10px]">
                <AlertTriangle className="h-3 w-3" />
                Vencido
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-2">
          <Badge variant={getTypeColor(demand.type) as any} className="text-[10px]">
            {typeLabels[demand.type]}
          </Badge>
          <Badge variant={getStatusColor(demand.status) as any} className="text-[10px]">
            {statusLabels[demand.status]}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 flex-1">
        <p className="text-sm text-muted-foreground line-clamp-3 break-words">
          {demand.description}
        </p>
        
        <div className="flex flex-col gap-1.5 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wrench className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium truncate">{(demand.system || "N/A").toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{demand.responsible}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Criado: {format(demand.createdAt, "dd/MM/yy", { locale: ptBR })}</span>
          </div>
          {demand.dueDate && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Prazo: {format(demand.dueDate, "dd/MM/yy", { locale: ptBR })}</span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-wrap gap-2 pt-3 mt-auto">
        {onEdit && (
          <Button variant="outline" size="sm" onClick={() => onEdit(demand)} className="flex-1 h-8 text-xs">
            Editar
          </Button>
        )}
        {onDelete && userRole === "admin" && (
          <Button variant="destructive" size="sm" onClick={() => onDelete(demand.id)} className="flex-1 h-8 text-xs">
            Excluir
          </Button>
        )}
        {onComplete && demand.status !== "done" && (
          <Button variant="success" size="sm" onClick={() => onComplete(demand.id)} className="flex-1 h-8 text-xs">
            Concluir
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};