

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { hashIndex } from '../lib/format.js';
import { useToast } from './Toast.jsx';
import {
  borrowBook,
  deleteBook,
} from '../api/supabaseApi';
import { useAuth } from '../context/AuthContext.jsx';

const COVERS = [
  'bg-navy text-white',
  'bg-teal text-white',
  'bg-brick text-white',
  'bg-moss text-white',
  'bg-saffron text-navy',
  'bg-navy-700 text-saffron',
];

export default function BookCard({
  book,
  onChanged,
  onEdit,
}) {
  const toast = useToast();
  const { user } = useAuth();

  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canManage =
    user?.role === 'librarian' ||
    user?.role === 'admin';

  const available = book.copiesAvailable > 0;
  const cover = COVERS[hashIndex(book.id, COVERS.length)];

  const borrow = async () => {
    setBusy(true);

    try {
      await borrowBook(book.id);
      toast(`Borrowed “${book.title}”`);
      onChanged?.();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${book.title}"?`
    );

    if (!confirmed) return;

    setDeleting(true);

    try {
      await deleteBook(book.id);
      toast(`Deleted "${book.title}"`);
      onChanged?.();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <article className="group flex flex-col">
      <Link
        to={`/reader/${book.id}`}
        aria-label={`Read ${book.title}`}
        className="block"
      >
        <div
          className={`cover relative aspect-[3/4] overflow-hidden rounded-r-lg rounded-l-sm shadow-lift transition-transform group-hover:-translate-y-1 ${cover}`}
        >
          {book.coverImage ? (
            <img
              src={book.coverImage}
              alt={`Cover of ${book.title}`}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="h-full p-5 pl-7 text-white">
              <h3 className="text-xl font-extrabold leading-tight">
                {book.title}
              </h3>

              <p className="absolute bottom-4 left-7 right-4 text-sm">
                {book.author}
              </p>
            </div>
          )}
        </div>
      </Link>

      <div className="mt-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-ink-soft">
            {book.category} · {book.year || 'No year'}
          </p>

          {book.description && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-mute">
              {book.description}
            </p>
          )}
        </div>

        <span
          className={`badge shrink-0 ${
            available
              ? 'bg-moss-50 text-moss'
              : 'bg-brick-50 text-brick'
          }`}
        >
          {available
            ? `${book.copiesAvailable} of ${book.copiesTotal} in`
            : 'All out'}
        </span>
      </div>

      <div className="mt-2 flex gap-2">
        <Link to={`/reader/${book.id}`} className="btn-ghost flex-1 text-center">
          Read
        </Link>

        <button
          className={`flex-1 ${available ? 'btn-primary' : 'btn-ghost'}`}
          disabled={!available || busy}
          onClick={borrow}
        >
          {busy ? 'Borrowing…' : available ? 'Borrow' : 'Unavailable'}
        </button>
      </div>

      {canManage && (
        <div className="mt-2 flex gap-2 border-t border-line pt-2">
          <button
            type="button"
            className="btn-ghost flex-1"
            onClick={() => onEdit?.(book)}
          >
            Edit
          </button>

          <button
            type="button"
            className="btn-ghost flex-1 text-brick"
            disabled={deleting}
            onClick={handleDelete}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      )}
    </article>
  );
}
