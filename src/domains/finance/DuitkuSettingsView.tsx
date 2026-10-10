import React, { useState } from 'react';
import { Sliders, Shield, Key, Building, CheckCircle2, AlertTriangle, Play, Sparkles } from 'lucide-react';
import { useToast } from '../../components/feedback/Toast';

export const DuitkuSettingsView: React.FC<{ onDataChanged?: () => Promise<void> }> = ({ onDataChanged }) => {
  const { showToast } = useToast();

  const [testAmount, setTestAmount] = useState<number>(50000);
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [adminSecretInput, setAdminSecretInput] = useState<string>('');

  const handleTestCreatePayment = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/payments/duitku/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donationId: `TEST-${Date.now()}`,
          amount: testAmount,
          donorName: 'Test Sandbox Donatur',
          donorEmail: 'test@bersamakita.org',
        }),
      });

      const data = await res.json();
      setTestResult(data);
      if (data.success) {
        showToast('Uji pembuatan transaksi Duitku berhasil!', 'success');
      } else {
        showToast('Respon uji gateway: ' + (data.message || 'Gagal'), 'warning');
      }
    } catch (err: any) {
      showToast('Gagal menghubungi backend gateway: ' + err.message, 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleResetTransactions = async () => {
    setResetting(true);
    try {
      const res = await fetch('/api/admin/reset-transactions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSecretInput}`
        },
      });
      const data = await res.json();
      
      if (data.success) {
        showToast(`Reset berhasil! ${data.deletedCount} dokumen transaksi telah dihapus.`, 'success');
        if (onDataChanged) {
          await onDataChanged();
        }
      } else {
        showToast('Gagal mereset transaksi: ' + (data.message || 'Error'), 'error');
      }
    } catch (err: any) {
      showToast('Gagal menghubungi backend: ' + err.message, 'error');
    } finally {
      setResetting(false);
      setShowResetModal(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B3322] uppercase tracking-wider mb-1">
          <Sliders className="w-4 h-4 text-emerald-600" />
          <span>Integrasi Resmi Payment Gateway Duitku POP</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Konfigurasi Gateway Duitku Sandbox</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Kredensial disimpan untuk logika backend Duitku POP. Saat ini menggunakan mode Sandbox.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-600" />
            <span>Keamanan Kredensial</span>
          </h3>
          <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs leading-relaxed">
            <p className="font-semibold mb-2">Semua kredensial Duitku sekarang dikelola secara aman di sisi server (Backend).</p>
            <ul className="list-disc pl-4 space-y-1 text-emerald-700">
              <li>API Key dan Merchant Code tidak lagi terekspos ke frontend.</li>
              <li>Silakan ubah konfigurasi melalui environment variables (<code>.env</code>) di server.</li>
              <li>Tanda tangan digital (signature) digenerate secara tertutup dan rahasia.</li>
            </ul>
          </div>
        </div>

        {/* Test Simulator Box */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Play className="w-4 h-4 text-emerald-600" />
            <span>Uji Coba Signature & API Payment</span>
          </h3>

          <p className="text-xs text-slate-500 leading-relaxed">
            Menjalankan kalkulasi tanda tangan MD5 sesuai spesifikasi API Duitku v2 melalui server-side backend.
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nominal Uji Coba (Rp)</label>
              <input
                type="number"
                value={testAmount}
                onChange={(e) => setTestAmount(parseInt(e.target.value, 10) || 10000)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-[#B2D850]"
              />
            </div>

            <button
              onClick={handleTestCreatePayment}
              disabled={testing}
              className="w-full py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{testing ? 'Menguji Gateway...' : 'Kirim Uji Transaksi'}</span>
            </button>

            {testResult && (
              <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-56 space-y-1">
                <div className="text-emerald-400 font-bold">Respon Backend:</div>
                <pre>{JSON.stringify(testResult, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-8 bg-rose-50 p-6 rounded-3xl border border-rose-200 shadow-sm space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-rose-100 text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-rose-900">Danger Zone: Reset Transaction Data</h3>
            <p className="text-xs text-rose-700 leading-relaxed mt-1 max-w-2xl">
              Tindakan ini akan menghapus <b>seluruh data operasional transaksi donasi dan tracking</b> dari Firestore secara permanen. 
              Data yang dihapus meliputi <i>donations, payments, disbursements, partnerAllocations, distributionReports, distributions, dan trackingEvents</i>.
              Firebase Auth, users, dan master data bencana akan tetap aman.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowResetModal(true)}
          className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all"
        >
          Reset Transaction Data
        </button>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-2">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Konfirmasi Reset Data
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Anda yakin ingin menghapus <strong>seluruh data operasional donasi, pembayaran, dan pelacakan distribusi?</strong><br/><br/>
                Operasi ini bersifat permanen dan tidak dapat dikembalikan. Data yang dihapus hanya data transaksional, tidak termasuk akun dan master data bencana.
              </p>
              
              <div className="w-full pt-2">
                <label className="block text-left font-semibold text-slate-700 text-xs mb-1">Admin Secret Key</label>
                <input
                  type="password"
                  value={adminSecretInput}
                  onChange={(e) => setAdminSecretInput(e.target.value)}
                  placeholder="Masukkan Admin Secret Key"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="flex items-center gap-3 w-full pt-4">
                <button
                  onClick={() => setShowResetModal(false)}
                  disabled={resetting}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleResetTransactions}
                  disabled={resetting}
                  className="flex-1 px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {resetting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Ya, Hapus Permanen</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
