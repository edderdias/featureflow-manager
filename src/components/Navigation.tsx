import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, ListTodo, LayoutGrid, BarChart3, Tags, Users } from "lucide-react"; // Importando o ícone Users
import { useAuth } from "@/integrations/supabase/auth"; // Importando useAuth para verificar o papel do usuário

const navItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    adminOnly: false,
  },
  {
    title: "Lista de Demandas",
    href: "/demands",
    icon: ListTodo,
    adminOnly: false,
  },
  {
    title: "Board Kanban",
    href: "/kanban",
    icon: LayoutGrid,
    adminOnly: false,
  },
  {
    title: "Relatórios",
    href: "/reports",
    icon: BarChart3,
    adminOnly: false,
  },
  {
    title: "Gerenciar Tags",
    href: "/tags",
    icon: Tags,
    adminOnly: false,
  },
  {
    title: "Gerenciar Usuários", // Novo item de navegação
    href: "/users",
    icon: Users, // Ícone para usuários
    adminOnly: true, // Apenas administradores podem ver
  },
];

export const Navigation = () => {
  const location = useLocation();
  const { userRole, isLoading } = useAuth();

  if (isLoading) {
    return null; // Ou um spinner de carregamento
  }

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent" />
            <span className="text-xl font-bold">DemandFlow</span>
          </div>
          
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              // Renderiza o item apenas se não for adminOnly ou se o usuário for admin
              if (item.adminOnly && userRole !== "admin") {
                return null;
              }
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};