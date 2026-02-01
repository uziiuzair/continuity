"use client";

import { Fragment } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Label,
} from "@headlessui/react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  id: string;
  name: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function Select({
  value,
  onChange,
  options,
  label,
  placeholder = "Select an option",
  disabled = false,
  className,
}: SelectProps) {
  const selectedOption = options.find((opt) => opt.id === value);

  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <div className={cn("relative", className)}>
        {label && (
          <Label className="block text-sm font-medium text-(--text-primary) mb-1.5">
            {label}
          </Label>
        )}

        <ListboxButton
          className={cn(
            "relative w-full px-3 py-2 text-sm text-left border border-(--border-color) rounded-md bg-(--background-color) text-(--text-primary)",
            "focus:outline-none focus:ring-2 focus:ring-(--accent-color) focus:border-transparent",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "cursor-pointer"
          )}
        >
          <span
            className={cn(
              "block truncate",
              !selectedOption && "text-(--text-secondary)/50"
            )}
          >
            {selectedOption?.name || placeholder}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon />
          </span>
        </ListboxButton>

        <ListboxOptions
          anchor="bottom"
          transition
          className={cn(
            "absolute z-50 mt-1 w-[var(--button-width)] overflow-auto rounded-md bg-(--background-color) py-1 text-sm shadow-lg ring-1 ring-black/5",
            "focus:outline-none",
            "origin-top transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
          )}
        >
          {options.map((option) => (
            <ListboxOption
              key={option.id}
              value={option.id}
              disabled={option.disabled}
              as={Fragment}
            >
              {({ focus, selected, disabled }) => (
                <div
                  className={cn(
                    "relative cursor-pointer select-none py-2 pl-3 pr-9",
                    focus && "bg-[#f5f4ed]",
                    selected && "font-medium",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span className={cn("block truncate text-(--text-primary)")}>
                    {option.name}
                  </span>
                  {selected && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-(--accent-color)">
                      <CheckIcon />
                    </span>
                  )}
                </div>
              )}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}

function ChevronUpDownIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="size-4 text-(--text-secondary)"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="size-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m4.5 12.75 6 6 9-13.5"
      />
    </svg>
  );
}
