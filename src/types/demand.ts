export type DemandType = "feature" | "bug" | "repair";
export type DemandPriority = "low" | "medium" | "high";
export type DemandStatus = "todo" | "in-progress" | "testing" | "done";
export type SystemType = "toqweb" | "gmax" | "toqblend" | "t5" | "t10" | "ecopdv" | "toqped" | "toqvenda";

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  type: "doc" | "image" | "link";
  url: string;
  uploadedAt: Date;
}

export interface TimelineEvent {
  id: string;
  type: "created" | "status_change" | "comment" | "assignment" | "attachment";
  description: string;
  user: string;
  timestamp: Date;
}

export interface Demand {
  id: string;
  user_id?: string; // Made nullable
  title: string;
  description: string;
  type: DemandType;
  priority: DemandPriority;
  status: DemandStatus;
  system: SystemType;
  responsible: string;
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  completedAt?: Date; // Novo campo para a data de conclusão
  storyPoints?: number;
  sprint?: string;
  checklist?: ChecklistItem[];
  attachments?: Attachment[];
  timeline?: TimelineEvent[];
  tags?: string[];
  client_cnpj?: string; // New field
  client_email?: string; // New field
  client_name?: string; // New field
  creatorName?: string; // Novo campo para o nome do criador da demanda
}