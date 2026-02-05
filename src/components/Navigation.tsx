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
    roles: ["user", "technician", "admin"],
  },
  {
    title: "Lista de Demandas",
    href: "/demands",
    icon: ListTodo,
    roles: ["user", "technician", "admin"],
  },
  {
    title: "Board Kanban",
    href: "/kanban",
    icon: LayoutGrid,
    roles: ["user", "technician", "admin"],
  },
  {
    title: "Relatórios",
    href: "/reports",
    icon: BarChart3,
    roles: ["technician", "admin"], // Apenas técnicos e administradores
  },
  {
    title: "Gerenciar Tags",
    href: "/tags",
    icon: Tags,
    roles: ["technician", "admin"], // Apenas técnicos e administradores
  },
  {
    title: "Gerenciar Usuários",
    href: "/users",
    icon: Users,
    roles: ["admin"], // Apenas administradores
  },
];

export const Navigation = () => {
  const location = useLocation();
  const { session, isLoading, userRole } = useAuth();

  if (isLoading || !session) {
    return null;
  }

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="ToqDesk Logo" className="h-10 w-10" /> {/* Aumentado de h-8 w-8 para h-10 w-10 */}
            <span className="text-xl font-bold">ToqDesk</span>
          </div>
          
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              // Renderiza o item apenas se o papel do usuário estiver incluído nos papéis permitidos
              if (userRole && item.roles.includes(userRole)) {
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
              }
              return null;
            })}
            <UserNav />
          </div>
        </div>
      </div>
    </nav>
  );
};