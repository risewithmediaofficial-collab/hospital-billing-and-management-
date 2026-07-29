import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  FileText,
  Plus,
  Trash2,
  Copy,
  Check,
  Pin,
  Search,
  Sparkles,
  Tag,
  Clock,
  Stethoscope,
  Pill,
  ChevronRight,
  X,
  StickyNote,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'ALL', label: 'All Notes', color: 'bg-slate-100 text-slate-800' },
  { id: 'CLINICAL', label: 'Clinical Memos', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { id: 'RX_DRAFT', label: 'Rx & Prescriptions', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'LAB_RAD', label: 'Lab & Radiology', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'REMINDER', label: 'Patient Reminders', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'PERSONAL', label: 'Personal / General', color: 'bg-slate-100 text-slate-800 border-slate-300' },
];

const MEDICAL_SNIPPETS = [
  { label: '1-0-1 After Food', text: '1-0-1 (Twice daily after meals)' },
  { label: '1-1-1 TDS 5 Days', text: '1-1-1 (Thrice daily for 5 days after food)' },
  { label: 'STAT Emergency', text: 'STAT: Administer immediately in emergency' },
  { label: 'SOS Pain', text: 'SOS: Take only in case of severe pain/fever' },
  { label: 'NPO Midnight', text: 'NPO (Nothing by mouth after midnight for surgery/procedure)' },
  { label: 'Vitals Stable', text: 'Vitals: BP 120/80 mmHg, PR 72/min, Temp 98.6°F, SpO2 99% on room air. Afebrile.' },
  { label: 'OPD Followup 7D', text: 'Advice: Review in OPD after 7 days with fresh blood investigation reports.' },
  { label: 'Lab CBC+KFT', text: 'Investigate: Complete Blood Count (CBC), Kidney Function Test (KFT), Serum Electrolytes.' },
  { label: 'Rad Chest X-Ray', text: 'Radiology Request: Chest X-Ray PA View (Rule out pulmonary infiltrates).' },
];

const DEFAULT_NOTES = [
  {
    id: 'note-1',
    title: 'OPD Checkup Follow-up Template',
    category: 'CLINICAL',
    priority: 'HIGH',
    content: 'Patient presented with 3-day history of mild fever & dry cough. Vitals: BP 120/80, SpO2 98%. Advised Steam inhalation, Paracetamol 650mg TDS SOS, and warm fluids.',
    isPinned: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'note-2',
    title: 'Standard Antibiotic Course Rx',
    category: 'RX_DRAFT',
    priority: 'NORMAL',
    content: 'Tab. Amoxicillin + Clavulanate 625mg — 1-0-1 after food for 5 days.\nTab. Pantoprazole 40mg — 1-0-0 before food 30 mins for 5 days.',
    isPinned: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const ScratchPod = ({ isModal = false, onClose }) => {
  const [notes, setNotes] = useState(() => {
    try {
      const saved = localStorage.getItem('hospital_scratchpad_notes');
      return saved ? JSON.parse(saved) : DEFAULT_NOTES;
    } catch (e) {
      return DEFAULT_NOTES;
    }
  });

  const [activeNoteId, setActiveNoteId] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('CLINICAL');
  const [priority, setPriority] = useState('NORMAL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [copiedId, setCopiedId] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem('hospital_scratchpad_notes', JSON.stringify(notes));
    } catch (e) {
      console.error('Failed to save scratchpad notes to localStorage', e);
    }
  }, [notes]);

  const showToast = (text) => {
    setToastMsg(text);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleCreateNew = () => {
    setActiveNoteId(null);
    setTitle('');
    setContent('');
    setCategory('CLINICAL');
    setPriority('NORMAL');
  };

  const handleSelectNote = (note) => {
    setActiveNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category || 'CLINICAL');
    setPriority(note.priority || 'NORMAL');
  };

  const handleSaveNote = (e) => {
    e?.preventDefault();
    if (!title.trim() && !content.trim()) {
      showToast('Please enter a title or note content.');
      return;
    }

    const noteTitle = title.trim() || 'Untitled Scratch Note';

    if (activeNoteId) {
      // Update
      setNotes((prev) =>
        prev.map((n) =>
          n.id === activeNoteId
            ? { ...n, title: noteTitle, content, category, priority, updatedAt: new Date().toISOString() }
            : n
        )
      );
      showToast('Note updated successfully!');
    } else {
      // Create new
      const newNote = {
        id: `note-${Date.now()}`,
        title: noteTitle,
        content,
        category,
        priority,
        isPinned: false,
        createdAt: new Date().toISOString(),
      };
      setNotes([newNote, ...notes]);
      setActiveNoteId(newNote.id);
      showToast('New note saved to Scratch Pod!');
    }
  };

  const handleDeleteNote = (id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeNoteId === id) {
      handleCreateNew();
    }
    showToast('Note deleted.');
  };

  const handleTogglePin = (id) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n))
    );
  };

  const handleCopyNote = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copied note to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInsertSnippet = (snippetText) => {
    setContent((prev) => (prev ? `${prev}\n${snippetText}` : snippetText));
    showToast('Medical snippet inserted!');
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all scratchpad notes?')) {
      setNotes([]);
      handleCreateNew();
      showToast('All notes cleared.');
    }
  };

  // Filtered notes
  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || n.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Sort pinned first
  const sortedNotes = [...filteredNotes].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

  return (
    <div className="space-y-4 animate-fade-in text-black">
      {/* Toast notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-2xl flex items-center gap-2 border border-slate-700 animate-bounce">
          <Sparkles size={16} className="text-amber-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Container Card */}
      <Card className="bg-white border border-slate-200 shadow-sm p-5 space-y-4 text-black">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-sky-50 text-sky-700 border border-sky-200 shadow-xs">
              <FileText size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-black tracking-tight">Clinical Scratch Pod &amp; Notes Desk</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
                  LOCAL STORAGE ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Instant clinical scratchpad, Rx drafts, sticky memos, medical abbreviation shortcuts &amp; quick-copy patient snippets.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              className="font-bold gap-1.5 text-xs shadow-sm"
              onClick={handleCreateNew}
            >
              <Plus size={16} /> New Note
            </Button>
            {notes.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="font-bold text-slate-600 hover:text-red-700 hover:bg-red-50 text-xs border-slate-300"
                onClick={handleClearAll}
              >
                <Trash2 size={15} /> Clear All
              </Button>
            )}
            {isModal && onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors ml-2"
                title="Close Scratch Pod"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Quick Medical Abbreviations & Snippets Toolbar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5">
              <Stethoscope size={14} className="text-sky-600" />
              Quick Medical Abbreviation &amp; Prescription Snippets (Click to insert into editor):
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {MEDICAL_SNIPPETS.map((snip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleInsertSnippet(snip.text)}
                className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-slate-800 hover:text-sky-900 font-bold text-[11px] transition-all shadow-2xs flex items-center gap-1 group"
                title={`Insert: "${snip.text}"`}
              >
                <Pill size={12} className="text-sky-600 group-hover:scale-110 transition-transform" />
                <span>{snip.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main 2-Column Layout (Editor Left, Saved Notes Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          {/* LEFT: Editor Area (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-xs font-black text-black uppercase tracking-wider flex items-center gap-2">
                  <FileText size={16} className="text-sky-600" />
                  {activeNoteId ? 'Edit Scratch Note' : 'Create New Scratch Note'}
                </h3>
                {activeNoteId && (
                  <span className="text-[11px] text-sky-700 font-mono font-bold">
                    Editing ID: {activeNoteId}
                  </span>
                )}
              </div>

              {/* Title & Category & Priority */}
              <div className="space-y-3">
                <Input
                  label="Note Title / Patient Identifier"
                  placeholder="e.g. Follow-up notes for UHID-8392, OPD Checkup memo..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="font-bold text-black"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                      Category Tag
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-black focus:outline-none focus:border-sky-500"
                    >
                      <option value="CLINICAL">Clinical Memo</option>
                      <option value="RX_DRAFT">Rx &amp; Prescription Draft</option>
                      <option value="LAB_RAD">Lab &amp; Radiology Order</option>
                      <option value="REMINDER">Patient Follow-up Reminder</option>
                      <option value="PERSONAL">Personal Note</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                      Priority Level
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-black focus:outline-none focus:border-sky-500"
                    >
                      <option value="NORMAL">Normal Priority</option>
                      <option value="URGENT">Urgent Follow-up</option>
                      <option value="HIGH">High Emergency</option>
                    </select>
                  </div>
                </div>

                {/* Content Textarea */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Note Content &amp; Clinical Details
                  </label>
                  <textarea
                    rows={8}
                    placeholder="Type clinical observations, lab values, quick dosage calculation, patient instructions, or internal notes here..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-3.5 text-xs text-black font-mono leading-relaxed placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 shadow-xs"
                  ></textarea>
                </div>
              </div>

              {/* Editor Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
                <div className="text-[11px] text-slate-500 font-mono font-medium">
                  Words: <strong>{content.trim() ? content.trim().split(/\s+/).length : 0}</strong> • Characters:{' '}
                  <strong>{content.length}</strong>
                </div>

                <div className="flex items-center gap-2">
                  {content && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="font-bold text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
                      onClick={() => handleCopyNote(content, 'active-editor')}
                    >
                      {copiedId === 'active-editor' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      <span>Copy Note Text</span>
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="success"
                    size="sm"
                    className="font-bold text-xs gap-1.5 shadow-sm"
                    onClick={handleSaveNote}
                  >
                    <Check size={16} />
                    <span>{activeNoteId ? 'Save Changes' : 'Save Note to Pod'}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Saved Notes List & Search (5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            {/* Search & Category Filter Header */}
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search scratch notes by keyword, tag, or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl py-2 pl-9 pr-3 text-xs text-black placeholder:text-slate-400 focus:outline-none focus:border-sky-500 shadow-xs"
                />
                <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              </div>

              {/* Category Filter Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all border ${
                      selectedCategory === cat.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes Cards Stream */}
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1 pt-1">
              {sortedNotes.length > 0 ? (
                sortedNotes.map((n) => {
                  const isSelected = activeNoteId === n.id;
                  const catObj = CATEGORIES.find((c) => c.id === n.category) || CATEGORIES[1];
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleSelectNote(n)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-2 ${
                        isSelected
                          ? 'bg-sky-50/80 border-sky-400 shadow-md scale-[1.01]'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 shadow-xs'
                      }`}
                    >
                      {/* Note Card Header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          {n.isPinned && <Pin size={13} className="text-amber-500 fill-amber-500 shrink-0" />}
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${catObj.color}`}>
                            {catObj.label}
                          </span>
                          {n.priority === 'HIGH' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-red-100 text-red-700 border border-red-200">
                              HIGH
                            </span>
                          )}
                          {n.priority === 'URGENT' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-100 text-amber-700 border border-amber-200">
                              URGENT
                            </span>
                          )}
                        </div>

                        {/* Card Actions */}
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleTogglePin(n.id)}
                            className={`p-1 rounded hover:bg-slate-200 transition-colors ${
                              n.isPinned ? 'text-amber-600' : 'text-slate-400'
                            }`}
                            title={n.isPinned ? 'Unpin note' : 'Pin note to top'}
                          >
                            <Pin size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyNote(n.content, n.id)}
                            className="p-1 rounded text-slate-500 hover:text-sky-700 hover:bg-slate-200 transition-colors"
                            title="Copy note text"
                          >
                            {copiedId === n.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(n.id)}
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-slate-200 transition-colors"
                            title="Delete note"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Note Title */}
                      <h4 className="text-xs font-black text-black tracking-tight line-clamp-1">{n.title}</h4>

                      {/* Content Preview */}
                      <p className="text-[11px] text-slate-700 font-mono line-clamp-2 leading-relaxed bg-slate-50/80 p-2 rounded border border-slate-200/60">
                        {n.content || '(No content)'}
                      </p>

                      {/* Footer Timestamp */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="font-bold text-sky-700 flex items-center gap-0.5 group-hover:underline">
                          Edit Note <ChevronRight size={12} />
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <FileText size={28} className="mx-auto text-slate-400 mb-2" />
                  <p className="font-bold text-slate-700">No scratch notes found.</p>
                  <p className="mt-1 text-[11px]">Click 'New Note' above to write your first clinical scratch memo!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
