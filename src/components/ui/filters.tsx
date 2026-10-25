"use client";

import type { ReactNode } from "react";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, Plus, Search, X } from "lucide-react";
import { memo, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { geistShadowBorderClassName, geistShadowBorderHoverClassName } from "@/components/ui/geist-input";
import { cn } from "@/lib/utils";

// ---------- Types ----------

export interface FilterOption<T = unknown> {
  icon?: ReactNode;
  label: string;
  value: T;
}

export interface FilterOperator {
  label: string;
  value: string;
}

export interface FilterFieldConfig<T = unknown> {
  className?: string;
  defaultOperator?: string;
  icon?: ReactNode;
  key: string;
  label: string;
  operators?: FilterOperator[];
  options?: FilterOption<T>[];
  placeholder?: string;
  type?: "multiselect" | "select" | "text";
}

export interface FilterFieldGroup<T = unknown> {
  fields: FilterFieldConfig<T>[];
  group?: string;
}

export type FilterFieldsConfig<T = unknown> = FilterFieldConfig<T>[] | FilterFieldGroup<T>[];

export interface Filter<T = unknown> {
  field: string;
  id: string;
  operator: string;
  values: T[];
}

export function createFilter<T = unknown>(field: string, operator?: string, values: T[] = []): Filter<T> {
  return {
    field,
    id: `${String(Date.now())}-${Math.random().toString(36).slice(2, 9)}`,
    operator: operator ?? "is",
    values,
  };
}

// ---------- Default operators ----------

export const DEFAULT_OPERATORS: Record<string, FilterOperator[]> = {
  multiselect: [
    { label: "is any of", value: "is_any_of" },
    { label: "is not any of", value: "is_not_any_of" },
    { label: "includes all", value: "includes_all" },
    { label: "excludes all", value: "excludes_all" },
    { label: "is empty", value: "empty" },
    { label: "is not empty", value: "not_empty" },
  ],
  select: [
    { label: "is", value: "is" },
    { label: "is not", value: "is_not" },
    { label: "is empty", value: "empty" },
    { label: "is not empty", value: "not_empty" },
  ],
  text: [
    { label: "contains", value: "contains" },
    { label: "does not contain", value: "not_contains" },
    { label: "starts with", value: "starts_with" },
    { label: "ends with", value: "ends_with" },
    { label: "is exactly", value: "is" },
    { label: "is empty", value: "empty" },
    { label: "is not empty", value: "not_empty" },
  ],
};

const isFieldGroup = <T,>(item: FilterFieldConfig<T> | FilterFieldGroup<T>): item is FilterFieldGroup<T> =>
  "fields" in item && Array.isArray(item.fields);

const flattenFields = <T,>(fields: FilterFieldsConfig<T>): FilterFieldConfig<T>[] =>
  fields.reduce<FilterFieldConfig<T>[]>((acc, item) => {
    if (isFieldGroup(item)) return [...acc, ...item.fields];
    return [...acc, item];
  }, []);

const getFieldsMap = <T,>(fields: FilterFieldsConfig<T>): Record<string, FilterFieldConfig<T> | undefined> => {
  const flat = flattenFields(fields);
  return flat.reduce<Record<string, FilterFieldConfig<T> | undefined>>((acc, field) => {
    acc[field.key] = field;
    return acc;
  }, {});
};

const getOperatorsForField = (field: FilterFieldConfig): FilterOperator[] =>
  field.operators ?? DEFAULT_OPERATORS[field.type ?? "select"];

const formatOperator = (operator?: string) => (operator ?? "").replaceAll("_", " ");

// ---------- Search input used inside dropdown menus ----------

const menuInputClassName = cn(
  "h-8 rounded-none border-0 bg-transparent px-2 text-sm shadow-none outline-none",
  "placeholder:text-muted-foreground focus-visible:ring-0",
);

// ---------- Option list rendered inside dropdown / submenu content ----------

interface OptionsMenuProps<T> {
  field: FilterFieldConfig<T>;
  isMultiSelect: boolean;
  onToggle: (value: T, isSelected: boolean) => void;
  values: T[];
}

function OptionsMenuInner<T>({ field, isMultiSelect, onToggle, values }: OptionsMenuProps<T>) {
  const [searchInput, setSearchInput] = useState("");

  const filtered = useMemo(() => {
    const query = searchInput.trim().toLowerCase();
    return (field.options ?? []).filter((option) => !query || option.label.toLowerCase().includes(query));
  }, [field.options, searchInput]);

  return (
    <div className="flex flex-col">
      <input
        className={menuInputClassName}
        onChange={(e) => {
          setSearchInput(e.target.value);
        }}
        placeholder={`Search ${field.label.toLowerCase()}...`}
        value={searchInput}
      />
      <DropdownMenuSeparator />
      <div className="relative flex max-h-full">
        <div className="flex max-h-[min(var(--radix-dropdown-menu-content-available-height),20rem)] w-full flex-col overflow-y-auto overscroll-contain">
          {filtered.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">No results found.</div>
          ) : (
            filtered.map((option) => {
              const isSelected = values.includes(option.value);
              return (
                <DropdownMenuItem
                  className="data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  key={String(option.value)}
                  onClick={() => {
                    onToggle(option.value, isSelected);
                  }}
                  onSelect={(e) => {
                    if (isMultiSelect) e.preventDefault();
                  }}
                >
                  {option.icon}
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    {isSelected ? <Check className="size-4 text-primary" /> : null}
                  </span>
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

const OptionsMenu = memo(OptionsMenuInner) as typeof OptionsMenuInner;

// ---------- Operator dropdown (inside an active filter chip) ----------

interface FilterOperatorDropdownProps {
  field: FilterFieldConfig;
  onOperatorChange: (operator: string) => void;
  operator: string;
}

function FilterOperatorDropdownInner({ field, onOperatorChange, operator }: FilterOperatorDropdownProps) {
  const operators = useMemo(() => getOperatorsForField(field), [field]);
  const label = operators.find((op) => op.value === operator)?.label ?? formatOperator(operator);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1 border-l border-border bg-transparent px-2.5 text-[13px] whitespace-nowrap text-muted-foreground transition-colors outline-none hover:bg-[#fafafa] hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground dark:hover:bg-accent"
          type="button"
        >
          {label}
          <ChevronDown className="size-3.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-fit min-w-[8rem]">
        {operators.map((op) => (
          <DropdownMenuItem
            className="flex items-center justify-between gap-4 data-highlighted:bg-accent data-highlighted:text-accent-foreground"
            key={op.value}
            onClick={() => {
              onOperatorChange(op.value);
            }}
          >
            <span>{op.label}</span>
            <Check className={cn("text-primary", op.value === operator ? "opacity-100" : "opacity-0")} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const FilterOperatorDropdown = memo(FilterOperatorDropdownInner);

// ---------- Value selector (inside an active filter chip) ----------

interface FilterValueSelectorProps<T> {
  field: FilterFieldConfig<T>;
  onValuesChange: (values: T[]) => void;
  values: T[];
}

function FilterValueSelectorInner<T>({ field, onValuesChange, values }: FilterValueSelectorProps<T>) {
  const isMultiSelect = field.type === "multiselect";

  const selectedOptions = useMemo(
    () => (field.options ?? []).filter((option) => values.includes(option.value)),
    [field.options, values],
  );

  if (field.type === "text") {
    return (
      <input
        className="h-full w-28 border-l border-border bg-transparent px-2.5 text-[13px] outline-none placeholder:text-muted-foreground focus-visible:bg-accent/40"
        onChange={(e) => {
          onValuesChange([e.target.value] as T[]);
        }}
        placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}...`}
        value={String(values[0] ?? "")}
      />
    );
  }

  const displayLabel = (() => {
    if (selectedOptions.length === 1) return selectedOptions[0].label;
    if (selectedOptions.length > 1) return `${String(selectedOptions.length)} selected`;
    return "Select...";
  })();

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex max-w-40 items-center gap-1 border-l border-border bg-transparent px-2.5 text-[13px] whitespace-nowrap text-foreground transition-colors outline-none hover:bg-[#fafafa] hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground dark:hover:bg-accent",
            selectedOptions.length === 0 && "text-muted-foreground",
          )}
          type="button"
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px] px-0">
        <OptionsMenu
          field={field}
          isMultiSelect={isMultiSelect}
          onToggle={(value, isSelected) => {
            const next = isSelected
              ? values.filter((v) => v !== value)
              : isMultiSelect
                ? [...values, value]
                : [value];
            onValuesChange(next);
          }}
          values={values}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const FilterValueSelector = memo(FilterValueSelectorInner) as typeof FilterValueSelectorInner;

// ---------- Active filter chip ----------

interface FilterChipProps<T> {
  field: FilterFieldConfig<T>;
  filter: Filter<T>;
  onRemove: (filterId: string) => void;
  onUpdate: (filterId: string, updates: Partial<Filter<T>>) => void;
}

function FilterChipInner<T>({ field, filter, onRemove, onUpdate }: FilterChipProps<T>) {
  const showValue = filter.operator !== "empty" && filter.operator !== "not_empty";

  return (
    <div
      className={cn(
        "inline-flex h-9 w-full items-stretch overflow-hidden rounded-md bg-white text-[13px] dark:bg-zinc-950",
        geistShadowBorderClassName,
        geistShadowBorderHoverClassName,
      )}
    >
      <div className="flex items-center gap-1.5 px-2.5 font-medium whitespace-nowrap text-foreground">
        {field.icon}
        {field.label}
      </div>
      <FilterOperatorDropdown
        field={field}
        onOperatorChange={(operator) => {
          onUpdate(filter.id, {
            operator,
            values: operator === "empty" || operator === "not_empty" ? ([] as T[]) : filter.values,
          });
        }}
        operator={filter.operator}
      />
      {showValue ? (
        <FilterValueSelector
          field={field}
          onValuesChange={(values) => {
            onUpdate(filter.id, { values });
          }}
          values={filter.values}
        />
      ) : null}
      <button
        aria-label="Remove filter"
        className="flex w-7 items-center justify-center border-l border-border text-muted-foreground transition-colors outline-none hover:bg-[#fafafa] hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground dark:hover:bg-accent"
        onClick={() => {
          onRemove(filter.id);
        }}
        type="button"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

const FilterChip = memo(FilterChipInner) as typeof FilterChipInner;

// ---------- Main Filters component ----------

interface FiltersProps<T = unknown> {
  allowMultiple?: boolean;
  className?: string;
  fields: FilterFieldsConfig<T>;
  filters: Filter<T>[];
  onChange: (filters: Filter<T>[]) => void;
  trigger?: ReactNode;
}

export function Filters<T = unknown>({ allowMultiple = false, className, fields, filters, onChange, trigger }: FiltersProps<T>) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [openSubMenu, setOpenSubMenu] = useState<null | string>(null);
  const [sessionFilterIds, setSessionFilterIds] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const rootId = useId();

  const filtersRef = useRef(filters);
  useLayoutEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const fieldsMap = useMemo(() => getFieldsMap(fields), [fields]);

  const selectableFields = useMemo(() => {
    const flat = flattenFields(fields);
    if (allowMultiple) return flat;
    const activeFields = new Set(filters.map((filter) => filter.field));
    return flat.filter((field) => !activeFields.has(field.key));
  }, [allowMultiple, fields, filters]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
    return () => {
      clearTimeout(timer);
    };
  }, [open]);

  const filteredFields = useMemo(() => {
    const query = searchInput.trim().toLowerCase();
    return selectableFields.filter((field) => !query || field.label.toLowerCase().includes(query));
  }, [searchInput, selectableFields]);

  const updateFilter = useCallback(
    (filterId: string, updates: Partial<Filter<T>>) => {
      onChange(filtersRef.current.map((f) => (f.id === filterId ? { ...f, ...updates } : f)));
    },
    [onChange],
  );

  const removeFilter = useCallback(
    (filterId: string) => {
      onChange(filtersRef.current.filter((f) => f.id !== filterId));
    },
    [onChange],
  );

  const addFilter = useCallback(
    (fieldKey: string) => {
      const field = fieldsMap[fieldKey];
      if (!field) return;
      const operator = field.defaultOperator ?? (field.type === "multiselect" ? "is_any_of" : field.type === "text" ? "contains" : "is");
      const values: T[] = field.type === "text" ? ([""] as unknown as T[]) : [];
      onChange([...filtersRef.current, createFilter<T>(fieldKey, operator, values)]);
      setOpen(false);
      setSearchInput("");
    },
    [fieldsMap, onChange],
  );

  const toggleInSubmenu = useCallback(
    (field: FilterFieldConfig<T>, value: T, isSelected: boolean) => {
      const fieldKey = field.key;
      const sessionFilter = sessionFilterIds[fieldKey] ? filtersRef.current.find((f) => f.id === sessionFilterIds[fieldKey]) : null;
      const current = sessionFilter?.values ?? ([] as T[]);
      const next = isSelected ? current.filter((v) => v !== value) : [...current, value];

      if (sessionFilter) {
        if (next.length === 0) {
          onChange(filtersRef.current.filter((f) => f.id !== sessionFilter.id));
          setSessionFilterIds((prev) => ({ ...prev, [fieldKey]: "" }));
        } else {
          onChange(filtersRef.current.map((f) => (f.id === sessionFilter.id ? { ...f, values: next } : f)));
        }
      } else {
        const newFilter = createFilter(fieldKey, field.defaultOperator ?? "is_any_of", next);
        onChange([...filtersRef.current, newFilter]);
        setSessionFilterIds((prev) => ({ ...prev, [fieldKey]: newFilter.id }));
      }
    },
    [onChange, sessionFilterIds],
  );

  const handleSubmenuToggle = useCallback(
    (field: FilterFieldConfig<T>, value: T, isSelected: boolean) => {
      if (field.type === "multiselect") {
        toggleInSubmenu(field, value, isSelected);
      } else {
        onChange([...filtersRef.current, createFilter<T>(field.key, field.defaultOperator ?? "is", [value] as T[])]);
        setOpen(false);
      }
    },
    [onChange, toggleInSubmenu],
  );

  const handleRootKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (filteredFields.length > 0) {
          setHighlightedIndex((prev) => (prev < filteredFields.length - 1 ? prev + 1 : 0));
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (filteredFields.length > 0) {
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredFields.length - 1));
        }
      } else if (e.key === "Enter" && highlightedIndex >= 0) {
        e.preventDefault();
        const field = filteredFields[highlightedIndex] as FilterFieldConfig<T> | undefined;
        if (!field) return;
        const hasSubMenu = (field.type === "select" || field.type === "multiselect") && (field.options?.length ?? 0) > 0;
        if (hasSubMenu) {
          if (openSubMenu === field.key) {
            setOpenSubMenu(null);
          } else {
            setOpenSubMenu(field.key);
          }
        } else {
          addFilter(field.key);
        }
      } else if (e.key === "Escape") {
        setOpen(false);
      }
      e.stopPropagation();
    },
    [addFilter, filteredFields, highlightedIndex, openSubMenu],
  );

  return (
    <div className={cn("flex flex-wrap items-center gap-2.5", className)}>
      {selectableFields.length > 0 ? (
        <DropdownMenu
          modal={false}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) {
              setSearchInput("");
              setOpenSubMenu(null);
              setSessionFilterIds({});
            }
          }}
          open={open}
        >
          <DropdownMenuTrigger asChild>
            {trigger ?? (
              <Button size="sm" variant="outline">
                <Plus className="size-4" />
                Filter
              </Button>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[220px]">
            <div className="relative">
              <input
                className={menuInputClassName}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setHighlightedIndex(-1);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                onKeyDown={handleRootKeyDown}
                placeholder="Filter..."
                ref={inputRef}
                value={searchInput}
              />
              <Search className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
            <DropdownMenuSeparator />
            <div className="relative flex max-h-full">
              <div
                className="flex max-h-[min(var(--radix-dropdown-menu-content-available-height),24rem)] w-full flex-col overflow-y-auto overscroll-contain"
                id={`${rootId}-listbox`}
                role="listbox"
              >
                {filteredFields.length === 0 ? (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">No filters found.</div>
                ) : (
                  filteredFields.map((field, index) => {
                    const hasSubMenu = (field.type === "select" || field.type === "multiselect") && (field.options?.length ?? 0) > 0;
                    const isHighlighted = highlightedIndex === index;

                    if (hasSubMenu) {
                      const fieldKey = field.key;
                      const isMultiSelect = field.type === "multiselect";
                      const sessionFilter = sessionFilterIds[fieldKey] ? filters.find((f) => f.id === sessionFilterIds[fieldKey]) : null;
                      const currentValues = sessionFilter?.values ?? [];

                      return (
                        <DropdownMenuSub
                          key={fieldKey}
                          onOpenChange={(nextOpen) => {
                            if (nextOpen) {
                              setOpenSubMenu(fieldKey);
                            } else if (openSubMenu === fieldKey) {
                              setOpenSubMenu(null);
                            }
                          }}
                          open={openSubMenu === fieldKey}
                        >
                          <DropdownMenuSubTrigger
                            className="data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                            data-highlighted={isHighlighted || undefined}
                            id={`${rootId}-item-${String(index)}`}
                            onMouseEnter={() => {
                              setHighlightedIndex(index);
                            }}
                            role="option"
                          >
                            {field.icon}
                            <span>{field.label}</span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="w-[220px]">
                            <OptionsMenu
                              field={field}
                              isMultiSelect={isMultiSelect}
                              onToggle={(value, isSelected) => {
                                handleSubmenuToggle(field, value, isSelected);
                              }}
                              values={currentValues}
                            />
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      );
                    }

                    return (
                      <DropdownMenuItem
                        className="data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                        data-highlighted={isHighlighted || undefined}
                        id={`${rootId}-item-${String(index)}`}
                        key={field.key}
                        onClick={() => {
                          addFilter(field.key);
                        }}
                        onMouseEnter={() => {
                          setHighlightedIndex(index);
                        }}
                        role="option"
                      >
                        {field.icon}
                        <span>{field.label}</span>
                      </DropdownMenuItem>
                    );
                  })
                )}
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <AnimatePresence initial={false}>
        {filters.map((filter) => {
          const field: FilterFieldConfig<T> | undefined = fieldsMap[filter.field];
          if (!field) return null;
          return (
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className="min-w-0"
              exit={{ opacity: 0, width: 0 }}
              initial={{ opacity: 0, x: -12 }}
              key={filter.id}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: "easeInOut" }}
            >
              <FilterChip field={field} filter={filter} onRemove={removeFilter} onUpdate={updateFilter} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
