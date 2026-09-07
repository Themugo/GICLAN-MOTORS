import { z } from "zod";

export const initiatePaymentSchema = z.object({
  amount: z.number().positive("Amount must be positive").max(100_000_000),
  phone: z.string().regex(/^2547\d{8}$/, "Phone must be a valid Kenyan number"),
  carId: z.string().optional(),
  escrowId: z.string().optional(),
  type: z.enum(["bid", "purchase", "escrow", "deposit", "inspection", "subscription", "package_upgrade", "listing", "auction_win"]).optional(),
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
