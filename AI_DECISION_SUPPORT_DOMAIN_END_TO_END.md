# KAYAD AI Decision Support — End to End

## Scope
Replaces prototype-style AI claims with an explainable decision-support layer grounded in live KAYAD marketplace data.

## Delivered
- Live, authenticated vehicle recommendations.
- Explicit scoring factors and confidence.
- Vehicle-level recommendation explanations.
- Live market inventory signals.
- User activity/search signals as recommendation inputs.
- No fabricated counts, fixed recommendation scores, or invented market statistics.
- No autonomous purchase, payment, listing, campaign, or configuration mutation.
- AI routes are authenticated and read-only.
- Governance schema records decision runs for future audit integration.

## Model truth
The current engine is deterministic rule-based decision support, not a claimed trained ML model. A future ML provider can be introduced behind the same service boundary with model/version/provenance fields retained.
