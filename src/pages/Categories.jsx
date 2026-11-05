
import { useCallback, useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import {
  getCategoryRecords,
  addCategory,
  updateCategory,
  deleteCategory,
} from '../api/supabaseApi.js';

export default function Categories() {
  const { user } = useAuth();
  const toast = useToast();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [editingId, setEditingId] = useState(null);

  const canManage =
    user?.role === 'admin' || user?.role === 'librarian';

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const records = await getCategoryRecords();
      setCategories(records);
    } catch (error) {
      console.error('Could not load categories:', error);
      toast.error(error.message || 'Could not load categories.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  function resetForm() {
    setCategoryName('');
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const name = categoryName.trim();

    if (!name) {
      toast.error('Please enter a category name.');
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        await updateCategory(editingId, name);
        toast.success('Category updated successfully.');
      } else {
        await addCategory(name);
        toast.success('Category added successfully.');
      }

      resetForm();
      await loadCategories();
    } catch (error) {
      console.error('Category save error:', error);
      toast.error(error.message || 'Could not save category.');
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(category) {
    setEditingId(category.id);
    setCategoryName(category.name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(category) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${category.name}"?`
    );

    if (!confirmed) return;

    try {
      await deleteCategory(category.id);
      toast.success('Category deleted successfully.');
      await loadCategories();

      if (editingId === category.id) {
        resetForm();
      }
    } catch (error) {
      console.error('Category delete error:', error);
      toast.error(
        error.message ||
        'Could not delete category. It may still be assigned to books.'
      );
    }
  }

  if (!canManage) {
    return (
      <div className="rounded-2xl border border-line bg-white p-8 text-center">
        <Icon
          name="lock"
          className="mx-auto mb-3 h-8 w-8 text-ink-mute"
        />
        <h2 className="text-lg font-bold text-navy">
          Access restricted
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          Only librarians and administrators can manage categories.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Page heading */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal">
          Library organization
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-navy">
          Category Management
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Organize your library books by creating and managing categories.
        </p>
      </div>

      {/* Category form */}
      <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-shelf p-3 text-navy">
            <Icon name="folder" className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-bold text-navy">
              {editingId ? 'Edit category' : 'Add new category'}
            </h2>
            <p className="text-xs text-ink-mute">
              {editingId
                ? 'Change the name of this category.'
                : 'Create a category for organizing books.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            placeholder="Enter category name..."
            maxLength={100}
            disabled={saving}
            className="min-w-0 flex-1 rounded-xl border border-line bg-shelf px-4 py-3 text-sm text-navy outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/10"
          />

          <button
            type="submit"
            disabled={saving || !categoryName.trim()}
            className="btn-primary justify-center px-5 py-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon
              name={editingId ? 'check' : 'plus'}
              className="h-4 w-4"
            />
            {saving
              ? 'Saving...'
              : editingId
                ? 'Save changes'
                : 'Add category'}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="btn-ghost justify-center px-5 py-3"
            >
              Cancel
            </button>
          )}
        </form>
      </section>

      {/* Category list */}
      <section className="rounded-2xl border border-line bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
          <div>
            <h2 className="font-bold text-navy">Existing categories</h2>
            <p className="mt-1 text-xs text-ink-mute">
              Manage the categories currently stored in Supabase.
            </p>
          </div>

          <span className="rounded-full bg-shelf px-3 py-1.5 text-xs font-bold text-navy">
            {categories.length} categories
          </span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-ink-soft">
            Loading categories...
          </div>
        ) : categories.length === 0 ? (
          <div className="p-10 text-center">
            <Icon
              name="folder-open"
              className="mx-auto mb-3 h-9 w-9 text-ink-mute"
            />
            <p className="font-semibold text-navy">
              No categories found
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Add your first category using the form above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {categories.map((category, index) => (
              <div
                key={category.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-shelf/50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-shelf text-navy">
                    <Icon name="folder" className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy">
                      {category.name}
                    </p>
                    <p className="text-xs text-ink-mute">
                      Category {index + 1}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(category)}
                    className="btn-ghost px-3 py-2 text-xs"
                    title="Edit category"
                  >
                    <Icon name="edit" className="h-4 w-4" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(category)}
                    className="btn-ghost px-3 py-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                    title="Delete category"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
