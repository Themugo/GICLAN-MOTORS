import { findAll } from "../db/index.js";

export const detectAbuse = async (userId, auctionId) => {
  const recentBids = await findAll("bids", { filters: { user: userId, auction: auctionId }, orderBy: "createdAt", ascending: false, limit: 20 });

  if (recentBids.length < 5) {
    return { flagged: false };
  }

  let score = 0;
  let reasons = [];

  // 🔹 1. Rapid bidding detection
  let rapidCount = 0;
  for (let i = 1; i < recentBids.length; i++) {
    const diff = new Date(recentBids[i - 1].createdAt) - new Date(recentBids[i].createdAt);

    if (diff < 2000) rapidCount++;
  }

  if (rapidCount >= 5) {
    score += 2;
    reasons.push("Rapid bidding detected");
  }

  // 🔹 2. Bid frequency (spam over time)
  const first = new Date(recentBids[recentBids.length - 1].createdAt);
  const last = new Date(recentBids[0].createdAt);
  const duration = (last - first) / 1000; // seconds

  if (recentBids.length / duration > 0.5) {
    score += 2;
    reasons.push("High bid frequency");
  }

  // 🔹 3. Small incremental bids (price manipulation)
  let smallIncrements = 0;
  for (let i = 1; i < recentBids.length; i++) {
    const diff = recentBids[i - 1].amount - recentBids[i].amount;
    if (diff > 0 && diff < 5) smallIncrements++;
  }

  if (smallIncrements >= 5) {
    score += 1;
    reasons.push("Suspicious small bid increments");
  }

  // 🔹 4. Self-outbidding pattern
  const selfOutbids = recentBids.filter(
    (b, i, arr) => i > 0 && b.user.toString() === arr[i - 1].user.toString(),
  ).length;

  if (selfOutbids > 5) {
    score += 1;
    reasons.push("Self-outbidding pattern");
  }

  // 🔹 Final decision
  if (score >= 3) {
    return {
      flagged: true,
      score,
      reasons,
    };
  }

  return { flagged: false, score };
};
