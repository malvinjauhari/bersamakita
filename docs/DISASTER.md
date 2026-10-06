# Disaster Verification Flow (BMKG to Active)

## Business Rules

> **BMKG data must NEVER become publicly visible automatically. A disaster is publicly visible ONLY after an authorized admin explicitly clicks APPROVE. There is NO 24-hour auto-approval, NO auto-publish, and NO pending/placeholder disaster shown to users. Before approval, the public disaster state must be EMPTY.**

1. **BMKG is Data Only**: BMKG is the source of earthquake data (`fetchAutogempa` & `fetchGempaterkini`). It is **not** a source of approval.
2. **No Auto-Approve / No Auto-Publish / No Placeholders**: 
   - All newly ingested disasters from BMKG are saved with `status = 'pending_verification'`.
   - The 24-hour auto-approval rule engine has been strictly removed.
   - The auto-publish fallback logic for empty databases has been strictly removed.
   - Users must see an **EMPTY STATE** if there are no explicitly approved disasters.
3. **Mandatory Mitra (Partner) Assignment**:
   - Before an Admin can approve a pending disaster, they **must** explicitly select an active Mitra Lapangan (Field Partner).
   - Backend logic validates this: approval without a partner assignment will result in an error and the status remains pending.
4. **Visibility to User**:
   - Only disasters with `status = 'admin_approved'` (internally mapped as ACTIVE) are visible to the public or donors.
   - New or pending disasters are strictly hidden from users until the verification and partner assignment are complete.

## Flow Chart

```text
BMKG Fetch
        ↓
Save Disaster
        ↓
PENDING_APPROVAL
        ↓
Admin Review
        ↓
Admin pilih Mitra Lapangan
        ↓
Admin Approve
        ↓
ACTIVE (admin_approved)
        ↓
Tampil ke User
```

## Security & Firestore Constraints

- Disasters can only be approved by authenticated Admins.
- Unauthenticated users cannot trigger writes to the disasters collection.
- Frontend directly enforces that the approval button is disabled if no partner is selected.
- `firestore.ts` enforces that if the status is set to `admin_approved`, `partnerId` and `partnerName` must be present.
