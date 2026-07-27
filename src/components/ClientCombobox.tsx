import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useClients, useAddClient, useUpdateClient, useDeleteClient } from "@/hooks/useClients";
import { cn } from "@/lib/utils";

interface ClientComboboxProps {
  value: string;
  onChange: (name: string) => void;
}

export function ClientCombobox({ value, onChange }: ClientComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: clients } = useClients();
  const addClient = useAddClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  const resetInline = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery("");
      resetInline();
    }
  };

  const trimmed = query.trim();
  const filtered = (clients ?? []).filter((c) =>
    c.name.toLowerCase().includes(trimmed.toLowerCase())
  );
  const exactMatch = (clients ?? []).some(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase()
  );

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditValue(name);
  };

  const saveEdit = (id: string, oldName: string) => {
    const newName = editValue.trim();
    if (!newName || newName === oldName) {
      resetInline();
      return;
    }
    updateClient.mutate({ id, oldName, newName });
    if (value === oldName) onChange(newName);
    resetInline();
  };

  const handleDelete = (id: string, name: string) => {
    deleteClient.mutate(id);
    if (value === name) onChange("");
  };

  const handleCreate = () => {
    if (!trimmed) return;
    addClient.mutate(trimmed);
    onChange(trimmed);
    setQuery("");
    handleOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full min-w-0 justify-between font-normal"
          >
            <span className={cn("truncate", !value && "text-muted-foreground")}>
              {value || "Selecione"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            ref={searchInputRef}
            placeholder="Digite para buscar ou criar"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>Nenhum cliente.</CommandEmpty>
            {!trimmed && (
              <>
                <CommandGroup>
                  <CommandItem
                    value="__new_client__"
                    onSelect={() => searchInputRef.current?.focus()}
                    className="font-medium text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4 shrink-0" />
                    <span>Novo cliente</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      digite o nome
                    </span>
                  </CommandItem>
                </CommandGroup>
                {filtered.length > 0 && <CommandSeparator />}
              </>
            )}
            <CommandGroup>
              {filtered.map((c) =>
                editingId === c.id ? (
                  <div key={c.id} className="flex items-center gap-1 px-1 py-1">
                    <Input
                      ref={editInputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.stopPropagation();
                          saveEdit(c.id, c.name);
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          e.stopPropagation();
                          resetInline();
                        }
                      }}
                      className="h-8"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => saveEdit(c.id, c.name)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={resetInline}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <CommandItem
                    key={c.id}
                    value={c.id}
                    onSelect={() => {
                      onChange(c.name);
                      handleOpenChange(false);
                    }}
                    className="group"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === c.name ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{c.name}</span>
                    <div className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 group-data-[selected=true]:opacity-100">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onPointerDown={(e) => e.preventDefault()}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(c.id, c.name);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onPointerDown={(e) => e.preventDefault()}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(c.id, c.name);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CommandItem>
                )
              )}
              {trimmed && !exactMatch && (
                <CommandItem
                  value={`create-${trimmed}`}
                  onSelect={handleCreate}
                  className="font-medium text-primary"
                >
                  <Plus className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">Criar "{trimmed}"</span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
