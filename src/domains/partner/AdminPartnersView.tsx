import React, { useState } from 'react';
import { Building2, Plus, Phone, MapPin, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { Partner, PartnerAllocation } from '../../types';
import { savePartner, updatePartner, addAuditLog } from '../../integrations/firebase/firestore';
import { useAuth } from '../access/AuthContext';
import { useToast } from '../../components/feedback/Toast';
import { formatRupiah } from '../../lib/utils';
import { auth, storage } from '../../config/firebase';
import { ref } from 'firebase/storage';

interface AdminPartnersViewProps {
  partners: Partner[];
  allocations: PartnerAllocation[];
  onDataChanged: () => void;
}

export const AdminPartnersView: React.FC<AdminPartnersViewProps> = ({
  partners,
  allocations,
  onDataChanged,
}) => {
  const { user, staffSession } = useAuth();
  const { showToast } = useToast();

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [org, setOrg] = useState<string>('');
  const [contact, setContact] = useState<string>('');
  const [area, setArea] = useState<string>('');
  

  const [editDescription, setEditDescription] = useState<string>('');
  const [editLocation, setEditLocation] = useState<string>('');
  const [editName, setEditName] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !org || !email || !password) {
      showToast('Harap lengkapi semua field termasuk email & password', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error('Anda belum login sebagai Admin (Sesi Firebase Auth tidak ditemukan).');
      }

      const res = await fetch('/api/admin/create-partner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email,
          password,
          name,
          organization: org,
          contact: contact || '+62 812-xxxx-xxxx',
          area: area || 'Wilayah Bencana Nasional'
        })
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Gagal membuat akun partner');
      }

      const partnerId = result.partner.id;

      await addAuditLog({
        id: `audit-${Date.now()}`,
        actorId: auth.currentUser?.uid || 'admin',
        actorRole: 'admin',
        actorEmail: auth.currentUser?.email || 'admin',
        action: 'PARTNER_CREATED',
        entityType: 'partner',
        entityId: partnerId,
        after: { name, organization: org, email },
        timestamp: new Date().toISOString(),
      });

      showToast(`Mitra ${name} berhasil didaftarkan`, 'success');
      setShowAddModal(false);
      setName('');
      setEmail('');
      setPassword('');
      setOrg('');
      setContact('');
      setArea('');
      onDataChanged();
    } catch (err: any) {
      showToast('Gagal menambahkan mitra: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (p: Partner) => {
    setEditingPartner(p);
    setEditName(p.name || '');
    setEditDescription(p.description || '');
    setEditLocation(p.location || '');
  };

  const handleUpdatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner) return;
    setSubmitting(true);
    try {
      let logoUrl = editingPartner.logo;

      const updated = {
        ...editingPartner,
        name: editName,
        description: editDescription,
        location: editLocation,
        ...(logoUrl ? { logo: logoUrl } : {}),
        updatedAt: new Date().toISOString()
      };

      await updatePartner(updated);
      
      await addAuditLog({
        id: `audit-${Date.now()}`,
        actorId: auth.currentUser?.uid || 'admin',
        actorRole: 'admin',
        actorEmail: auth.currentUser?.email || 'admin',
        action: 'PARTNER_UPDATED',
        entityType: 'partner',
        entityId: editingPartner.id,
        after: { name: editName, description: editDescription },
        timestamp: new Date().toISOString(),
      });

      showToast(`Data Mitra berhasil diperbarui`, 'success');
      setEditingPartner(null);
      onDataChanged();
    } catch (err: any) {
      showToast('Gagal mengupdate mitra: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B3322] uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>Manajemen Mitra Operasional Lapangan</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Mitra Penyaluran Resmi</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organisasi kemanusiaan dan relawan resmi yang menerima alokasi pencairan dana untuk penyaluran bantuan.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1B3322] hover:bg-[#243E2C] text-[#B2D850] text-xs font-bold transition-all shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Mitra Baru</span>
        </button>
      </div>

      {partners.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-3">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Belum Ada Mitra yang Terdaftar</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Daftarkan mitra kemanusiaan terpercaya untuk menyalurkan dana bantuan tunai ke lokasi bencana.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {partners.map((partner) => {
            const partnerAllocs = allocations.filter((a) => a.partnerId === partner.id);
            const totalAllocAmount = partnerAllocs.reduce((sum, a) => sum + a.amount, 0);

            return (
              <div
                key={partner.id}
                className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-slate-900">{partner.name}</span>
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>Terverifikasi</span>
                        </span>
                      </div>
                      <button 
                        onClick={() => handleEditClick(partner)}
                        className="text-xs font-semibold text-emerald-700 hover:underline"
                      >
                        Edit Detail
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">{partner.organization}</p>
                  </div>
                </div>

                {partner.description && (
                  <p className="text-xs text-slate-600 line-clamp-2">{partner.description}</p>
                )}

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Wilayah: {partner.operationalArea}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Kontak: {partner.contact}</span>
                  </div>
                  {partner.location && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Alamat: {partner.location}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Total Dana Diterima:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {formatRupiah(totalAllocAmount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tambah Mitra */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 text-slate-900 shadow-2xl relative border border-slate-100">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">Daftarkan Mitra Kemanusiaan Baru</h3>
            <p className="text-xs text-slate-500 mb-5">
              Mitra resmi bertanggung jawab atas penerimaan dana dan pelaporan penyaluran bantuan di lapangan.
            </p>

            <form onSubmit={handleAddPartner} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Organisasi / Relawan</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Misal: Posko Tanggap Gempa Cianjur"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#B2D850]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Akun Mitra</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="partner@domain.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#B2D850]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password Akun Mitra</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#B2D850]"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Instansi / Divisi</label>
                <input
                  type="text"
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  placeholder="Misal: Badan Penanggulangan Daerah"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#B2D850]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kontak Narahubung</label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Nomor HP / Email resmi"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#B2D850]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Wilayah Jangkauan Operasional</label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Misal: Jawa Barat / Banten"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#B2D850]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-full bg-[#1B3322] hover:bg-[#243E2C] text-[#B2D850] font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Daftarkan Mitra</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Mitra */}
      {editingPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 text-slate-900 shadow-2xl relative border border-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingPartner(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">Edit Detail Mitra</h3>
            <p className="text-xs text-slate-500 mb-5">
              Perbarui profil dan logo resmi mitra agar tercermin di seluruh UI publik.
            </p>

            <form onSubmit={handleUpdatePartner} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Organisasi / Relawan</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#B2D850]"
                  required
                />
              </div>



              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pengertian / Deskripsi</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Ceritakan visi atau lingkup operasi mitra ini..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#B2D850] min-h-[80px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lokasi Detail (Alamat Posko)</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="Misal: Jl. Raya Puncak Km 10"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#B2D850]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-full bg-[#1B3322] hover:bg-[#243E2C] disabled:bg-slate-300 disabled:text-slate-500 text-[#B2D850] font-bold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{submitting ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
