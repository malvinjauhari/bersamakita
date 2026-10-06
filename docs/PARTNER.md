# Partner Management

> **Partner account can ONLY be created through the authorized Admin Dashboard. Regular users cannot self-register as Partner. Firebase Authentication manages credentials, while Firestore stores Partner profile and role information. Passwords must never be stored in Firestore.**

> **Firebase is the single source of truth for Partner information. Disaster stores the Partner relationship/reference, and all user-facing Partner information must be resolved from the current Partner data in Firebase. Never hardcode or duplicate Partner profile data across frontend pages.**

## Partner Registration Flow

1. **Admin Authorization**: An authenticated Admin (who holds the `admin` role in Firestore or is the hardcoded master admin) accesses the Admin Dashboard.
2. **Form Submission**: Admin fills out the new Partner's details (Organization Name, Email, Password, Contact, Operational Area).
3. **Backend API Request**: The frontend sends an authenticated `POST /api/admin/create-partner` request to the Express backend with a valid Firebase ID Token.
4. **Backend Validation**: The backend checks the token against `adminAuth.verifyIdToken()` and confirms the user has the `admin` role.
5. **Firebase Auth Creation**: The backend creates a new user via `adminAuth.createUser(email, password, displayName)`. The password is secure and handled exclusively by Firebase.
6. **Firestore Records**:
   - `users` collection: Creates a document matching the new UID with `role: 'partner'`.
   - `partners` collection: Creates a document matching the new UID holding all organizational details.

## Partner Access Flow

1. The new Partner accesses `/partner/auth`.
2. They log in using the email and password the Admin created for them.
3. The frontend uses `signInWithEmailAndPassword` via the Firebase Client SDK.
4. `AuthContext` queries the `users` collection to confirm their role is indeed `partner`.
5. Upon successful verification, they are granted access to the Partner Dashboard to manage disaster distributions and disbursements.

## Partner Information Sync (UI)

- The **Admin Dashboard** provides an interface to edit Partner details, including Name, Description, Location, and uploading a Logo to Firebase Storage.
- When an Admin updates a Partner, `updatePartner` writes these changes directly to the `partners` collection in Firestore.
- In **User Dashboards** (like the BMKG Catalog or Disaster Details), the UI relies solely on `partnerId` linked to the active `Disaster`.
- The frontend dynamically resolves `partners.find(p => p.id === activeDisaster.partnerId)` and uses the resulting object to render the Partner card. This guarantees that logo updates or description changes propagate immediately to the public UI without stale cached fields.
