import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAssets } from '../api/supabaseApi';
import { useFetch } from '../hooks/useFetch.js';
import Icon from '../components/Icon.jsx';
import AssetCard from '../components/AssetCard.jsx';
import AssetDrawer from '../components/AssetDrawer.jsx';
import UploadModal from '../components/UploadModal.jsx';
import { EmptyState, ErrorState, GridSkeleton } from '../components/States.jsx';

const TYPES = [
  ['', 'All files'], ['image', 'Images'], ['video', 'Video'], ['audio', 'Audio'], ['document', 'Documents'],
];

export default function Assets() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const type = params.get('type') || '';
  const [view, setView] = useState('grid');
  const [selected, setSelected] = useState(null);
  const [uploading, setUploading] = useState(false);

  const assets = useFetch(
  () => getAssets({ q, type }),
  [q, type]
);
  const items = assets.data?.items || [];

  const setType = (v) => {
    const next = new URLSearchParams(params);
    v ? next.set('type', v) : next.delete('type');
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Digital assets</h1>
          <p className="mt-1 text-ink-soft">
            {assets.data ? `${assets.data.total} file${assets.data.total === 1 ? '' : 's'}` : 'Loading files…'}
            {q && <> matching “{q}”</>}
          </p>
        </div>
        <button className="btn-accent" onClick={() => setUploading(true)}>
          <Icon name="upload" className="h-4 w-4" /> Upload file
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="File types">
          {TYPES.map(([v, l]) => (
            <button key={v} className={`chip ${type === v ? 'chip-on' : ''}`} onClick={() => setType(v)}>{l}</button>
          ))}
        </div>
        <div className="flex overflow-hidden rounded-lg border border-line bg-white" role="group" aria-label="View">
          {[['grid', 'grid'], ['list', 'list']].map(([v, icon]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              aria-label={`${v} view`}
              className={`px-2.5 py-2 ${view === v ? 'bg-navy text-white' : 'text-ink-soft hover:bg-shelf'}`}
            >
              <Icon name={icon} className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {assets.error ? (
        <ErrorState error={assets.error} onRetry={assets.refetch} />
      ) : !assets.data && assets.loading ? (
        <GridSkeleton tall={false} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No files here yet"
          hint="Upload a file, or clear the search and type filter to see everything."
          action={<button className="btn-primary mt-2" onClick={() => setUploading(true)}>Upload file</button>}
        />
      ) : view === 'grid' ? (
        <div className={`grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${assets.loading ? 'opacity-60' : ''}`}>
          {items.map((a) => <AssetCard key={a.id} asset={a} view="grid" onOpen={setSelected} />)}
        </div>
      ) : (
        <div className={`panel overflow-hidden ${assets.loading ? 'opacity-60' : ''}`}>
          {items.map((a) => <AssetCard key={a.id} asset={a} view="list" onOpen={setSelected} />)}
        </div>
      )}

      {selected && <AssetDrawer asset={selected} onClose={() => setSelected(null)} onChanged={assets.refetch} />}
      {uploading && <UploadModal onClose={() => setUploading(false)} onUploaded={assets.refetch} />}
    </div>
  );
}
