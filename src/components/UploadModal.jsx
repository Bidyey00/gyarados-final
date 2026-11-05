import { useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { formatBytes } from '../lib/format.js';
import { uploadAsset } from '../api/supabaseApi';
import { useToast } from './Toast.jsx';
import { useAuth } from '../context/AuthContext';

export default function UploadModal({ onClose, onUploaded }) {
  const toast = useToast();
  const { user } = useAuth();
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);

  const pick = (f) => {
    if (!f) return;
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

 
const submit = async (e) => {
  e.preventDefault();
  if (!file) return;

  setBusy(true);

  try {
    const uploadedAsset = await uploadAsset(
      {
        file,
        title: title || file.name,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      },
      user.id
    );

    toast(`Uploaded “${title || file.name}”`);
    onUploaded(uploadedAsset);
    onClose();
  } catch (err) {
    toast(err.message, 'error');
    setBusy(false);
  }
};


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Upload a file">
      <div className="absolute inset-0 bg-navy-800/50" onClick={onClose} />
      <form onSubmit={submit} className="slide-in relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-lift">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Upload a file</h2>
          <button type="button" className="btn-ghost px-2" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
          onClick={() => input.current?.click()}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors ${
            drag ? 'border-teal bg-teal-50' : 'border-line hover:border-navy/40'
          }`}
        >
          <Icon name="upload" className="h-7 w-7 text-teal" />
          {file ? (
            <p className="font-medium">{file.name} <span className="font-normal text-ink-mute">({formatBytes(file.size)})</span></p>
          ) : (
            <p className="text-sm text-ink-soft">Drop a file here, or <span className="font-medium text-teal">browse your computer</span></p>
          )}
          <input ref={input} type="file" className="hidden" onChange={(e) => pick(e.target.files[0])} />
        </div>

        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium">Title
            <input className="input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name shown in the catalogue" />
          </label>
          <label className="block text-sm font-medium">Tags
            <input className="input mt-1" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Separate with commas, e.g. poster, 2026" />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!file || busy}>{busy ? 'Uploading…' : 'Upload file'}</button>
        </div>
      </form>
    </div>
  );
}
