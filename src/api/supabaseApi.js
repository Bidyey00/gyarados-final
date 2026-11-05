
import { supabase } from '../lib/supabaseClient';

// Storage bucket names.
const STORAGE_BUCKET = 'digital-assets';
const BOOK_COVERS_BUCKET = 'book-covers';
const BOOK_PDFS_BUCKET = 'book-pdfs';

// Generate a safe filename.
function safeFileName(file) {
  return file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// Upload a file to Supabase Storage.
async function uploadStorageFile(bucket, file) {
  if (!file) return null;

  const storagePath = `${crypto.randomUUID()}-${safeFileName(file)}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;

  return storagePath;
}

// Remove files from Supabase Storage.
async function removeStorageFiles(bucket, paths) {
  const validPaths = paths.filter(
    (path) =>
      path &&
      typeof path === 'string' &&
      !path.startsWith('/') &&
      !path.startsWith('http://') &&
      !path.startsWith('https://')
  );

  if (validPaths.length === 0) return;

  const { error } = await supabase.storage
    .from(bucket)
    .remove(validPaths);

  if (error) {
    console.error(`Could not remove files from ${bucket}:`, error);
  }
}

// Generate a temporary URL for a private book cover.
async function getBookCoverUrl(path) {
  if (!path) return null;

  if (
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
    return path;
  }

  const storagePath = path.replace(/^\/?book-covers\//, '');

  if (!storagePath) return null;

  const { data, error } = await supabase.storage
    .from(BOOK_COVERS_BUCKET)
    .createSignedUrl(storagePath, 3600);

  if (error) {
    console.error('Could not load book cover:', error.message);
    return null;
  }

  return data.signedUrl;
}

// Convert Supabase database fields into frontend format.
function formatBook(book, coverUrl = null) {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    description: book.description,
    summary: book.summary,
    categoryId: book.category_id,
    category: book.categories?.name || 'Uncategorized',
    year: book.publication_year,
    coverImage: coverUrl,
    coverImagePath: book.cover_image,
    pdfPath: book.pdf_path,
    copiesTotal: book.copies_total,
    copiesAvailable: book.copies_available,
    createdAt: book.created_at,
    updatedAt: book.updated_at,
  };
}

// Format a book and generate its signed cover URL.
async function formatBookWithCover(book) {
  const coverUrl = await getBookCoverUrl(book.cover_image);
  return formatBook(book, coverUrl);
}

// Get all categories as names.
export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .order('name');

  if (error) throw error;

  return data.map((category) => category.name);
}

// Get category records with IDs.
export async function getCategoryRecords() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .order('name');

  if (error) throw error;

  return data;
}

// Add a category.
export async function addCategory(name) {
  const categoryName = name?.trim();

  if (!categoryName) {
    throw new Error('Category name is required.');
  }

  const { data, error } = await supabase
    .from('categories')
    .insert({
      name: categoryName,
    })
    .select('id, name')
    .single();

  if (error) throw error;

  return data;
}

// Update a category.
export async function updateCategory(categoryId, name) {
  const categoryName = name?.trim();

  if (!categoryName) {
    throw new Error('Category name is required.');
  }

  if (!categoryId) {
    throw new Error('Category ID is required.');
  }

  const { data, error } = await supabase
    .from('categories')
    .update({
      name: categoryName,
    })
    .eq('id', categoryId)
    .select('id, name')
    .single();

  if (error) throw error;

  return data;
}

// Delete a category.
export async function deleteCategory(categoryId) {
  if (!categoryId) {
    throw new Error('Category ID is required.');
  }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId);

  if (error) throw error;

  return true;
}

// Get books with optional search, category, and availability filters.
export async function getBooks({
  q = '',
  category = '',
  status = '',
  limit,
} = {}) {
  let query = supabase
    .from('books')
    .select(`
      *,
      categories (
        name
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (q.trim()) {
    const search = q.trim().replace(/[,%()]/g, '');

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,author.ilike.%${search}%`
      );
    }
  }

  if (category && category !== 'All') {
    const { data: matchingCategories, error: categoryError } =
      await supabase
        .from('categories')
        .select('id')
        .eq('name', category);

    if (categoryError) throw categoryError;

    const ids = matchingCategories.map((item) => item.id);

    if (ids.length === 0) {
      return { items: [], total: 0 };
    }

    query = query.in('category_id', ids);
  }

  if (status === 'available') {
    query = query.gt('copies_available', 0);
  } else if (status === 'unavailable') {
    query = query.eq('copies_available', 0);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    items: await Promise.all(data.map(formatBookWithCover)),
    total: count ?? data.length,
  };
}

// Get one book by ID.
export async function getBook(id) {
  const { data, error } = await supabase
    .from('books')
    .select(`
      *,
      categories (
        name
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;

  return formatBookWithCover(data);
}

// Add a new book.
export async function addBook(book) {
  if (!book.title?.trim()) {
    throw new Error('Book title is required.');
  }

  if (!book.author?.trim()) {
    throw new Error('Book author is required.');
  }

  const total = Number(book.copiesTotal ?? 1);

  if (!Number.isInteger(total) || total < 1) {
    throw new Error('Total copies must be at least 1.');
  }

  let coverPath = book.coverImagePath || null;
  let pdfPath = book.pdfPath || null;

  try {
    if (book.coverFile) {
      coverPath = await uploadStorageFile(
        BOOK_COVERS_BUCKET,
        book.coverFile
      );
    }

    if (book.pdfFile) {
      pdfPath = await uploadStorageFile(
        BOOK_PDFS_BUCKET,
        book.pdfFile
      );
    }

    const { data, error } = await supabase
      .from('books')
      .insert({
        title: book.title.trim(),
        author: book.author.trim(),
        description: book.description?.trim() || null,
        summary: book.summary?.trim() || null,
        category_id: book.categoryId || null,
        publication_year: book.year ? Number(book.year) : null,
        cover_image: coverPath,
        pdf_path: pdfPath,
        copies_total: total,
        copies_available: total,
      })
      .select(`
        *,
        categories (
          name
        )
      `)
      .single();

    if (error) throw error;

    return formatBookWithCover(data);
  } catch (error) {
    if (book.coverFile && coverPath) {
      await removeStorageFiles(BOOK_COVERS_BUCKET, [coverPath]);
    }

    if (book.pdfFile && pdfPath) {
      await removeStorageFiles(BOOK_PDFS_BUCKET, [pdfPath]);
    }

    throw error;
  }
}

// Update an existing book.
export async function updateBook(bookId, book) {
  if (!book.title?.trim()) {
    throw new Error('Book title is required.');
  }

  if (!book.author?.trim()) {
    throw new Error('Book author is required.');
  }

  const total = Number(book.copiesTotal);

  if (!Number.isInteger(total) || total < 1) {
    throw new Error('Total copies must be at least 1.');
  }

  const { data: currentBook, error: currentError } = await supabase
    .from('books')
    .select('copies_total, copies_available, cover_image, pdf_path')
    .eq('id', bookId)
    .single();

  if (currentError) throw currentError;

  const borrowedCopies =
    currentBook.copies_total - currentBook.copies_available;

  if (total < borrowedCopies) {
    throw new Error(
      `You cannot set total copies below ${borrowedCopies}, because those copies are currently borrowed.`
    );
  }

  let coverPath = currentBook.cover_image;
  let pdfPath = currentBook.pdf_path;

  try {
    if (book.coverFile) {
      coverPath = await uploadStorageFile(
        BOOK_COVERS_BUCKET,
        book.coverFile
      );
    }

    if (book.pdfFile) {
      pdfPath = await uploadStorageFile(
        BOOK_PDFS_BUCKET,
        book.pdfFile
      );
    }

    const { data, error } = await supabase
      .from('books')
      .update({
        title: book.title.trim(),
        author: book.author.trim(),
        description: book.description?.trim() || null,
        summary: book.summary?.trim() || null,
        category_id: book.categoryId || null,
        publication_year: book.year ? Number(book.year) : null,
        cover_image: coverPath,
        pdf_path: pdfPath,
        copies_total: total,
        copies_available: total - borrowedCopies,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookId)
      .select(`
        *,
        categories (
          name
        )
      `)
      .single();

    if (error) throw error;

    if (book.coverFile && currentBook.cover_image) {
      await removeStorageFiles(
        BOOK_COVERS_BUCKET,
        [currentBook.cover_image]
      );
    }

    if (book.pdfFile && currentBook.pdf_path) {
      await removeStorageFiles(
        BOOK_PDFS_BUCKET,
        [currentBook.pdf_path]
      );
    }

    return formatBookWithCover(data);
  } catch (error) {
    if (book.coverFile && coverPath !== currentBook.cover_image) {
      await removeStorageFiles(BOOK_COVERS_BUCKET, [coverPath]);
    }

    if (book.pdfFile && pdfPath !== currentBook.pdf_path) {
      await removeStorageFiles(BOOK_PDFS_BUCKET, [pdfPath]);
    }

    throw error;
  }
}

// Delete a book.
export async function deleteBook(bookId) {
  const { data: book, error: findError } = await supabase
    .from('books')
    .select('cover_image, pdf_path')
    .eq('id', bookId)
    .single();

  if (findError) throw findError;

  const { error } = await supabase
    .from('books')
    .delete()
    .eq('id', bookId);

  if (error) throw error;

  await removeStorageFiles(BOOK_COVERS_BUCKET, [book.cover_image]);
  await removeStorageFiles(BOOK_PDFS_BUCKET, [book.pdf_path]);

  return true;
}

// Borrow a book.
export async function borrowBook(bookId) {
  const { data, error } = await supabase.rpc('borrow_book', {
    p_book_id: bookId,
  });

  if (error) throw error;

  return data;
}

// Return a borrowed book.
export async function returnBook(loanId) {
  const { error } = await supabase.rpc('return_book', {
    p_loan_id: loanId,
  });

  if (error) throw error;

  return true;
}

function formatLoan(loan) {
  return {
    id: loan.id,
    bookId: loan.book_id,
    bookTitle: loan.books?.title || 'Unknown book',
    member: loan.profiles?.full_name || 'Unknown member',
    memberId: loan.member_id,
    borrowedAt: loan.borrowed_at,
    dueAt: loan.due_at,
    returnedAt: loan.returned_at,
    status:
      loan.status === 'active' &&
      new Date(loan.due_at) < new Date()
        ? 'overdue'
        : loan.status,
  };
}

// Get borrowing records.
export async function getLoans({ status = '', limit } = {}) {
  let query = supabase
    .from('loans')
    .select(`
      *,
      books (title),
      profiles (full_name)
    `)
    .order('borrowed_at', { ascending: false });

  if (status && status !== 'all') {
    if (status === 'overdue') {
      query = query
        .eq('status', 'active')
        .lt('due_at', new Date().toISOString());
    } else {
      query = query.eq('status', status);
    }
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) throw error;

  return {
    items: data.map(formatLoan),
    total: data.length,
  };
}

// Format a digital asset.
function formatAsset(asset, signedUrl = null) {
  return {
    id: asset.id,
    title: asset.title,
    type: asset.type,
    format: asset.mime_type,
    mimeType: asset.mime_type,
    sizeBytes: Number(asset.size_bytes),
    tags: asset.tags || [],
    collection: asset.collection_name,
    ownerId: asset.owner_id,
    owner: asset.profiles?.full_name || 'You',
    createdAt: asset.created_at,
    storagePath: asset.storage_path,
    url: signedUrl,
    thumbnailUrl: null,
  };
}

// Retrieve digital assets.
export async function getAssets({ q = '', type = '' } = {}) {
  let query = supabase
    .from('digital_assets')
    .select(`
      *,
      profiles (full_name)
    `)
    .order('created_at', { ascending: false });

  if (q.trim()) {
    query = query.ilike('title', `%${q.trim()}%`);
  }

  if (type && type !== 'all') {
    query = query.eq('type', type);
  }

  const { data, error } = await query;

  if (error) throw error;

  const items = await Promise.all(
    data.map(async (asset) => {
      const { data: signed, error: signedError } = await supabase
        .storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(asset.storage_path, 3600);

      if (signedError) throw signedError;

      return formatAsset(asset, signed.signedUrl);
    })
  );

  return {
    items,
    total: items.length,
  };
}

// Upload a digital asset.
export async function uploadAsset({ file, title, tags = [] }, userId) {
  if (!file) throw new Error('Please select a file.');

  if (!userId) throw new Error('You must be logged in to upload files.');

  const safeName = safeFileName(file);
  const storagePath = `${userId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const mimeType = file.type || 'application/octet-stream';
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  let type = 'document';

  if (mimeType.startsWith('image/')) type = 'image';
  else if (mimeType.startsWith('video/')) type = 'video';
  else if (mimeType.startsWith('audio/')) type = 'audio';
  else if (extension === 'pdf') type = 'pdf';

  const { data, error: insertError } = await supabase
    .from('digital_assets')
    .insert({
      owner_id: userId,
      title: title || file.name,
      storage_path: storagePath,
      mime_type: mimeType,
      type,
      size_bytes: file.size,
      tags,
      collection_name: 'Unsorted',
    })
    .select()
    .single();

  if (insertError) {
    await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath]);

    throw insertError;
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 3600);

  if (signedError) throw signedError;

  return formatAsset(data, signed.signedUrl);
}

// Delete a digital asset and its stored file.
export async function deleteAsset(assetId) {
  const { data: asset, error: findError } = await supabase
    .from('digital_assets')
    .select('storage_path')
    .eq('id', assetId)
    .single();

  if (findError) throw findError;

  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([asset.storage_path]);

  if (storageError) throw storageError;

  const { error: deleteError } = await supabase
    .from('digital_assets')
    .delete()
    .eq('id', assetId);

  if (deleteError) throw deleteError;

  return true;
}

// Get dashboard statistics.
export async function getStats() {
  const [
    booksResult,
    loansResult,
    assetsResult,
  ] = await Promise.all([
    supabase
      .from('books')
      .select('copies_total, copies_available'),

    supabase
      .from('loans')
      .select('id, status, due_at, returned_at'),

    supabase
      .from('digital_assets')
      .select('size_bytes'),
  ]);

  if (booksResult.error) throw booksResult.error;
  if (loansResult.error) throw loansResult.error;
  if (assetsResult.error) throw assetsResult.error;

  const books = booksResult.data;
  const loans = loansResult.data;
  const assets = assetsResult.data;

  const now = new Date();

  const activeLoans = loans.filter(
    (loan) =>
      loan.status === 'active' &&
      !loan.returned_at
  );

  const overdueLoans = activeLoans.filter(
    (loan) => new Date(loan.due_at) < now
  );

  const storageUsedBytes = assets.reduce(
    (total, asset) => total + Number(asset.size_bytes),
    0
  );

  return {
    totalBooks: books.reduce(
      (total, book) => total + book.copies_total,
      0
    ),
    availableCopies: books.reduce(
      (total, book) => total + book.copies_available,
      0
    ),
    activeLoans: activeLoans.length,
    overdueLoans: overdueLoans.length,
    totalAssets: assets.length,
    storageUsedMb: storageUsedBytes / (1024 * 1024),
    storageQuotaMb: 1024,
  };
}

// Compatibility API for existing React pages.
export const api = {
  stats: () => getStats(),

  categories: () => getCategories(),
  categoryRecords: () => getCategoryRecords(),
  addCategory: (name) => addCategory(name),
  updateCategory: (id, name) => updateCategory(id, name),
  deleteCategory: (id) => deleteCategory(id),

  books: (params = {}) => getBooks(params),
  book: (id) => getBook(id),
  addBook: (book) => addBook(book),
  updateBook: (id, book) => updateBook(id, book),
  deleteBook: (id) => deleteBook(id),

  borrowBook: (id) => borrowBook(id),
  loans: (params = {}) => getLoans(params),
  returnLoan: (id) => returnBook(id),

  assets: (params = {}) => getAssets(params),
  deleteAsset: (id) => deleteAsset(id),
};





