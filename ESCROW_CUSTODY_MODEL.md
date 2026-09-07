# KAYAD Escrow Custody Model

## Business decision

KAYAD vehicle escrow is a **private-seller-only** capability. Dealer listings do not qualify for vehicle escrow, regardless of legacy dealer escrow flags or per-listing overrides.

## Current custody rail

M-Pesa STK is **not** a vehicle escrow funding rail. Full vehicle purchase values are not collected through the M-Pesa purchase flow. The current escrow funding method is **bank transfer** into a KAYAD administrator-configured custody account.

The escrow record remains `pending` until authorized KAYAD accounts/escrow staff verify the bank funding reference. Verification is an atomic `pending -> funded` transition.

## Administrator controls

Administrators can configure:

- escrow enabled/disabled;
- private-seller requirement: mandatory, optional, or disabled;
- minimum escrow amount;
- maximum escrow amount;
- release window in days;
- escrow fee percentage;
- active KAYAD custody bank accounts;
- primary custody account.

The backend is authoritative. Browser/local-storage escrow settings are only a presentation cache and cannot bypass server enforcement.

## Account rules

Custody accounts are platform/admin-controlled bank accounts. Seller personal accounts must never be configured as escrow custody accounts. An account already referenced by an escrow cannot be deleted; it must be deactivated.

## Future e-wallet

A future KAYAD e-wallet/custody rail is deliberately represented as disabled configuration only. No live wallet funding path exists in this initiative. Building that wallet will be a separate regulated financial architecture initiative.

## Release/refund

The existing escrow state machine remains authoritative for vehicle confirmation, delivery, dispute, refund and release. This initiative changes the **funding/custody boundary**, not the state-machine semantics.
