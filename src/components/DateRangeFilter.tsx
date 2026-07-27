import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarRange } from "lucide-react";
import { format, subDays, startOfMonth, parseISO } from "date-fns";

interface DateRangeFilterProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const br = (s: string) => format(parseISO(s), "dd/MM");

export function DateRangeFilter({ from, to, onChange }: DateRangeFilterProps) {
  const active = from !== "" && to !== "";

  const presets: { label: string; apply: () => void }[] = [
    { label: "Tudo", apply: () => onChange("", "") },
    {
      label: "Hoje",
      apply: () => {
        const today = iso(new Date());
        onChange(today, today);
      },
    },
    {
      label: "Ontem",
      apply: () => {
        const y = iso(subDays(new Date(), 1));
        onChange(y, y);
      },
    },
    {
      label: "7 dias",
      apply: () => {
        const today = new Date();
        onChange(iso(subDays(today, 6)), iso(today));
      },
    },
    {
      label: "30 dias",
      apply: () => {
        const today = new Date();
        onChange(iso(subDays(today, 29)), iso(today));
      },
    },
    {
      label: "Este mês",
      apply: () => {
        const today = new Date();
        onChange(iso(startOfMonth(today)), iso(today));
      },
    },
  ];

  return (
    <Card className={active ? "border-primary/40" : undefined}>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5 sm:max-w-[160px]">
          <label className="text-xs font-medium text-muted-foreground">De</label>
          <Input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => onChange(e.target.value, to)}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5 sm:max-w-[160px]">
          <label className="text-xs font-medium text-muted-foreground">Até</label>
          <Input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => onChange(from, e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 sm:ml-auto sm:items-center">
          {active && (
            <span className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <CalendarRange className="h-3.5 w-3.5" />
              {br(from)} – {br(to)}
            </span>
          )}
          {presets.map((p) => (
            <Button
              key={p.label}
              type="button"
              variant="secondary"
              size="sm"
              onClick={p.apply}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
