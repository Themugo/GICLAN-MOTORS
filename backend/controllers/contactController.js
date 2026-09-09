import Contact from "../models/Contact.js";
import { deliver } from "../services/communicationGateway.service.js";
import { logInfo, logError } from "../utils/logger.js";

// M-9 FIX: Escape user input before interpolating into HTML email templates.
// Without this, an attacker could inject arbitrary HTML/JS into notification emails.
const escapeHTML = (str) =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

export const submitContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    const contact = await Contact.create({ name, email, subject, message });

    deliver({
      channel: "email",
      eventType: "support.contact_form",
      category: "transactional",
      recipient: process.env.ADMIN_EMAIL || process.env.EMAIL_FROM,
      subject: `Contact form: ${escapeHTML(subject)}`,
      html: `<div style="font-family:sans-serif;background:#F8FAFC;color:#0F172A;padding:24px;max-width:500px;border:1px solid #E2E8F0;">
        <h2 style="color:#2563EB;">New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${escapeHTML(name)}</p>
        <p><strong>Email:</strong> ${escapeHTML(email)}</p>
        <p><strong>Subject:</strong> ${escapeHTML(subject)}</p>
        <hr style="border-color:#252E3D;" />
        <p>${escapeHTML(message)}</p>
      </div>`,
      text: `New contact form submission from ${name} (${email}): ${subject} - ${message}`,
      metadata: { contactId: contact._id, senderEmail: email },
    }).catch(err => logError("Failed to send contact email", err));

    res.json({ success: true, message: "Message received. We'll get back to you soon." });
  } catch (err) {
    logError("Contact form error", err);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
};

export const listContacts = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, contacts });
  } catch (err) {
    logError("Failed to list contacts", err);
    res.status(500).json({ success: false, message: "Failed to list contacts" });
  }
};

export const markRead = async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
    if (!contact) return res.status(404).json({ success: false, message: "Contact not found" });
    res.json({ success: true, contact });
  } catch (err) {
    logError("Failed to update contact", err);
    res.status(500).json({ success: false, message: "Failed to update contact" });
  }
};
