import { z } from "zod";

export const createOrderSchema = () =>
  z
    .object({
      order: z.object({
        potentialCustomerId: z.number().nullable().optional(),
        erpCustomerCode: z.string().max(50).nullable().optional(),
        deliveryDate: z.string().nullable().optional(),
        shippingAddressId: z.number().nullable().optional(),
        representativeId: z.number().nullable().optional(),
        status: z.number().nullable().optional(),
        description: z.string().max(500).nullable().optional(),
        paymentTypeId: z.number().nullable().optional(),
        documentSerialTypeId: z
          .number()
          .nullable()
          .optional()
          .refine((v) => v != null && v > 0, { message: "Seri no seçilmelidir" }),
        offerType: z.string().min(1, "Sipariş tipi seçilmelidir"),
        offerDate: z.string().nullable().optional(),
        offerNo: z.string().max(50).nullable().optional(),
        revisionNo: z.string().max(50).nullable().optional(),
        revisionId: z.number().nullable().optional(),
        currency: z.string().min(1, "Para birimi seçilmelidir"),
      }),
    })
    .superRefine((data, ctx) => {
      const d = data.order;
      const hasCustomer =
        (d.potentialCustomerId != null && d.potentialCustomerId > 0) ||
        (d.erpCustomerCode != null && String(d.erpCustomerCode).trim().length > 0);
      if (!hasCustomer) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Müşteri seçilmelidir",
          path: ["order", "potentialCustomerId"],
        });
      }
      if (d.paymentTypeId == null || d.paymentTypeId === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ödeme tipi seçilmelidir",
          path: ["order", "paymentTypeId"],
        });
      }
      if (!d.deliveryDate || String(d.deliveryDate).trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Teslimat tarihi seçilmelidir",
          path: ["order", "deliveryDate"],
        });
      }
      if (d.documentSerialTypeId == null || d.documentSerialTypeId === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Seri no seçilmelidir",
          path: ["order", "documentSerialTypeId"],
        });
      }
    });

export const orderSchema = createOrderSchema();

export type CreateOrderSchema = z.infer<typeof orderSchema>;
