import { useState } from "react";
import { mockDemands } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { typeLabels, priorityLabels, statusLabels, getPriorityColor, getTypeColor, getStatusColor } from "@/lib/demandUtils";

const TableView = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredDemands = mockDemands
    .filter((demand) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        demand.title.toLowerCase().includes(searchLower) ||
        demand.description.toLowerCase().includes(searchLower) ||
        demand.responsible.toLowerCase().includes(searchLower) ||
        demand.system.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      let aValue: any = a[sortField as keyof typeof a];
      let bValue: any = b[sortField as keyof typeof b];

      if (aValue instanceof Date) aValue = aValue.getTime();
      if (bValue instanceof Date) bValue = bValue.getTime();

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Visualização em Tabela</h1>
          <p className="text-muted-foreground">Todas as demandas em formato de tabela</p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar demandas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort("title")} className="h-8 px-2">
                    Título
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort("type")} className="h-8 px-2">
                    Tipo
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort("priority")} className="h-8 px-2">
                    Prioridade
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort("status")} className="h-8 px-2">
                    Status
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort("system")} className="h-8 px-2">
                    Sistema
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort("responsible")} className="h-8 px-2">
                    Responsável
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort("createdAt")} className="h-8 px-2">
                    Criado em
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDemands.map((demand) => (
                <TableRow key={demand.id}>
                  <TableCell className="font-medium">{demand.title}</TableCell>
                  <TableCell>
                    <Badge variant={getTypeColor(demand.type) as any}>{typeLabels[demand.type]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPriorityColor(demand.priority) as any}>{priorityLabels[demand.priority]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(demand.status) as any}>{statusLabels[demand.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{demand.system.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell>{demand.responsible}</TableCell>
                  <TableCell>{format(demand.createdAt, "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

export default TableView;
