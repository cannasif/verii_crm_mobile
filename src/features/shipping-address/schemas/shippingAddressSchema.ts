import { z } from "zod";
import i18n from "../../../locales";

export const createShippingAddressSchema = () =>
  z.object({
    address: z.string().min(1, i18n.t("validation.addressRequired")).max(150),
    postalCode: z.string().max(20).optional(),
    contactPerson: z.string().max(100).optional(),
    phone: z.string().max(20).optional(),
    notes: z.string().max(100).optional(),
    customerId: z.number().optional().nullable(),
    countryId: z.number().optional(),
    cityId: z.number().optional(),
    districtId: z.number().optional(),
  });

export const shippingAddressSchema = createShippingAddressSchema();

export type ShippingAddressFormData = z.infer<typeof shippingAddressSchema>;
