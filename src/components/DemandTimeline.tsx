import { TimelineEvent } from "@/types/demand";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, MessageSquare, Paperclip, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DemandTimelineProps {
  timeline: TimelineEvent[];
}

const getEventIcon = (type: TimelineEvent["type"]) => {
  switch (type) {
    case "created":
      return <CheckCircle className="h-4 w-4" />;
    case "status_change":
      return <CheckCircle className="h-4 w-4" />;
    case "comment":
      return <MessageSquare className="h-4 w-4" />;
    case "assignment":
      return <User className="h-4 w-4" />;
    case "attachment":
      return <Paperclip className="h-4 w-4" />;
    default:
      return <Calendar className="h-4 w-4" />;
  }
};

export const DemandTimeline = ({ timeline }: DemandTimelineProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Linha do Tempo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timeline.map((event, index) => (
            <div key={event.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-primary/10 p-2 text-primary">{getEventIcon(event.type)}</div>
                {index < timeline.length - 1 && <div className="w-px h-full bg-border mt-2" />}
              </div>
              <div className="flex-1 pb-4">
                <p className="text-sm font-medium">{event.description}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{event.user}</span>
                  <span>•</span>
                  <span>{format(event.timestamp, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                </div>
              </div>
            </div>
          ))}
          {timeline.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum evento registrado</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
