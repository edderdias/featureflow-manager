export type DemandType = "feature" | "bug" | "repair";
export type DemandPriority = "low" | "medium" | "high";
export type DemandStatus = "todo" | "in-progress" | "testing" | "done";
export type SystemType = "toqweb" | "gmax" | "toqblend" | "t5" | "t10" | "ecopdv" | "toqped" | "toqvenda" | "api";
export type StackType = "none" | "backend" | "frontend" | "apps";

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
  user_id?: string;
  title: string;
  description: string;
  type: DemandType;
  priority: DemandPriority;
  status: DemandStatus;
  system: SystemType;
  stack: StackType;
  responsible: string;
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  completedAt?: Date;
  storyPoints?: number;
  sprint?: string;
  checklist?: ChecklistItem[];
  attachments?: Attachment[];
  timeline?: TimelineEvent[];
  tags?: string[];
  client_cnpj?: string;
  client_email?: string;
  client_name?: string;
  creatorName?: string;
  creatorEmail?: string;
}