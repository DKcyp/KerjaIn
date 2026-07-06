'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/button/Button';
import { table } from 'console';
import { table } from 'console';

interface BreakTime {
  id: number;
  nama: string;
  deskripsi?: string;
  jam_mulai: string;
  jam_selesai: string;
  tipe_penerapan: string;
  pegawai_id?: number;
  departemen_id?: number;
  role?: string;
  is_active: boolean;
}

export default function MasterBreakTimePage() {
  const [breakTimes, setBreakTimes] = useState<BreakTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nama: '',
    deskripsi: '',
    jam_mulai: '12:00',
    jam_selesai: '13:00',
    tipe_penerapan: 'GLOBAL',
    pegawai_id: '',
    departemen_id: '',
    role: '',
  });

  useEffect(() => {
    fetchBreakTimes();
  }, []);

  const fetchBreakTimes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/master-break-time');
      const data = await response.json();
      setBreakTimes(data);
    } catch (error) {
      console.error('Failed to fetch break times:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      nama: formData.nama,
      deskripsi: formData.deskripsi || null,
      jam_mulai: formData.jam_mulai,
      jam_selesai: formData.jam_selesai,
      tipe_penerapan: formData.tipe_penerapan,
      pegawai_id: formData.pegawai_id ? parseInt(formData.pegawai_id) : null,
      departemen_id: formData.departemen_id ? parseInt(formData.departemen_id) : null,
      role: formData.role || null,
    };

    try {
      const url = editingId ? `/api/master-break-time/${editingId}` : '/api/master-break-time';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setIsOpen(false);
        setEditingId(null);
        setFormData({
          nama: '',
          deskripsi: '',
          jam_mulai: '12:00',
          jam_selesai: '13:00',
          tipe_penerapan: 'GLOBAL',
          pegawai_id: '',
          departemen_id: '',
          role: '',
        });
        fetchBreakTimes();
      }
    } catch (error) {
      console.error('Failed to save break time:', error);
    }
  };

  const handleEdit = (breakTime: BreakTime) => {
    setEditingId(breakTime.id);
    setFormData({
      nama: breakTime.nama,
      deskripsi: breakTime.deskripsi || '',
      jam_mulai: breakTime.jam_mulai,
      jam_selesai: breakTime.jam_selesai,
      tipe_penerapan: breakTime.tipe_penerapan,
      pegawai_id: breakTime.pegawai_id?.toString() || '',
      departemen_id: breakTime.departemen_id?.toString() || '',
      role: breakTime.role || '',
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus break time ini?')) return;

    try {
      const response = await fetch(`/api/master-break-time/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchBreakTimes();
      }
    } catch (error) {
      console.error('Failed to delete break time:', error);
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/master-break-time/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });

      if (response.ok) {
        fetchBreakTimes();
      }
    } catch (error) {
      console.error('Failed to toggle break time:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Master Break Time</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Kelola jadwal istirahat karyawan</p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            setFormData({
              nama: '',
              deskripsi: '',
              jam_mulai: '12:00',
              jam_selesai: '13:00',
              tipe_penerapan: 'GLOBAL',
              pegawai_id: '',
              departemen_id: '',
              role: '',
            });
            setIsOpen(true);
          }}
        >
          Tambah Break Time
        </Button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-lg w-full">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingId ? 'Edit Break Time' : 'Tambah Break Time'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama</label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) =>
                    setFormData({ ...formData, nama: e.target.value })
                  }
                  placeholder="e.g., Istirahat Siang"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Deskripsi
                </label>
                <input
                  type="text"
                  value={formData.deskripsi}
                  onChange={(e) =>
                    setFormData({ ...formData, deskripsi: e.target.value })
                  }
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Jam Mulai
                  </label>
                  <input
                    type="time"
                    value={formData.jam_mulai}
                    onChange={(e) =>
                      setFormData({ ...formData, jam_mulai: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Jam Selesai
                  </label>
                  <input
                    type="time"
                    value={formData.jam_selesai}
                    onChange={(e) =>
                      setFormData({ ...formData, jam_selesai: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipe Penerapan
                </label>
                <select
                  value={formData.tipe_penerapan}
                  onChange={(e) =>
                    setFormData({ ...formData, tipe_penerapan: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="GLOBAL">Global</option>
                  <option value="USER">User Spesifik</option>
                  <option value="DEPARTEMEN">Departemen</option>
                  <option value="ROLE">Role</option>
                </select>
              </div>

              {formData.tipe_penerapan === 'USER' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Pegawai ID
                  </label>
                  <input
                    type="number"
                    value={formData.pegawai_id}
                    onChange={(e) =>
                      setFormData({ ...formData, pegawai_id: e.target.value })
                    }
                    placeholder="e.g., 123"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}

              {formData.tipe_penerapan === 'DEPARTEMEN' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Departemen ID
                  </label>
                  <input
                    type="number"
                    value={formData.departemen_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        departemen_id: e.target.value,
                      })
                    }
                    placeholder="e.g., 5"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}

              {formData.tipe_penerapan === 'ROLE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    placeholder="e.g., PM, PROGRAMMER"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit">Simpan</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Loading...</p>
        </div>
      ) : breakTimes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400">Belum ada data break time</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Nama</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Jam Mulai</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Jam Selesai</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Tipe</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Target</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {breakTimes.map((breakTime) => (
                  <tr key={breakTime.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{breakTime.nama}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{breakTime.jam_mulai}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{breakTime.jam_selesai}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {breakTime.tipe_penerapan}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {breakTime.tipe_penerapan === 'USER' && `User #${breakTime.pegawai_id}`}
                      {breakTime.tipe_penerapan === 'DEPARTEMEN' && `Dept #${breakTime.departemen_id}`}
                      {breakTime.tipe_penerapan === 'ROLE' && breakTime.role}
                      {breakTime.tipe_penerapan === 'GLOBAL' && '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() =>
                          handleToggleActive(breakTime.id, breakTime.is_active)
                        }
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          breakTime.is_active
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                        }`}
                      >
                        {breakTime.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(breakTime)}
                          className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(breakTime.id)}
                          className="px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
