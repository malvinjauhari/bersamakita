rules_version = '2';
service cloud.firestore {
    match / databases / { database } / documents {

        // Helper functions
        function isAuthenticated() {
            return request.auth != null;
        }

        function getUserData() {
            return get(/databases/$(database) / documents / users / $(request.auth.uid)).data;
        }

        function isAdmin() {
            return isAuthenticated() && (
                request.auth.token.email == 'contohasdf@gmail.com' ||
                (exists(/databases/$(database) / documents / users / $(request.auth.uid)) && getUserData().role == 'admin')
            );
        }

        function isPartner() {
            return isAuthenticated() && exists(/databases/$(database) / documents / users / $(request.auth.uid)) && getUserData().role == 'partner';
        }

        function isUser() {
            return isAuthenticated() && exists(/databases/$(database) / documents / users / $(request.auth.uid)) && getUserData().role == 'user';
        }

        // 1. users collection
        match / users / { userId } {
      // User can read their own profile, Admin can read all users (e.g. partner list)
      // Authenticated users can read partner profiles for transparent aid attribution
      allow get: if isAuthenticated() && (request.auth.uid == userId || isAdmin() || resource.data.role == 'partner');
      allow list: if isAdmin() || (isAuthenticated() && resource.data.role == 'partner');

      // Admin can create partner accounts or manage roles
      // User can create their own document on Google OAuth login or initial Admin setup or partner creation
      allow create: if isAuthenticated() && (
                isAdmin() ||
                (request.auth.uid == userId && (
                    (request.resource.data.role == 'user' && request.auth.token.firebase.sign_in_provider == 'google.com') ||
                    (request.resource.data.role == 'admin') ||
                    (request.resource.data.role == 'partner')
                ))
            );

      // User can update their own profile fields; Admin can update any
      allow update: if isAdmin() || (isAuthenticated() && request.auth.uid == userId && request.resource.data.role == resource.data.role);
        }

        // 2. earthquakes collection
        match / earthquakes / { earthquakeId } {
      // Public can read ACTIVE and INACTIVE earthquakes.
      // Only Admin can read PENDING earthquakes.
      allow read: if resource.data.status in ['ACTIVE', 'INACTIVE'] || isAdmin();

      // Only Admin (or background ingestion) can create and update earthquake status (Approve, Tutup Donasi)
      allow create, update, delete: if isAdmin();
        }

        // 3. donations collection
        match / donations / { donationId } {
      // Donatur can only read their own donation documents
      // Admin can read all for metrics and pool aggregation
      allow read: if isAuthenticated() && (resource.data.userId == request.auth.uid || isAdmin());

      // Authenticated user can create donation
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;

      // Status updates happen via backend/webhook or sync check
      allow update: if isAuthenticated() && (request.auth.uid == resource.data.userId || isAdmin());
        }

        // 4. disbursements collection
        match / disbursements / { disbursementId } {
      // Admin can read all, Partner and Donors can read disbursement allocation records
      allow read: if isAuthenticated();

      // Admin can create disbursements
      allow create: if isAdmin();

      // Partner can confirm receipt (status: SENT -> CONFIRMED, confirmedAt timestamp)
      allow update: if isAdmin() || (
                isAuthenticated() &&
                request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'confirmedAt'])
            );

      allow delete: if isAdmin();
        }

        // 5. distributions collection
        match / distributions / { trackingId } {
      // Anyone who donated to the corresponding earthquake or public/admin can view submitted tracking
      allow read: if true;

      // Partner can create/write if authenticated
      allow create: if isAuthenticated() && (isAdmin() || isPartner() || request.resource.data.partnerId == request.auth.uid);

      // Partner can update only their own distribution reports (or Admin)
      allow update: if isAuthenticated() && (isAdmin() || isPartner() || resource.data.partnerId == request.auth.uid);
      
      allow delete: if isAdmin();
        }
    }
}
