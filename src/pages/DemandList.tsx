import { useState } from "react";
import { DemandCard } from "@/components/DemandCard";
import { mockDemands } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { DemandPriority, DemandStatus, DemandType } from "@/types/demand";

const DemandList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const filteredDemands = mockDemands.filter((demand) => {
    const matchesSearch =
      demand.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demand.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demand.responsible.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPriority = filterPriority === "all" || demand.priority === filterPriority;
    const matchesStatus = filterStatus === "all" || demand.status === filterStatus;
    const matchesType = filterType === "all" || demand.type === filterType;

    return matchesSearch && matchesPriority && matchesStatus && matchesType;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Lista de Demandas</h1>
            <p className="text-muted-foreground">
              Gerencie todas as suas demandas em um só lugar
            </p>
          </div>
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Nova Demanda
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar demandas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Prioridades</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="todo">A Fazer</SelectItem>
                <SelectItem value="in-progress">Em Andamento</SelectItem>
                <SelectItem value="testing">Em Teste</SelectItem>
                <SelectItem value="done">Concluído</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="feature">Novo Recurso</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="repair">Reparo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Demands Grid */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Mostrando {filteredDemands.length} de {mockDemands.length} demandas
          </p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDemands.map((demand) => (
            <DemandCard key={demand.id} demand={demand} onEdit={() => {}} onDelete={() => {}} />
          ))}
        </div>

        {filteredDemands.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhuma demanda encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DemandList;
