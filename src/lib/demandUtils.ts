import { DemandType, DemandPriority, DemandStatus } from "@/types/demand";

export const typeLabels: Record<DemandType, string> = {
  feature: "Novo Recurso",
  bug: "Bug",
  repair: "Reparo",
};

export const priorityLabels: Record<DemandPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

export const statusLabels: Record<DemandStatus, string> = {
  todo: "A Fazer",
  "in-progress": "Em Andamento",
  testing: "Em Teste",
  done: "Concluído",
};

export const getPriorityColor = (priority: DemandPriority) => {
  switch (priority) {
    case "high":
      return "destructive";
    case "medium":
      return "warning";
    case "low":
      return "secondary";
  }
};

export const getTypeColor = (type: DemandType) => {
  switch (type) {
    case "feature":
      return "default";
    case "bug":
      return "destructive";
    case "repair":
      return "warning";
  }
};

export const getStatusColor = (status: DemandStatus) => {
  switch (status) {
    case "todo":
      return "secondary";
    case "in-progress":
      return "default";
    case "testing":
      return "warning";
    case "done":
      return "success";
  }
};
