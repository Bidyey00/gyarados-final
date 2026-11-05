
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getBook } from '../api/supabaseApi';
import { supabase } from '../lib/supabaseClient';
import { useFetch } from '../hooks/useFetch.js';
import Icon from '../components/Icon.jsx';
import { ErrorState } from '../components/States.jsx';

export default function BookReader() {
  const { id } = useParams();

  // Get book information from Supabase.
  const book = useFetch(() => getBook(id), [id]);

  const [pdf, setPdf] = useState({
    src: null,
    downloadUrl: null,
    loading: true,
    error: null,
  });

  const [retryCount, setRetryCount] = useState(0);

  // Generate secure signed URLs for the book PDF.
  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      if (book.loading) return;

      if (book.error) {
        setPdf({
          src: null,
          downloadUrl: null,
          loading: false,
          error: book.error,
        });
        return;
      }

      if (!book.data) return;

      const pdfPath = book.data.pdfPath;

      if (!pdfPath) {
        setPdf({
          src: null,
          downloadUrl: null,
          loading: false,
          error: new Error('No PDF file is linked to this book.'),
        });
        return;
      }

      setPdf({
        src: null,
        downloadUrl: null,
        loading: true,
        error: null,
      });

      try {
        const [viewResult, downloadResult] = await Promise.all([
          supabase.storage
            .from('book-pdfs')
            .createSignedUrl(pdfPath, 14400),

          supabase.storage
            .from('book-pdfs')
            .createSignedUrl(pdfPath, 14400, {
              download: `${book.data.title}.pdf`,
            }),
        ]);

        if (viewResult.error) throw viewResult.error;
        if (downloadResult.error) throw downloadResult.error;

        if (cancelled) return;

        setPdf({
          src: viewResult.data.signedUrl,
          downloadUrl: downloadResult.data.signedUrl,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (cancelled) return;

        setPdf({
          src: null,
          downloadUrl: null,
          loading: false,
          error,
        });
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [book.data, book.loading, book.error, retryCount]);

  const title = book.data?.title || 'Book';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            to="/library"
            className="text-sm text-teal-700 hover:underline"
          >
            Back to library
          </Link>

          <h1 className="mt-1 text-3xl font-extrabold">
            {title}
          </h1>

          {book.data && (
            <p className="mt-1 text-ink-soft">
              {book.data.author} · {book.data.category} · {book.data.year}
            </p>
          )}
        </div>

        {pdf.src && (
          <div className="flex gap-2">
            <a
              className="btn-ghost"
              href={pdf.src}
              target="_blank"
              rel="noreferrer"
            >
              Open in new tab
            </a>

            <a
              className="btn-primary"
              href={pdf.downloadUrl}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="download" className="h-4 w-4" />
              Download PDF
            </a>
          </div>
        )}
      </div>

      {pdf.error ? (
        <ErrorState
          error={pdf.error}
          onRetry={() => setRetryCount((count) => count + 1)}
        />
      ) : pdf.loading || !pdf.src ? (
        <div
          className="panel skeleton h-[70vh]"
          role="status"
          aria-label="Loading the book"
        />
      ) : (
        <iframe
          title={`${title} (PDF)`}
          src={pdf.src}
          className="panel h-[calc(100vh-15rem)] min-h-[480px] w-full"
        />
      )}
    </div>
  );
}
