import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, ListTodo, LayoutGrid, BarChart3, Tags, Users, Settings } from "lucide-react";
import { useAuth } from "@/integrations/supabase/auth";
import { UserNav } from "./UserNav"; // Importar UserNav

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
];

export const Navigation = () => {
  const location = useLocation();
  const { session, isLoading } = useAuth();

  if (isLoading || !session) {
    return null;
  }

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="ToqDesk Logo" className="h-8 w-8" />
            <span className="text-xl font-bold">ToqDesk</span>
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
            <UserNav />
          </div>
        </div>
      </div>
    </nav>
  );
};