import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { dealerAPI, paymentsAPI } from "../api/api";

export default function PostRegPackageSelect() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [selected, setSelected] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [waitingForPayment, setWaitingForPayment] = useState(false);

  useEffect(() => {
    dealerAPI.getSubscriptionPlans()
      .then(({ plans }) => setPackages(plans || []))
      .catch(() => toast("Unable to load current dealer plans", "error"))
      .finally(() => setLoading(false));
  }, []);

  const handleContinue = async () => {
    const pkg = packages.find((p) => p.id === selected);
    if (!pkg) return toast("Select a plan to continue", "error");

    if (pkg.contactSales || Number(pkg.price) <= 0) {
      window.location.href = "mailto:plans@kayad.space?subject=Enterprise Inquiry";
      return;
    }

    if (!/^2547\d{8}$/.test(phone.trim())) {
      toast("Enter a valid Kenyan M-Pesa number (2547XXXXXXXX)", "error");
      return;
    }

    setSaving(true);
    try {
      const result = await dealerAPI.upgrade({ planId: pkg.id, phone: phone.trim() });
      toast(result.message || "STK push sent. Enter your M-Pesa PIN.", "success");
      const paymentId = result.paymentId;
      if (!paymentId) throw new Error("Payment was initiated without a trackable payment reference");
      setWaitingForPayment(true);
      const deadline = Date.now() + 90_000;
      let settled = false;
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const status = await paymentsAPI.status(paymentId);
        const normalized = String(status?.payment?.status || status?.status || "").toLowerCase();
        if (["success", "completed", "paid"].includes(normalized)) {
          settled = true;
          break;
        }
        if (["failed", "cancelled", "canceled", "refunded"].includes(normalized)) {
          throw new Error(status?.payment?.resultDesc || status?.message || "Subscription payment was not completed");
        }
      }
      if (!settled) {
        toast("Payment is still pending. Your subscription will activate automatically after verified M-Pesa settlement.", "success");
        return;
      }
      toast("Subscription activated. You can now manage your dealer listings.", "success");
      navigate("/dealer/add-car", { replace: true });
    } catch (err) {
      toast(err?.response?.data?.message || err?.message || "Unable to start subscription payment", "error");
    } finally {
      setWaitingForPayment(false);
      setSaving(false);
    }
  };

  return (
    <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ width: "100%", maxWidth: 900, padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h2 style={{ marginBottom: 6 }}>Choose Your Plan</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Plans and pricing are live from the platform subscription catalogue. Payment activates the entitlement after verified M-Pesa settlement.</p>
        </div>

        {loading ? <div style={{ textAlign: "center", color: "var(--text-muted)" }}>Loading plans...</div> : (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(Math.max(packages.length, 1), 4)}, minmax(0, 1fr))`, gap: 14, marginBottom: 24 }}>
            {packages.map((pkg) => {
              const sel = selected === pkg.id;
              const color = pkg.id === "elite" ? "var(--gold)" : pkg.id === "enterprise" ? "#a855f7" : pkg.id === "growth" ? "#3b82f6" : "rgba(255,255,255,0.6)";
              return (
                <div key={pkg.id} onClick={() => setSelected(pkg.id)}
                  style={{ background: "#0C0C0C", border: `2px solid ${sel ? color : "rgba(255,255,255,0.08)"}`, borderRadius: 16, padding: "22px 20px", cursor: "pointer", transition: "all 0.2s", position: "relative" }}>
                  {pkg.badge && <div style={{ position: "absolute", top: -8, right: 12, background: color, color: "#000", fontSize: 9, fontWeight: 800, padding: "3px 10px", borderRadius: 9999 }}>{pkg.badge}</div>}
                  <h3 style={{ fontSize: 15, margin: "0 0 4px" }}>{pkg.name}</h3>
                  <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
                    {pkg.contactSales || Number(pkg.price) <= 0 ? <span style={{ color }}>Custom</span> : <span>KES {Number(pkg.price).toLocaleString()}<span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)" }}>/30 days</span></span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>{pkg.description || "Dealer subscription plan"}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{pkg.listingMax > 0 ? `Up to ${pkg.listingMax} listings` : "Unlimited listings"}</div>
                  {(pkg.features || []).map((feature) => <div key={feature} style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>✓ {String(feature).replaceAll("_", " ")}</div>)}
                </div>
              );
            })}
          </div>
        )}

        {selected && packages.find((p) => p.id === selected)?.price > 0 && (
          <div style={{ maxWidth: 420, margin: "0 auto 20px" }}>
            <label className="input-label">M-Pesa number</label>
            <input className="input" placeholder="2547XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        )}

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button className="btn btn-outline" onClick={() => navigate("/dealer/add-car", { replace: true })}>Continue later</button>
          <button className="btn btn-gold btn-lg" onClick={handleContinue} disabled={saving || loading || !selected}>
            {saving ? (waitingForPayment ? "Waiting for M-Pesa confirmation..." : "Starting payment...") : packages.find((p) => p.id === selected)?.contactSales ? "Contact Sales" : "Continue to Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
