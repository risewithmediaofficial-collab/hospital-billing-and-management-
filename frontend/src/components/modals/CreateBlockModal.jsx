import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { X, Building2, ShieldAlert, CheckCircle } from 'lucide-react';

export const CreateBlockModal = ({ isOpen, onClose, blockToEdit = null, onSuccess }) => {
  useScrollLock(isOpen);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [numberOfFloors, setNumberOfFloors] = useState(1);
  const [status, setStatus] = useState('ACTIVE');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (blockToEdit) {
        setName(blockToEdit.name || '');
        setCode(blockToEdit.code || '');
        setDescription(blockToEdit.description || '');
        setNumberOfFloors(blockToEdit.numberOfFloors || 1);
        setStatus(blockToEdit.status || 'ACTIVE');
      } else {
        setName('');
        setCode('');
        setDescription('');
        setNumberOfFloors(1);
        setStatus('ACTIVE');
      }
      setError(null);
    }
  }, [isOpen, blockToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Building / Block Name is required.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (blockToEdit) {
        await axiosClient.put(`/beds/blocks/${blockToEdit._id}`, {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim(),
          numberOfFloors: Number(numberOfFloors) || 1,
          status,
        });
      } else {
        await axiosClient.post('/beds/blocks', {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim(),
          numberOfFloors: Number(numberOfFloors) || 1,
          status,
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const msg = err.error?.message || err.response?.data?.message || err.message || 'Failed to save Building Block.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in z-50">
      <div className="modal-container max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 shrink-0">
              <Building2 size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-900 truncate">
                {blockToEdit ? 'Edit Building Block' : 'Add New Building / Block'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Physical hospital building or wing</p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2.5">
                <ShieldAlert size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Building / Block Name *
              </label>
              <Input
                type="text"
                placeholder="e.g. Main Block, Maternity Wing, Surgical Tower"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full text-xs font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Block Code
                </label>
                <Input
                  type="text"
                  placeholder="e.g. MB, EB, ST"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full text-xs uppercase font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Number of Floors
                </label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={numberOfFloors}
                  onChange={(e) => setNumberOfFloors(e.target.value)}
                  className="w-full text-xs font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 border border-slate-200"
              >
                <option value="ACTIVE">Active (Operational)</option>
                <option value="INACTIVE">Inactive (Under Renovation / Closed)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Description / Notes
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Brief notes about departments or services in this building..."
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-900 border border-slate-200 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isLoading} className="font-bold">
                {blockToEdit ? 'Save Changes' : 'Create Block'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
