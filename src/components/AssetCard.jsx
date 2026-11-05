
import Icon from './Icon.jsx';
import { formatBytes, formatDate } from '../lib/format.js';

export const TYPE_STYLE = {
  image: {
    icon: 'image',
    tab: 'bg-sky',
    tint: 'bg-teal-50 text-teal-700',
  },
  video: {
    icon: 'video',
    tab: 'bg-brick',
    tint: 'bg-brick-50 text-brick',
  },
  audio: {
    icon: 'audio',
    tab: 'bg-moss',
    tint: 'bg-moss-50 text-moss',
  },
  document: {
    icon: 'file',
    tab: 'bg-saffron',
    tint: 'bg-saffron-50 text-[#8a6d00]',
  },
  pdf: {
    icon: 'file',
    tab: 'bg-brick',
    tint: 'bg-brick-50 text-brick',
  },
};

export const styleFor = (type) =>
  TYPE_STYLE[type] || TYPE_STYLE.document;

export function Thumb({ asset, className = '' }) {
  const s = styleFor(asset.type);

  // Display the actual uploaded image using its Supabase signed URL.
  if (
    asset.type === 'image' &&
    (asset.url || asset.thumbnailUrl)
  ) {
    return (
      <img
        src={asset.thumbnailUrl || asset.url}
        alt={asset.title || 'Uploaded image'}
        loading="lazy"
        className={`h-full w-full object-cover ${className}`}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center ${s.tint} ${className}`}
    >
      <Icon name={s.icon} className="h-9 w-9" />
    </div>
  );
}

export default function AssetCard({ asset, view, onOpen }) {
  const s = styleFor(asset.type);

  if (view === 'list') {
    return (
      <button
        onClick={() => onOpen(asset)}
        className="flex w-full items-center gap-4 border-b border-line bg-white px-4 py-3 text-left last:border-0 hover:bg-shelf"
      >
        <Thumb
          asset={asset}
          className="h-12 w-12 shrink-0 rounded-lg"
        />

        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">
            {asset.title}
          </span>
          <span className="block truncate text-sm text-ink-mute">
            {asset.tags.join(', ') || 'No tags'}
          </span>
        </span>

        <span className="hidden w-20 text-sm text-ink-soft sm:block">
          {formatBytes(asset.sizeBytes)}
        </span>

        <span className="hidden w-28 text-sm text-ink-soft md:block">
          {formatDate(asset.createdAt)}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={() => onOpen(asset)}
      className="group overflow-hidden rounded-xl border border-line bg-white text-left transition-shadow hover:shadow-lift"
    >
      <div className={`h-1.5 ${s.tab}`} />

      <Thumb
        asset={asset}
        className="aspect-video w-full"
      />

      <div className="p-3">
        <p className="truncate font-medium">{asset.title}</p>
        <p className="mt-0.5 text-sm text-ink-mute">
          {asset.format?.toUpperCase() || 'FILE'} · {formatBytes(asset.sizeBytes)}
        </p>
      </div>
    </button>
  );
}
