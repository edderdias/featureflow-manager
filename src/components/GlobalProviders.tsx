import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

interface GlobalProvidersProps {
  children: React.ReactNode;
}

const GlobalProviders = ({ children }: GlobalProvidersProps) => {
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {children}
    </TooltipProvider>
  );
};

export default GlobalProviders;