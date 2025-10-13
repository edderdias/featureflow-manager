import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, ListTodo, LayoutGrid, BarChart3, Tags, Users, Settings, UserPlus } from "lucide-react";
import { useAuth } from "@/integrations/supabase/auth";

const navItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Lista de Demandas",
    href: "/demands",
    icon: ListTodo,
  },
  {
    title: "Board Kanban",
    href: "/kanban",
    icon: LayoutGrid,
  },
  {
    title: "Relatórios",
    href: "/reports",
    icon: BarChart3,
  },
  {
    title: "Gerenciar Tags",
    href: "/tags",
    icon: Tags,
  },
  {
    title: "Gerenciar Usuários",
    href: "/users",
    icon: Users,
  },
  {
    title: "Convidar Usuário",
    href: "/invite-user",
    icon: UserPlus,
  },
];

export const Navigation = () => {
  const location = useLocation();
  const { session, isLoading } = useAuth(); // Ainda precisamos do session para saber se o usuário está logado

  if (isLoading || !session) { // Se não estiver carregando ou não houver sessão, não renderiza a navegação
    return null;
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