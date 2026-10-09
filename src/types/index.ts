export type UserRole = 'user' | 'admin' | 'partner';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phone?: string;
  role: UserRole;
  partnerId?: string; // If user is linked to a partner organization
  createdAt: string;
  updatedAt: string;
}

export interface BMKGRawData {
  Tanggal?: string;
  Jam?: string;
  DateTime?: string;
  Coordinates?: string;
  Lintang?: string;
  Bujur?: string;
  Magnitude?: string;
  Kedalaman?: string;
  Wilayah?: string;
  Potensi?: string;
  Dirasakan?: string;
  Shakemap?: string;
}

export interface EarthquakeEvent {
  id: string;
  source: 'BMKG';
  magnitude: string;
  depth: string;
  location: string;
  region: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  eventTime: string;
  potensi?: string;
  shakemap?: string;
  fetchedAt: string;
  rawReference?: string;
  createdAt: string;
}

export type DisasterStatus =
  | 'pending_verification'
  | 'admin_approved'
  | 'auto_approved'
  | 'rejected'
  | 'published'
  | 'archived';

export type VerificationMethod = 'manual' | 'rule_based_auto' | 'pending';

export interface Disaster {
  id: string;
  earthquakeEventId: string;
  title: string;
  magnitude: string;
  depth: string;
  location: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  eventTime: string;
  status: DisasterStatus;
  verificationMethod: VerificationMethod;
  partnerId?: string;
  partnerName?: string;
  verifiedAt?: string;
  publishedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type DonationStatus = 'pending_payment' | 'paid' | 'failed' | 'expired' | 'refunded';

export interface Donation {
  id: string;
  userId: string;
  amount: number;
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
  isAnonymous: boolean;
  message?: string;
  status: DonationStatus;
  paymentId?: string;
  paymentMethod?: string;
  disasterId?: string; // Optional reference if donated towards specific disaster
  disasterTitle?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'expired';

export interface PaymentRecord {
  id: string;
  donationId: string;
  /** Firebase Auth UID of the donating user (mirrors donations.userId so firestore.rules can grant the owner read access). */
  userId?: string;
  provider: 'duitku';
  providerReference: string;
  paymentMethod: string;
  paymentChannel: string;
  /** Nominal donasi (dana penggalangan), WITHOUT admin fee. */
  amount: number;
  /** Biaya administrasi 0,17% terpisah dari nominal donasi. */
  fee: number;
  /** Total yang dibayar donatur = amount + fee (nilai riil dari gateway). */
  paidAmount?: number;
  status: PaymentStatus;
  paymentUrl?: string;
  qrString?: string;
  vaNumber?: string;
  createdAt: string;
  paidAt?: string;
  updatedAt: string;
}

export type DisbursementStatus = 'draft' | 'submitted' | 'processing' | 'success' | 'failed' | 'cancelled';

export interface Disbursement {
  id: string;
  /** Nominal penarikan/dana yang ditarik. */
  amount: number;
  /** Biaya administrasi penarikan 0,17% (optional — dokumen lama tanpa fee dianggap 0). */
  fee?: number;
  /** Total pengeluaran = amount + fee. */
  totalAmount?: number;
  partnerId: string;
  partnerName: string;
  disasterId?: string;
  disasterTitle?: string;
  status: DisbursementStatus;
  provider: string;
  providerReference?: string;
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
  notes?: string;
  createdBy: string;
}

export interface Partner {
  id: string;
  userId?: string;
  name: string;
  email?: string;
  logo?: string;
  /** Cloudinary public_id of `logo`; empty for legacy/external logo URLs. */
  logoPublicId?: string;
  description?: string;
  location?: string;
  organization: string;
  contact: string;
  operationalArea: string;
  status: 'active' | 'inactive';
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type DistributionMilestoneKey =
  | 'allocated'
  | 'funds_received'
  | 'goods_packed'
  | 'in_transit'
  | 'arrived_at_posko'
  | 'handed_over'
  | 'completed';

export interface DistributionMilestone {
  key: DistributionMilestoneKey;
  title: string;
  detail?: string;
  location?: string;
  photoUrl?: string;
  /** Cloudinary public_id of `photoUrl`. */
  photoPublicId?: string;
  completedAt?: string;
  isCurrent?: boolean;
}

export type PartnerAllocationStatus =
  | 'allocated'
  | 'funds_received'
  | 'in_distribution'
  | 'completed';

export interface PartnerAllocation {
  id: string;
  disbursementId: string;
  partnerId: string;
  partnerName: string;
  disasterId?: string;
  disasterTitle?: string;
  amount: number;
  sourceDonationIds: string[];
  status: PartnerAllocationStatus;
  currentMilestone?: DistributionMilestoneKey;
  milestones?: DistributionMilestone[];
  targetLocation?: string;
  packedItemsSummary?: string;
  evidencePhotoUrl?: string;
  /** Cloudinary public_id of `evidencePhotoUrl`. */
  evidencePhotoPublicId?: string;
  allocatedAt: string;
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DistributionItem {
  name: string;
  quantity: number;
  unit: string;
}

export type DistributionReportStatus = 'draft' | 'submitted' | 'published' | 'revised';

export interface DistributionReport {
  id: string;
  partnerId: string;
  partnerName: string;
  allocationId: string;
  disbursementId?: string;
  status: DistributionReportStatus;
  location: string;
  distributionDate: string;
  items?: DistributionItem[];
  notes: string;
  photoUrls?: string[];
  /** Cloudinary public_ids aligned with `photoUrls` (legacy entries may be empty). */
  photoPublicIds?: string[];
  submittedAt: string;
  updatedAt: string;
  createdAt: string;
}

export type TrackingEventType =
  | 'donation_received'
  | 'funds_recorded'
  | 'funds_processed'
  | 'funds_disbursed'
  | 'partner_allocated'
  | 'funds_received_by_partner'
  | 'goods_packed'
  | 'in_transit'
  | 'arrived_at_posko'
  | 'handed_over'
  | 'distribution_started'
  | 'distribution_updated'
  | 'distribution_completed';

export interface TrackingEvent {
  id: string;
  donationId: string;
  userId?: string;
  type: TrackingEventType;
  title: string;
  description: string;
  timestamp: string;
  visibleToUser: boolean;
  createdBy: string;
  partnerId?: string;
  reportId?: string;
  documentIds?: string[];
  location?: string;
  photoUrl?: string;
  /** Cloudinary public_id of `photoUrl`. */
  photoPublicId?: string;
  itemsDetail?: string;
  milestoneKey?: DistributionMilestoneKey;
}

export interface DocumentMetadata {
  id: string;
  distributionReportId: string;
  filename: string;
  fileUrl: string;
  storagePath: string;
  type: 'photo' | 'receipt' | 'report_doc';
  uploadedBy: string;
  uploadedAt: string;
  location?: string;
  caption?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorRole: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: any;
  after?: any;
  timestamp: string;
}
