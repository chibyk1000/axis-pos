"use client";

import * as React from "react";
import ReactSelect, { Props as ReactSelectProps, GroupBase, StylesConfig } from "react-select";
import { cn } from "@/lib/utils";

export interface Option<T = any> {
  value: T;
  label: string;
  [key: string]: any;
}

export interface AppSelectProps<
  OptionType = Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<OptionType> = GroupBase<OptionType>,
> extends Omit<ReactSelectProps<OptionType, IsMulti, Group>, "value" | "onChange" | "defaultValue"> {
  value?: any;
  defaultValue?: any;
  onChange?: (value: any, option?: any) => void;
  options?: OptionType[];
  placeholder?: string;
  className?: string;
  size?: "xs" | "sm" | "default";
  variant?: "default" | "dark" | "light";
}

export function AppSelect<
  OptionType extends Option = Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<OptionType> = GroupBase<OptionType>,
>({
  value,
  defaultValue,
  onChange,
  options = [],
  placeholder = "Select...",
  className,
  size = "default",
  isDisabled = false,
  isClearable = false,
  isSearchable = true,
  styles: customStyles,
  ...props
}: AppSelectProps<OptionType, IsMulti, Group>) {
  // Normalize value to { value, label } option object if primitive passed
  const selectedOption = React.useMemo(() => {
    const val = value !== undefined ? value : defaultValue;
    if (val === undefined || val === null) return null;
    if (typeof val === "object" && "value" in val) return val as OptionType;
    return (options.find((o) => o.value === val) ?? {
      value: val,
      label: String(val),
    }) as OptionType;
  }, [value, defaultValue, options]);

  const minHeight = size === "xs" ? "30px" : size === "sm" ? "34px" : "38px";
  const fontSize = size === "xs" ? "12px" : size === "sm" ? "13px" : "14px";
  const padding = size === "xs" ? "0 4px" : size === "sm" ? "0 6px" : "0 8px";

  const defaultStyles: StylesConfig<OptionType, IsMulti, Group> = {
    control: (base, state) => ({
      ...base,
      minHeight,
      height: minHeight,
      fontSize,
      backgroundColor: "var(--select-bg, #1c1917)",
      borderColor: state.isFocused
        ? "#f59e0b"
        : state.isDisabled
          ? "#292524"
          : "#44403c",
      boxShadow: state.isFocused ? "0 0 0 1px #f59e0b" : "none",
      borderRadius: "0.375rem",
      cursor: state.isDisabled ? "not-allowed" : "pointer",
      opacity: state.isDisabled ? 0.6 : 1,
      "&:hover": {
        borderColor: state.isFocused ? "#f59e0b" : "#57534e",
      },
    }),
    valueContainer: (base) => ({
      ...base,
      padding,
      height: minHeight,
      display: "flex",
      alignItems: "center",
    }),
    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
      color: "inherit",
      fontSize,
    }),
    placeholder: (base) => ({
      ...base,
      color: "#78716c",
      fontSize,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    }),
    singleValue: (base) => ({
      ...base,
      color: "inherit",
      fontSize,
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 99999,
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: "#1c1917",
      borderColor: "#44403c",
      borderWidth: 1,
      borderStyle: "solid",
      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
      borderRadius: "0.5rem",
      overflow: "hidden",
      zIndex: 99999,
    }),
    menuList: (base) => ({
      ...base,
      padding: "4px",
      maxHeight: "220px",
    }),
    option: (base, state) => ({
      ...base,
      fontSize,
      padding: "6px 10px",
      borderRadius: "0.25rem",
      cursor: state.isDisabled ? "not-allowed" : "pointer",
      backgroundColor: state.isSelected
        ? "#f59e0b"
        : state.isFocused
          ? "#292524"
          : "transparent",
      color: state.isSelected ? "#000000" : "#f5f5f4",
      fontWeight: state.isSelected ? "600" : "400",
      "&:active": {
        backgroundColor: state.isSelected ? "#f59e0b" : "#383533",
      },
    }),
    indicatorsContainer: (base) => ({
      ...base,
      height: minHeight,
    }),
    dropdownIndicator: (base) => ({
      ...base,
      padding: "0 6px",
      color: "#78716c",
      "&:hover": {
        color: "#d6d3d1",
      },
    }),
    clearIndicator: (base) => ({
      ...base,
      padding: "0 4px",
      color: "#78716c",
      "&:hover": {
        color: "#ef4444",
      },
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
  };

  const handleChange = (selected: any) => {
    if (props.isMulti) {
      const values = Array.isArray(selected) ? selected.map((s: any) => s.value) : [];
      onChange?.(values, selected);
    } else {
      onChange?.(selected?.value ?? null, selected);
    }
  };

  return (
    <div className={cn("relative w-full text-stone-100 dark:text-stone-100", className)}>
      <ReactSelect
        {...(props as any)}
        value={selectedOption}
        onChange={handleChange}
        options={options}
        placeholder={placeholder}
        isDisabled={isDisabled}
        isClearable={isClearable}
        isSearchable={isSearchable}
        menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
        menuPosition="fixed"
        styles={{
          ...defaultStyles,
          ...customStyles,
        }}
      />
    </div>
  );
}

export default AppSelect;
