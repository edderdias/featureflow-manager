import { Demand } from "@/types/demand";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Wrench } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { typeLabels, priorityLabels, statusLabels, getPriorityColor, getTypeColor, getStatusColor } from "@/lib/demandUtils";

interface DemandCardProps {
  demand: Demand;
  onEdit?: (demand: Demand) => void;
  onDelete?: (id: string) => void;
}

export const DemandCard = ({ demand, onEdit, onDelete }: DemandCardProps) => {
  return (
    <Card className="hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight">{demand.title}</CardTitle>
          <Badge variant={getPriorityColor(demand.priority) as any}>
            {priorityLabels[demand.priority]}
          </Badge>
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
            <span>{format(demand.createdAt, "dd/MM/yyyy", { locale: ptBR })}</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="gap-2 pt-3">
        {onEdit && (
          <Button variant="outline" size="sm" onClick={() => onEdit(demand)} className="flex-1">
            Editar
          </Button>
        )}
        {onDelete && (
          <Button variant="destructive" size="sm" onClick={() => onDelete(demand.id)} className="flex-1">
            Excluir
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
