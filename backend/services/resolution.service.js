import { findById, findOne, create, update } from "../db/index.js";
import { STATES } from "./disputeStateMachine.js";
import { STATES as ESCROW_STATES, validateTransition } from "./escrowStateMachine.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";
import { getIO } from "../utils/io.js";

const getCommissionRate = async () => {
  try {
    const config = await findOne("platform_config", {});
    if (config?.dealerCommission) return config.dealerCommission / 100;
  } catch {}
  return 0.05;
};

const notify = async (userId, title, message, type = "dispute") => {
  try {
    const notif = await create("notifications", { user: userId, title, message, type });
    getIO()?.to(`user_${userId}`).emit("notification", notif);
  } catch (e) {
    logWarn("Resolution notify failed", { error: e.message });
  }
};

export const resolveDispute = async (disputeId, adminId, { decision, amount, sellerAmount, buyerAmount, reason }) => {
  try {
    const dispute = await findById("disputes", disputeId);
    if (!dispute) throw new Error("Dispute not found");

    if (dispute.status !== STATES.UNDER_REVIEW && dispute.status !== STATES.MEDIATION && dispute.status !== STATES.APPEALED) {
      throw new Error(`Cannot resolve dispute in state: ${dispute.status}`);
    }

    const escrow = await findById("escrows", dispute.escrow);
    if (!escrow) throw new Error("Linked escrow not found");

    const commissionRate = await getCommissionRate();
    const commission = Math.round(escrow.amount * commissionRate);
    const now = new Date();

    const escrowUpdate = {};
    let carUpdate = null;

    switch (decision) {
      case "full_refund": {
        const v = validateTransition(escrow.status, "refunded", "admin", escrow);
        if (!v.allowed) throw new Error(v.reason);
        Object.assign(escrowUpdate, { status: "refunded", refundedAt: now, refundedBy: adminId });
        escrowUpdate.history = [...(escrow.history || []), { action: "Dispute resolution: full_refund", by: adminId, at: now }];
        await notify(dispute.openedBy, "Dispute Resolved — Full Refund", `Full refund of KES ${escrow.amount.toLocaleString("en-KE")} has been processed.`);
        break;
      }

      case "partial_refund": {
        const v = validateTransition(escrow.status, "refunded", "admin", escrow);
        if (!v.allowed) throw new Error(v.reason);
        Object.assign(escrowUpdate, { status: "refunded", refundedAt: now, refundedBy: adminId, sellerAmount: sellerAmount || (escrow.amount - amount), commission: amount >= escrow.amount ? 0 : commission });
        escrowUpdate.history = [...(escrow.history || []), { action: `Dispute resolution: partial_refund — KES ${(amount || 0).toLocaleString("en-KE")}`, by: adminId, at: now }];
        await notify(dispute.openedBy, "Dispute Resolved — Partial Refund", `Partial refund of KES ${(amount || 0).toLocaleString("en-KE")} has been processed.`);
        break;
      }

      case "release_funds": {
        const v = validateTransition(escrow.status, "released", "admin", escrow);
        if (!v.allowed) throw new Error(v.reason);
        const finalSellerAmount = sellerAmount || (escrow.amount - commission);
        Object.assign(escrowUpdate, { status: "released", releasedAt: now, releasedBy: adminId, commission, sellerAmount: finalSellerAmount });
        escrowUpdate.history = [...(escrow.history || []), { action: `Dispute resolution: release_funds — KES ${finalSellerAmount.toLocaleString("en-KE")}`, by: adminId, at: now }];
        if (escrow.car) carUpdate = { sold: true, isPaid: true };
        await notify(dispute.openedBy, "Dispute Resolved — Funds Released", `Funds released to seller per dispute resolution.`);
        break;
      }

      case "split_settlement": {
        const v = validateTransition(escrow.status, "released", "admin", escrow);
        if (!v.allowed) throw new Error(v.reason);
        const finalSellerAmount = sellerAmount || Math.round(escrow.amount / 2 - commission);
        const finalBuyerAmount = buyerAmount || Math.round(escrow.amount / 2);
        Object.assign(escrowUpdate, { status: "released", releasedAt: now, releasedBy: adminId, commission, sellerAmount: finalSellerAmount, buyerAmount: finalBuyerAmount });
        escrowUpdate.history = [...(escrow.history || []), { action: "Dispute resolution: split_settlement", by: adminId, at: now }];
        await notify(dispute.openedBy, "Dispute Resolved — Split Settlement", `Funds split: KES ${finalBuyerAmount.toLocaleString("en-KE")} refunded, KES ${finalSellerAmount.toLocaleString("en-KE")} released.`);
        break;
      }

      case "dismissed": {
        const v = validateTransition(escrow.status, "released", "admin", escrow);
        if (!v.allowed) throw new Error(v.reason);
        Object.assign(escrowUpdate, { status: "released", releasedAt: now, releasedBy: adminId, commission, sellerAmount: escrow.amount - commission, reason: reason || "Dispute dismissed" });
        escrowUpdate.history = [...(escrow.history || []), { action: "Dispute dismissed", by: adminId, at: now }];
        await notify(dispute.openedBy, "Dispute Dismissed", "Your dispute has been dismissed after review.");
        break;
      }

      default:
        throw new Error(`Unknown decision: ${decision}`);
    }

    await update("escrows", escrow.id, escrowUpdate);

    if (escrow.payment) {
      const payment = await findById("payments", escrow.payment);
      if (payment) {
        await update("payments", payment.id, {
          status: escrowUpdate.status === "refunded" ? "refunded" : "released",
          platformFee: commission,
          dealerAmount: escrowUpdate.sellerAmount,
        });
      }
    }

    if (carUpdate && escrow.car) {
      await update("cars", escrow.car, carUpdate);
    }

    const resolveAmount = amount || escrow.amount;
    const disputeUpdate = {
      status: STATES.RESOLVED,
      resolvedAt: new Date().toISOString(),
      resolution: {
        decision,
        amount: resolveAmount,
        sellerAmount: escrowUpdate.sellerAmount,
        buyerAmount: escrowUpdate.buyerAmount || 0,
        platformFee: commission,
        reason: reason || "",
        decidedBy: adminId,
        decidedAt: new Date().toISOString(),
        implemented: true,
        implementedAt: new Date().toISOString(),
      },
      timeline: [...(dispute.timeline || []), {
        action: `Resolved — ${decision}`,
        actor: adminId,
        fromStatus: dispute.status,
        toStatus: STATES.RESOLVED,
        note: reason,
      }],
    };

    await update("disputes", dispute.id, disputeUpdate);

    await notify(dispute.openedAgainst, "Dispute Resolved", `The dispute "${dispute.title}" has been resolved. Decision: ${decision}.`);

    logInfo("Dispute resolved", { disputeId, decision, amount: resolveAmount });
    return { ...dispute, ...disputeUpdate };
  } catch (err) {
    logError("Dispute resolve failed", err);
    throw err;
  }
};
