import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { X, Layers, ShieldAlert } from 'lucide-react';

export const CreateFloorModal = ({ isOpen, onClose, floorToEdit = null, blocks = [], onSuccess }) => {
  useScrollLock(isOpen);
  const [name, setName] = useState('');
  const [floorNumber, setFloorNumber] = useState(0);
  const [blockId, setBlockId] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (floorToEdit) {
        setName(floorToEdit.name || '');
        setFloorNumber(floorToEdit.floorNumber !== undefined ? floorToEdit.floorNumber : 0);
        setBlockId(floorToEdit.blockId?._id || floorToEdit.blockId || '');
        setDescription(floorToEdit.description || '');
        setStatus(floorToEdit.status || 'ACTIVE');
      } else {
        setName('');
        setFloorNumber(0);
        setBlockId(blocks.length > 0 ? (blocks[0]._id || '') : '');
        setDescription('');
        setStatus('ACTIVE');
      }
      setError(null);
    }
  }, [isOpen, floorToEdit, blocks]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Floor Name is required.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (floorToEdit) {
        await axiosClient.put(`/beds/floors/${floorToEdit._id}`, {
          name: name.trim(),
          floorNumber: Number(floorNumber),
          blockId: blockId || null,
          description: description.trim(),
          status,
        });
      } else {
        await axiosClient.post('/beds/floors', {
          name: name.trim(),
          floorNumber: Number(floorNumber),
          blockId: blockId || null,
          description: description.trim(),
          status,
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const msg = err.error?.message || err.response?.data?.message || err.message || 'Failed to save Floor.';
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
            <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-200 shrink-0">
              <Layers size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-900 truncate">
                {floorToEdit ? 'Edit Floor' : 'Add New Floor'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Configure hospital floor levels</p>
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
                Floor Name *
              </label>
              <Input
                type="text"
                placeholder="e.g. Ground Floor, 1st Floor, Basement -1, Mezzanine"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full text-xs font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Building / Block
                </label>
                <select
                  value={blockId}
                  onChange={(e) => setBlockId(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 border border-slate-200"
                >
                  <option value="">No Specific Block</option>
                  {blocks.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name} {b.code ? `(${b.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Floor Number (Index)
                </label>
                <Input
                  type="number"
                  placeholder="0 for Ground, 1, 2, -1"
                  value={floorNumber}
                  onChange={(e) => setFloorNumber(e.target.value)}
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
                <option value="INACTIVE">Inactive (Closed / Maintenance)</option>
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
                placeholder="Optional notes regarding departments or sections on this floor..."
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-900 border border-slate-200 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isLoading} className="font-bold">
                {floorToEdit ? 'Save Changes' : 'Create Floor'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
