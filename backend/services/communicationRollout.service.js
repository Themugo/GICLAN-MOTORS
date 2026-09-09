import { findOne } from "../db/index.js";

export const isCommunicationEnabled = async ({ eventType, channel, category = "transactional" }) => {
  if (channel === "in_app") return true;
  const global = await findOne("communication_channel_controls", { channel });
  if (global && global.enabled === false) return false;
  const event = await findOne("communication_event_controls", { eventType, channel });
  if (event) return event.enabled === true;
  // Fail closed for newly introduced event/channel combinations. Admin must explicitly enable them.
  return false;
};

export const getRolloutState = async () => {
  const { findAll } = await import("../db/index.js");
  const [channels, events] = await Promise.all([
    findAll("communication_channel_controls", { orderBy: "channel", ascending: true, limit: 20 }),
    findAll("communication_event_controls", { orderBy: "eventType", ascending: true, limit: 500 }),
  ]);
  return { channels, events };
};
