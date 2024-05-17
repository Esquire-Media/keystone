import { SelectFieldConfig } from '@keystone-6/core/fields'
import { BaseListTypeInfo } from "@keystone-6/core/types";

export type Session = {
  itemId: string;
  data: {
    name: string;
    email: string;
  };
};

export type Ops = "C" | "R" | "U" | "D";

export const Operations: SelectFieldConfig<BaseListTypeInfo> = {
  type: "enum",
  options: [
    { label: "Create", value: "C" },
    { label: "Read", value: "R" },
    { label: "Update", value: "U" },
    { label: "Delete", value: "D" },
  ],
};

export const DataType: SelectFieldConfig<BaseListTypeInfo> = {
  type: "enum",
  options: [
    { label: "Addresses", value: "addresses" },
    { label: "Device IDs", value: "device_ids" },
    { label: "Polygons", value: "polygons" },
  ],
};