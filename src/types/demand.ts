export type DemandType = "feature" | "bug" | "repair";
export type DemandPriority = "low" | "medium" | "high";
export type DemandStatus = "todo" | "in-progress" | "testing" | "done";
export type SystemType = "toqweb" | "gmax" | "toqblend" | "t5" | "t10" | "ecopdv" | "toqped" | "toqvenda";

export interface Demand {
  id: string;
  title: string;
  description: string;
  type: DemandType;
  priority: DemandPriority;
  status: DemandStatus;
  system: SystemType;
  responsible: string;
  createdAt: Date;
  updatedAt: Date;
}
