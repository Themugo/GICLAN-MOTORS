import { z } from "zod";

export const createReviewSchema = z.object({
  dealer: z.string().uuid("Dealer ID must be a valid UUID"),
  carId: z.string().uuid().optional(),
  rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  comment: z.string().min(1, "Comment is required").max(2000),
});

export const disputeEscrowSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(2000),
});
