import { useState, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import { disputeAPI } from '../api/api';

const EVIDENCE_TYPES = [
  { value: 'image',             label: 'Image',             icon: '📷', accept: 'image/*',                        maxSize: 10 },
  { value: 'video',             label: 'Video',             icon: '🎥', accept: 'video/*',                        maxSize: 100 },
  { value: 'document',          label: 'Document',          icon: '📄', accept: '.pdf,.doc,.docx,.xlsx,.txt',    maxSize: 20 },
  { value: 'inspection_report', label: 'Inspection Report',  icon: '🔍', accept: '.pdf,image/*',                   maxSize: 20 },
  { value: 'payment_record',    label: 'Payment Record',     icon: '💳', accept: '.pdf,image/*',                   maxSize: 10 },
  { value: 'chat_log',          label: 'Chat Log',          icon: '💬', accept: '.pdf,.txt,.csv,.json',           maxSize: 5 },
];

export default function EvidenceUpload({ disputeId, onUploaded }) {
  const { toast } = useToast();
  const [type, setType] = useState('image');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const selected = EVIDENCE_TYPES.find(t => t.value === type);
    const maxBytes = (selected?.maxSize || 20) * 1024 * 1024;
    if (f.size > maxBytes) {
      toast(`${selected?.label || 'Evidence'} exceeds the ${selected?.maxSize || 20}MB limit`, 'error');
      e.target.value = '';
      return;
    }
    setFile(f);
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!file) { toast('Please select a file', 'error'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', type);
      fd.append('description', description);
      await disputeAPI.uploadEvidence(disputeId, fd);
      toast('Evidence uploaded', 'success');
      setFile(null);
      setPreview(null);
      setDescription('');
      if (inputRef.current) inputRef.current.value = '';
      if (onUploaded) onUploaded();
    } catch (err) {
      toast(err?.response?.data?.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const selectedType = EVIDENCE_TYPES.find(t => t.value === type);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wide">Upload Evidence</h3>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {EVIDENCE_TYPES.map(t => (
          <button key={t.value} type="button" onClick={() => setType(t.value)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition
              ${type === t.value ? 'border-gold bg-gold/10 text-gold' : 'border-gray-600 text-gray-400 hover:border-gray-500'}`}>
            <span className="text-lg">{t.icon}</span>
            <span className="truncate w-full text-center">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <label className="flex-1">
          <input ref={inputRef} type="file" accept={selectedType?.accept || '*'} onChange={handleFileChange}
            className="block w-full text-sm text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600" />
        </label>
      </div>

      {preview && (
        <div className="relative w-32 h-24 rounded overflow-hidden border border-gray-700">
          <img src={preview} alt="preview" className="w-full h-full object-cover" />
        </div>
      )}

      {file && (
        <p className="text-xs text-gray-500">{file.name} ({(file.size / 1024 / 1024).toFixed(1)}MB)</p>
      )}

      <input type="text" placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)}
        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gold" />

      <button type="button" onClick={handleUpload} disabled={!file || uploading}
        className="w-full py-2 bg-gold text-black font-semibold rounded-lg hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm">
        {uploading ? 'Uploading...' : `Upload ${selectedType?.icon || ''}`}
      </button>
    </div>
  );
}
