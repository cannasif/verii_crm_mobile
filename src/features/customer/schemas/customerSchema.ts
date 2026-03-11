import { z } from "zod";
import i18n from "../../../locales";

export const createCustomerSchema = () =>
  z.object({
    customerCode: z.string().max(100).optional(),
    name: z.string().min(1, i18n.t("validation.nameRequired")).max(250),
    taxNumber: z.string().max(10).optional(),
    taxOffice: z.string().max(100).optional(),
    tcknNumber: z.string().max(11).optional(),
    address: z.string().max(500).optional(),
    phone: z.string().max(100).optional(),
    phone2: z.string().max(100).optional(),
    email: z.string().email(i18n.t("validation.invalidEmail")).max(100).optional().or(z.literal("")),
    website: z.string().max(100).optional(),
    notes: z.string().max(250).optional(),
    countryId: z.number().optional(),
    cityId: z.number().optional(),
    districtId: z.number().optional(),
    customerTypeId: z.number().optional(),
    salesRepCode: z.string().max(50).optional(),
    groupCode: z.string().max(50).optional(),
    creditLimit: z.number().optional(),
    defaultShippingAddressId: z.number().optional().nullable(),
    branchCode: z.number(),
    businessUnitCode: z.number(),
  });

export const customerSchema = createCustomerSchema();

export type CustomerFormData = z.infer<typeof customerSchema>;
