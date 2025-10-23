import { Demand } from "@/types/demand";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Wrench, CheckCircle2, Clock, AlertTriangle } from "lucide-react"; // Adicionado AlertTriangle icon
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
  const displayDate = demand.status === "done" && demand.completedAt
    ? demand.completedAt
    : demand.createdAt;
  const dateLabel = demand.status === "done" ? "Concluído em" : "Criado em";

  const daysUntilDue = demand.dueDate && demand.status !== "done" ? differenceInDays(demand.dueDate, new Date()) : null;
  const isDueSoon = daysUntilDue === 1;
  const isOverdue = daysUntilDue !== null && daysUntilDue <= 0 && demand.status !== "done";

  return (
    <Card className="hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight">{demand.title}</CardTitle>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={getPriorityColor(demand.priority) as any}>
              {priorityLabels[demand.priority]}
            </Badge>
            {isOverdue && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Prazo Vencido!
              </Badge>
            )}
            {isDueSoon && (
              <Badge variant="warning" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Vence amanhã!
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Badge variant={getTypeColor(demand.type) as any}>
            {typeLabels[demand.type]}
          </Badge>
          <Badge variant={getStatusColor(demand.status) as any}>
            {statusLabels[demand.status]}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{demand.description}</p>
        
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wrench className="h-4 w-4" />
            <span className="font-medium">{demand.system.toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{demand.responsible}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{dateLabel}: {format(displayDate, "dd/MM/yyyy", { locale: ptBR })}</span>
          </div>
          {demand.dueDate && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Vencimento: {format(demand.dueDate, "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-wrap gap-2 pt-3">
        {onEdit && (
          <Button variant="outline" size="sm" onClick={() => onEdit(demand)} className="flex-1 min-w-[100px]">
            Editar
          </Button>
        )}
        {onDelete && userRole === "admin" && (
          <Button variant="destructive" size="sm" onClick={() => onDelete(demand.id)} className="flex-1 min-w-[100px]">
            Excluir
          </Button>
        )}
        {onComplete && demand.status !== "done" && (
          <Button variant="success" size="sm" onClick={() => onComplete(demand.id)} className="flex-1 min-w-[100px]">
            <CheckCircle2 className="h-4 w-4 mr-2" /> Concluir
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};