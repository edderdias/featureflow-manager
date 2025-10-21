import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ptBR } from "date-fns/locale";

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  dateRange?: DateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
  align?: "start" | "center" | "end";
  className?: string;
}

export function DateRangePicker({
  className,
  dateRange,
  onDateRangeChange,
  align = "end",
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleClear = () => {
    onDateRangeChange(undefined);
    setOpen(false);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full md:w-[300px] justify-start text-left font-normal",
              !dateRange?.from && !dateRange?.to && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                  {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                </>
              ) : (
                format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
              )
            ) : (
              <span>Selecione um período</span>
            )}
            {dateRange?.from && (
              <X className="ml-auto h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground" onClick={(e) => {
                e.stopPropagation(); // Impede que o popover feche imediatamente
                handleClear();
              }} />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={onDateRangeChange}
            numberOfMonths={2}
            locale={ptBR}
          />
          {dateRange?.from && (
            <div className="p-2 border-t">
              <Button variant="ghost" className="w-full" onClick={handleClear}>
                Limpar Seleção
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}