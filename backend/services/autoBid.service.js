import redis from "../config/redis.js";
import { emitBidUpdate } from "../socket/socket.js";

// =============================
// 🔧 CONFIG
// =============================
const BID_INCREMENT = 100; // adjust per auction rules

// =============================
// 🔑 KEYS
// =============================
const getAutoBidKey = (roomId) => `auction:${roomId}:autobids`;
const getAuctionKey = (roomId) => `auction:${roomId}`;

// =============================
// 🤖 SET AUTO BID
// =============================
export const setAutoBid = async ({ roomId, userId, maxBid }) => {
  const key = getAutoBidKey(roomId);

  await redis.hset(key, userId, maxBid);

  return {
    success: true,
    message: "Auto-bid registered",
  };
};

// =============================
// ❌ REMOVE AUTO BID
// =============================
export const removeAutoBid = async ({ roomId, userId }) => {
  const key = getAutoBidKey(roomId);

  await redis.hdel(key, userId);

  return { success: true };
};

// =============================
// 🧠 RUN AUTO BID ENGINE
// (call after EVERY bid)
// =============================
export const runAutoBidEngine = async (roomId) => {
  const autoKey = getAutoBidKey(roomId);
  const auctionKey = getAuctionKey(roomId);

  try {
    const currentBid = Number(await redis.get(auctionKey)) || 0;

    const autoBidders = await redis.hgetall(autoKey);

    if (!autoBidders || Object.keys(autoBidders).length === 0) {
      return;
    }

    // =============================
    // 🧠 FIND ELIGIBLE BIDDERS
    // =============================
    const eligible = Object.entries(autoBidders)
      .map(([userId, maxBid]) => ({
        userId,
        maxBid: Number(maxBid),
      }))
      .filter((b) => b.maxBid > currentBid);

    if (eligible.length === 0) return;

    // =============================
    // 🥇 SORT BY MAX BID DESC
    // =============================
    eligible.sort((a, b) => b.maxBid - a.maxBid);

    const top = eligible[0];
    const second = eligible[1];

    let nextBid;

    // =============================
    // ⚔️ COMPETITION LOGIC
    // =============================
    if (second) {
      nextBid = Math.min(top.maxBid, second.maxBid + BID_INCREMENT);
    } else {
      nextBid = Math.min(top.maxBid, currentBid + BID_INCREMENT);
    }

    if (nextBid <= currentBid) return;

    const now = Date.now();

    // =============================
    // 💾 SAVE BID
    // =============================
    await redis.set(auctionKey, nextBid);

    await redis.zadd(
      `auction:${roomId}:bids`,
      now,
      JSON.stringify({
        userId: top.userId,
        bid: nextBid,
        time: now,
        auto: true,
      }),
    );

    // =============================
    // 📡 EMIT UPDATE
    // =============================
    emitBidUpdate(roomId, {
      amount: nextBid,
      userId: top.userId,
      time: now,
      auto: true,
    });

    // =============================
    // 🔁 RECURSIVE COMPETITION
    // =============================
    // keeps bidding until stable winner
    return await runAutoBidEngine(roomId);
  } catch (err) {
    console.error("❌ AUTO BID ENGINE ERROR:", err);
  }
};
