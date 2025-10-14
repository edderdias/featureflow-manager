import React, { useState, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

// Lazy load UserProfileDialog
const UserProfileDialog = React.lazy(() => import("./UserProfileDialog").then(module => ({ default: module.UserProfileDialog })));

export function UserNav() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
      toast.error("Erro ao sair do sistema.");
    } else {
      toast.success("Você saiu do sistema.");
      navigate("/login");
    }
  };

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const firstInitial = firstName ? firstName.charAt(0) : "";
    const lastInitial = lastName ? lastName.charAt(0) : "";
    return (firstInitial + lastInitial).toUpperCase() || (user?.email ? user.email.charAt(0).toUpperCase() : "U");
  };

  // Fetch user profile to get first_name, last_name, avatar_url
  const { data: profileData } = useQuery({
    queryKey: ["profiles", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const displayName = profileData?.first_name || user?.email || "Usuário";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profileData?.avatar_url || ""} alt={displayName} />
              <AvatarFallback>{getInitials(profileData?.first_name, profileData?.last_name)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setIsProfileDialogOpen(true)}>
              <User className="mr-2 h-4 w-4" />
              <span>Editar Perfil</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sair do Sistema</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {isProfileDialogOpen && (
        <Suspense fallback={null}> {/* Fallback pode ser um spinner ou null */}
          <UserProfileDialog
            open={isProfileDialogOpen}
            onOpenChange={setIsProfileDialogOpen}
          />
        </Suspense>
      )}
    </>
  );
}