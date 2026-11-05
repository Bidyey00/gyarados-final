

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { api } from '../api/supabaseApi';
import { useFetch } from '../hooks/useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';

import BookCard from '../components/BookCard.jsx';
import {
  EmptyState,
  ErrorState,
  GridSkeleton,
} from '../components/States.jsx';

const STATUSES = [
  ['', 'Any availability'],
  ['available', 'Available now'],
  ['unavailable', 'All copies out'],
];

const EMPTY_FORM = {
  title: '',
  author: '',
  categoryId: '',
  year: '',
  description: '',
  summary: '',
  pdfPath: '',
  coverFile: null,
  pdfFile: null,
  copiesTotal: 1,
};

export default function Library() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();

  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const status = params.get('status') || '';

  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const canManage =
    user?.role === 'librarian' ||
    user?.role === 'admin';

  const books = useFetch(
    (s) => api.books({ q, category, status }, s),
    [q, category, status]
  );

  const cats = useFetch((s) => api.categories(s), []);

  const categoryRecords = useFetch(
    (s) => api.categoryRecords(s),
    []
  );

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);

    value
      ? next.set(key, value)
      : next.delete(key);

    setParams(next, { replace: true });
  };

  // Open a blank form for adding a book.
  const openAddForm = () => {
    setEditingBook(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  // Load existing information when editing.
  const openEditForm = (book) => {
    setEditingBook(book);

    setForm({
      title: book.title || '',
      author: book.author || '',
      categoryId: book.categoryId || '',
      year: book.year || '',
      description: book.description || '',
      summary: book.summary || '',
      pdfPath: book.pdfPath || '',
      coverFile: null,
      pdfFile: null,
      copiesTotal: book.copiesTotal || 1,
    });

    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingBook(null);
    setForm({ ...EMPTY_FORM });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((current) => ({
      ...current,
      [name]:
        name === 'copiesTotal'
          ? Number(value)
          : value,
    }));
  };

  // Validate and select the cover image.
  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast('Please select an image file.', 'error');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast('Cover image must not exceed 5 MB.', 'error');
      e.target.value = '';
      return;
    }

    setForm((current) => ({
      ...current,
      coverFile: file,
    }));
  };

  // Validate and select the book PDF.
  const handlePdfChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      toast('Please select a PDF file.', 'error');
      e.target.value = '';
      return;
    }

    setForm((current) => ({
      ...current,
      pdfFile: file,
    }));
  };

  // Save a new book or update an existing one.
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || !form.author.trim()) {
      toast('Please enter the book title and author.', 'error');
      return;
    }

    setSaving(true);

    try {
      if (editingBook) {
        await api.updateBook(editingBook.id, form);
        toast('Book updated successfully.');
      } else {
        await api.addBook(form);
        toast('Book added successfully.');
      }

      setShowForm(false);
      setEditingBook(null);
      setForm({ ...EMPTY_FORM });

      books.refetch();
    } catch (error) {
      toast(error.message || 'Something went wrong.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const items = books.data?.items || [];

  return (
    <div className="space-y-6">

      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">
            Library
          </h1>

          <p className="mt-1 text-ink-soft">
            {books.data
              ? `${books.data.total} title${books.data.total === 1 ? '' : 's'}`
              : 'Loading titles…'}

            {q && <> matching “{q}”</>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <button
              type="button"
              className="btn-primary"
              onClick={openAddForm}
            >
              + Add Book
            </button>
          )}

          <label className="text-sm">
            <span className="sr-only">
              Availability
            </span>

            <select
              className="input w-auto"
              value={status}
              onChange={(e) =>
                setFilter('status', e.target.value)
              }
            >
              {STATUSES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* CATEGORY FILTERS */}
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Categories"
      >
        <button
          className={`chip ${!category ? 'chip-on' : ''}`}
          onClick={() => setFilter('category', '')}
        >
          All
        </button>

        {(cats.data || []).map((c) => (
          <button
            key={c}
            className={`chip ${category === c ? 'chip-on' : ''}`}
            onClick={() => setFilter('category', c)}
          >
            {c}
          </button>
        ))}
      </div>

      {/* BOOK LIST */}
      {books.error ? (
        <ErrorState
          error={books.error}
          onRetry={books.refetch}
        />
      ) : !books.data && books.loading ? (
        <GridSkeleton />
      ) : items.length === 0 ? (
        canManage ? (
          <div className="rounded-xl border border-line p-8 text-center">
            <h3 className="text-lg font-bold">
              No books found
            </h3>

            <p className="mt-2 text-sm text-ink-soft">
              Add a new book to your library collection.
            </p>

            <button
              className="btn-primary mt-4"
              onClick={openAddForm}
            >
              + Add Book
            </button>
          </div>
        ) : (
          <EmptyState
            title="No books match"
            hint="Try a shorter search, or clear the category and availability filters."
            action={
              <button
                className="btn-ghost mt-2"
                onClick={() => setParams({})}
              >
                Clear filters
              </button>
            }
          />
        )
      ) : (
        <div
          className={`settle grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${
            books.loading ? 'opacity-60' : ''
          }`}
        >
          {items.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onChanged={books.refetch}
              onEdit={openEditForm}
            />
          ))}
        </div>
      )}

      {/* ADD / EDIT BOOK MODAL */}
      {showForm && canManage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeForm();
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">

            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold">
                  {editingBook ? 'Edit Book' : 'Add New Book'}
                </h2>

                <p className="mt-1 text-sm text-ink-soft">
                  Enter the book information below.
                </p>
              </div>

              <button
                type="button"
                className="btn-ghost"
                onClick={closeForm}
                disabled={saving}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >

              {/* BOOK TITLE */}
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Book Title *
                </label>

                <input
                  className="input w-full"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Enter book title"
                  required
                />
              </div>

              {/* AUTHOR */}
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Author *
                </label>

                <input
                  className="input w-full"
                  name="author"
                  value={form.author}
                  onChange={handleChange}
                  placeholder="Enter author name"
                  required
                />
              </div>

              {/* CATEGORY AND YEAR */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Category
                  </label>

                  <select
                    className="input w-full"
                    name="categoryId"
                    value={form.categoryId}
                    onChange={handleChange}
                  >
                    <option value="">
                      Select category
                    </option>

                    {(categoryRecords.data || []).map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Publication Year
                  </label>

                  <input
                    className="input w-full"
                    type="number"
                    name="year"
                    value={form.year}
                    onChange={handleChange}
                    placeholder="e.g. 2024"
                    min="0"
                  />
                </div>
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Description
                </label>

                <textarea
                  className="input w-full"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Short book description"
                  rows="3"
                />
              </div>

              {/* SUMMARY */}
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Summary
                </label>

                <textarea
                  className="input w-full"
                  name="summary"
                  value={form.summary}
                  onChange={handleChange}
                  placeholder="Book summary"
                  rows="4"
                />
              </div>

              {/* BOOK COVER UPLOAD */}
              <div className="rounded-xl border border-line p-4">
                <label className="mb-2 block text-sm font-semibold">
                  Book Cover Image
                </label>

                {editingBook?.coverImage && (
                  <div className="mb-3">
                    <img
                      src={editingBook.coverImage}
                      alt="Current book cover"
                      className="h-36 w-28 rounded-lg border border-line object-cover"
                    />

                    <p className="mt-1 text-xs text-ink-soft">
                      Current cover image
                    </p>
                  </div>
                )}

                <input
                  className="input w-full"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCoverChange}
                />

                <p className="mt-2 text-xs text-ink-soft">
                  JPG, PNG, or WEBP. Maximum size: 5 MB.
                </p>

                {form.coverFile && (
                  <p className="mt-2 text-sm text-moss">
                    Selected: {form.coverFile.name}
                  </p>
                )}

                {editingBook && (
                  <p className="mt-1 text-xs text-ink-soft">
                    Leave empty to keep the current cover.
                  </p>
                )}
              </div>

              {/* PDF UPLOAD */}
              <div className="rounded-xl border border-line p-4">
                <label className="mb-2 block text-sm font-semibold">
                  Book PDF
                </label>

                {editingBook?.pdfPath && (
                  <p className="mb-2 text-xs text-ink-soft">
                    An existing PDF is already attached.
                  </p>
                )}

                <input
                  className="input w-full"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handlePdfChange}
                />

                {form.pdfFile && (
                  <p className="mt-2 text-sm text-moss">
                    Selected: {form.pdfFile.name}
                  </p>
                )}

                {editingBook && (
                  <p className="mt-1 text-xs text-ink-soft">
                    Leave empty to keep the existing PDF.
                  </p>
                )}
              </div>

              {/* TOTAL COPIES */}
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Total Copies *
                </label>

                <input
                  className="input w-full"
                  type="number"
                  name="copiesTotal"
                  value={form.copiesTotal}
                  onChange={handleChange}
                  min="1"
                  required
                />
              </div>

              {/* FORM BUTTONS */}
              <div className="flex justify-end gap-3 border-t border-line pt-4">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving || categoryRecords.loading}
                >
                  {saving
                    ? 'Uploading and saving…'
                    : editingBook
                      ? 'Save Changes'
                      : 'Add Book'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
