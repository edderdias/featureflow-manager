import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Search, X, Filter } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DemandPriority, DemandStatus, DemandType, StackType } from "@/types/demand";

interface DemandFiltersProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  filterPriority: string;
  setFilterPriority: (val: string) => void;
  filterStatus: string;
  setFilterStatus: (val: string) => void;
  filterType: string;
  setFilterType: (val: string) => void;
  filterStack: string;
  setFilterStack: (val: string) => void;
  filterTag: string;
  setFilterTag: (val: string) => void;
  filterResponsible: string;
  setFilterResponsible: (val: string) => void;
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  dueDateRange: DateRange | undefined;
  setDueDateRange: (range: DateRange | undefined) => void;
  availableTags: string[];
  availableResponsibles: string[];
  showStatusFilter?: boolean;
}

export const DemandFilters = ({
  searchTerm, setSearchTerm,
  filterPriority, setFilterPriority,
  filterStatus, setFilterStatus,
  filterType, setFilterType,
  filterStack, setFilterStack,
  filterTag, setFilterTag,
  filterResponsible, setFilterResponsible,
  dateRange, setDateRange,
  dueDateRange, setDueDateRange,
  availableTags,
  availableResponsibles,
  showStatusFilter = true
}: DemandFiltersProps) => {
  
  const clearFilters = () => {
    setSearchTerm("");
    setFilterPriority("all");
    setFilterStatus("all");
    setFilterType("all");
    setFilterStack("all");
    setFilterTag("all");
    setFilterResponsible("all");
    setDateRange(undefined);
    setDueDateRange(undefined);
  };

  const hasActiveFilters = searchTerm !== "" || filterPriority !== "all" || 
    (showStatusFilter && filterStatus !== "all") || filterType !== "all" || 
    filterStack !== "all" || filterTag !== "all" || filterResponsible !== "all" || 
    dateRange !== undefined || dueDateRange !== undefined;

  return (
    <div className="space-y-4 bg-card p-4 rounded-lg border shadow-sm">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por título ou descrição..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="pl-10" 
          />
        </div>
        <div className="flex gap-2">
          <DateRangePicker 
            dateRange={dateRange} 
            onDateRangeChange={setDateRange} 
            className="w-full md:w-auto"
          />
          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters} className="gap-2">
              <X className="h-4 w-4" /> Limpar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Prioridade</label>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showStatusFilter && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Status</label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="todo">A Fazer</SelectItem>
                <SelectItem value="in-progress">Em Andamento</SelectItem>
                <SelectItem value="testing">Em Teste</SelectItem>
                <SelectItem value="done">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Tipo</label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="feature">Novo Recurso</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="repair">Reparo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Stack</label>
          <Select value={filterStack} onValueChange={setFilterStack}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Stack" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="backend">BackEnd</SelectItem>
              <SelectItem value="frontend">FrontEnd</SelectItem>
              <SelectItem value="apps">Apps</SelectItem>
              <SelectItem value="none">Sem Stack</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Etiqueta</label>
          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Etiqueta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {availableTags.map(tag => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Responsável</label>
          <Select value={filterResponsible} onValueChange={setFilterResponsible}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {availableResponsibles.map(res => (
                <SelectItem key={res} value={res}>{res}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 pt-2 border-t border-border/50">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <label className="text-[10px] font-bold uppercase text-muted-foreground whitespace-nowrap">Vencimento:</label>
          <DateRangePicker 
            dateRange={dueDateRange} 
            onDateRangeChange={setDueDateRange} 
            className="w-full md:w-[280px]"
          />
        </div>
      </div>
    </div>
  );
};