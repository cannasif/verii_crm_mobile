import type { Module } from "../types";

export const CRM_MODULES: Module[] = [
  {
    id: "1",
    key: "addCustomer",
    icon: "👤",
    color: "#3B82F6", 
    route: "/customers/create",
  },
  {
    id: "2",
    key: "createQuote",
    icon: "📄",
    color: "#F97316", 
    route: "/(tabs)/sales/quotations/create",
  },
  {
    id: "3",
    key: "createActivity",
    icon: "📅",
    color: "#EC4899", 
    route: "/(tabs)/activities/create",
  },
  {
    id: "4",
    key: "stock",
    icon: "📦",
    color: "#8B5CF6", 
    route: "/(tabs)/stock",
  },
];