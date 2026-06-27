import { z } from "zod";

export const createQuotationSchema = () =>
  z
    .object({
      quotation: z.object({
        potentialCustomerId: z.number().nullable().optional(),
        activityId: z.number().nullable().optional(),
        erpCustomerCode: z.string().max(50).nullable().optional(),
        deliveryDate: z.string().nullable().optional(),
        shippingAddressId: z.number().nullable().optional(),
        representativeId: z.number().nullable().optional(),
        status: z.number().nullable().optional(),
        description: z.string().max(500).nullable().optional(),
        paymentTypeId: z.number().nullable().optional(),
        documentSerialTypeId: z
          .number()
          .refine((v) => v != null && v > 0, { message: "Seri no seçilmelidir" }),
        offerType: z.string().min(1, "Teklif tipi seçilmelidir"),
        offerDate: z.string().nullable().optional(),
        offerNo: z.string().max(50).nullable().optional(),
        revisionNo: z.string().max(50).nullable().optional(),
        revisionId: z.number().nullable().optional(),
        currency: z.string().min(1, "Para birimi seçilmelidir"),
        generalDiscountRate: z.number().min(0).max(100).nullable().optional(),
        generalDiscountAmount: z.number().min(0).nullable().optional(),
        erpProjectCode: z.string().max(50).nullable().optional(),
        ozelKod1: z
          .string()
          .trim()
          .min(1, "Özel Kod 1 seçilmelidir")
          .max(10, "Özel Kod 1 en fazla 10 karakter olabilir"),
        ozelKod2: z
          .string()
          .trim()
          .min(1, "Özel Kod 2 seçilmelidir")
          .max(10, "Özel Kod 2 en fazla 10 karakter olabilir"),
        salesTypeDefinitionId: z.number().nullable().optional(),
        koliBaskiDefinitionId: z.number().nullable().optional(),
      }),
    })
    .superRefine((data, ctx) => {
      const q = data.quotation;
      const hasCustomer =
        (q.potentialCustomerId != null && q.potentialCustomerId > 0) ||
        (q.erpCustomerCode != null && String(q.erpCustomerCode).trim().length > 0);
      if (!hasCustomer) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Müşteri seçilmelidir",
          path: ["quotation", "potentialCustomerId"],
        });
      }
      if (q.paymentTypeId == null || q.paymentTypeId === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ödeme tipi seçilmelidir",
          path: ["quotation", "paymentTypeId"],
        });
      }
      if (!q.deliveryDate || String(q.deliveryDate).trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Teslimat tarihi seçilmelidir",
          path: ["quotation", "deliveryDate"],
        });
      }
      if (!q.documentSerialTypeId || q.documentSerialTypeId < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Seri no seçilmelidir",
          path: ["quotation", "documentSerialTypeId"],
        });
      }
      const validOfferTypes = ["YURTICI", "YURTDISI"];
      if (!q.offerType || !validOfferTypes.includes(q.offerType)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Teklif tipi YURTICI veya YURTDISI olmalıdır",
          path: ["quotation", "offerType"],
        });
      }
    });

export const quotationSchema = createQuotationSchema();

export type CreateQuotationSchema = z.infer<typeof quotationSchema>;
