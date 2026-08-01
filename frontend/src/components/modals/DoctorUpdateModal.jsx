import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { Stethoscope, Send, Lock } from 'lucide-react';

export const DoctorUpdateModal = ({ isOpen, onClose, patientId, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    updateType: 'GENERAL_UPDATE',
    visibility: 'BOTH',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await axiosClient.post('/doctor-updates', {
        ...formData,
        patientId,
      });
      setFormData({ title: '', content: '', updateType: 'GENERAL_UPDATE', visibility: 'BOTH' });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to publish doctor update.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope size={20} className="text-indigo-600" />
            Publish Physician Progress Note / Update
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <Input
            label="Update Title *"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Post-Op Recovery Status / Vitals Normal"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Update Category</label>
              <select
                value={formData.updateType}
                onChange={(e) => setFormData({ ...formData, updateType: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none"
              >
                <option value="GENERAL_UPDATE">General Update</option>
                <option value="STABLE">Patient Stable</option>
                <option value="CRITICAL">Critical Watch</option>
                <option value="SURGERY_COMPLETED">Surgery Completed</option>
                <option value="ICU_TRANSFER">Shifted to ICU</option>
                <option value="WARD_TRANSFER">Moved to Ward</option>
                <option value="READY_FOR_DISCHARGE">Ready for Discharge</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Visibility Audience</label>
              <select
                value={formData.visibility}
                onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none"
              >
                <option value="BOTH">Both Patient & Guardian</option>
                <option value="PATIENT_ONLY">Patient Only</option>
                <option value="GUARDIAN_ONLY">Guardian Only</option>
                <option value="INTERNAL_ONLY">Internal Medical Team Only</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Note Content *</label>
            <textarea
              rows={4}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Enter clinical progress details approved for patient/guardian visibility..."
              className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-900 focus:outline-none"
              required
            />
          </div>

          <div className="pt-2 flex gap-3">
            <Button type="button" variant="outline" className="w-1/2 font-bold" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="w-1/2 font-bold bg-indigo-600 hover:bg-indigo-700 text-white" isLoading={isLoading}>
              <Send size={14} /> Publish Note
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
