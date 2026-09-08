import { z } from "zod";

export const initiatePaymentSchema = z.object({
  amount: z.number().positive("Amount must be positive").max(100_000_000).optional(),
  phone: z.string().regex(/^2547\d{8}$/, "Phone must be a valid Kenyan number"),
  carId: z.string().optional(),
  bookingId: z.string().uuid().optional(),
  escrowId: z.string().optional(),
  type: z.enum(["bid", "purchase", "escrow", "deposit", "inspection", "subscription", "package_upgrade", "listing", "auction_win"]).optional(),
}).superRefine((value, ctx) => {
  if (value.type === "inspection") {
    if (!value.bookingId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bookingId"], message: "bookingId is required for inspection payments" });
    return;
  }
  if (value.amount === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["amount"], message: "Amount is required" });
});

export const paymentCallbackSchema = z.object({
  Body: z.object({
    stkCallback: z.object({
      CheckoutRequestID: z.string(),
      ResultCode: z.number(),
      ResultDesc: z.string().optional(),
      CallbackMetadata: z
        .object({
          Item: z.array(
            z.object({
              Name: z.string(),
              Value: z.union([z.string(), z.number()]).optional(),
            }),
          ),
        })
        .optional(),
    }),
  }),
});
