
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getBook, getLoans } from '../api/supabaseApi';
import { supabase } from '../lib/supabaseClient';
import { useFetch } from '../hooks/useFetch.js';
import Icon from '../components/Icon.jsx';
import { ErrorState } from '../components/States.jsx';

export default function BookReader() {
  const { id } = useParams();
  const book = useFetch(() => getBook(id), [id]);

  const [access, setAccess] = useState({
    loading: true,
    allowed: false,
    error: null,
  });

  const [pdf, setPdf] = useState({
    src: null,
    downloadUrl: null,
    loading: false,
    error: null,
  });

  const [retryCount, setRetryCount] = useState(0);

  const checkAccess = useCallback(async () => {
    setAccess({
      loading: true,
      allowed: false,
      error: null,
    });

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setAccess({
          loading: false,
          allowed: false,
          error: null,
        });
        return;
      }

      const result = await getLoans({ status: 'active' });

      const hasActiveLoan = result.items.some(
        (loan) =>
          String(loan.bookId) === String(id) &&
          String(loan.memberId) === String(user.id) &&
          loan.status === 'active'
      );

      setAccess({
        loading: false,
        allowed: hasActiveLoan,
        error: null,
      });
    } catch (error) {
      setAccess({
        loading: false,
        allowed: false,
        error,
      });
    }
  }, [id]);

  // Check borrowing permission on page load.
  useEffect(() => {
    checkAccess();
  }, [checkAccess, retryCount]);

  // Recheck when returning to the website.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        checkAccess();
      }
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [checkAccess]);

  // Generate signed URLs only after confirming an active loan.
  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      if (
        book.loading ||
        access.loading ||
        !access.allowed ||
        !book.data
      ) {
        setPdf({
          src: null,
          downloadUrl: null,
          loading: false,
          error: null,
        });
        return;
      }

      const pdfPath = book.data.pdfPath;

      if (!pdfPath) {
        setPdf({
          src: null,
          downloadUrl: null,
          loading: false,
          error: new Error('No PDF is linked to this book.'),
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
        const storage = supabase.storage.from('book-pdfs');

        const [viewResult, downloadResult] = await Promise.all([
          storage.createSignedUrl(pdfPath, 14400),
          storage.createSignedUrl(pdfPath, 14400, {
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
  }, [
    book.data,
    book.loading,
    access.allowed,
    access.loading,
  ]);

  const title = book.data?.title || 'Book';

  const retry = () => {
    setRetryCount((count) => count + 1);
  };

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

        {access.allowed && pdf.src && (
          <div className="flex flex-wrap gap-2">
            <a
              className="btn-ghost"
              href={pdf.src}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in new tab
            </a>

            <a
              className="btn-primary"
              href={pdf.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon
                name="download"
                className="h-4 w-4"
              />
              Download PDF
            </a>
          </div>
        )}
      </div>

      {book.error ? (
        <ErrorState
          error={book.error}
          onRetry={() => {
            book.refetch();
            retry();
          }}
        />
      ) : book.loading || access.loading ? (
        <div
          className="panel skeleton h-[60vh]"
          role="status"
          aria-label="Checking book access"
        />
      ) : access.error ? (
        <ErrorState
          error={access.error}
          onRetry={retry}
        />
      ) : !access.allowed ? (
        <div className="panel p-8 text-center space-y-5">
          <div className="text-5xl">
            🔒
          </div>

          <h2 className="text-2xl font-bold">
            Borrow Required
          </h2>

          <p className="mx-auto max-w-md text-ink-soft">
            You must borrow this book before you can
            read or download its PDF.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/library"
              className="btn-primary"
            >
              Go to Library to Borrow
            </Link>

            <button
              type="button"
              onClick={retry}
              className="btn-ghost"
            >
              Check Access Again
            </button>
          </div>
        </div>
      ) : pdf.error ? (
        <ErrorState
          error={pdf.error}
          onRetry={retry}
        />
      ) : pdf.loading || !pdf.src ? (
        <div
          className="panel skeleton h-[70vh]"
          role="status"
          aria-label="Loading the book"
        />
      ) : (
        <>
          {/* Mobile reader fallback */}
          <div className="panel space-y-4 p-6 text-center md:hidden">
            <h2 className="text-xl font-bold">
              Your Book is Unlocked
            </h2>

            <p className="text-sm text-gray-600">
              Your borrowing access is active.
              You can open or download the PDF.
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              <a
                href={pdf.src}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Open PDF
              </a>

              <a
                href={pdf.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
              >
                Download PDF
              </a>
            </div>
          </div>

          {/* Desktop PDF viewer */}
          <iframe
            title={`${title} (PDF)`}
            src={pdf.src}
            className="panel hidden h-[calc(100vh-15rem)] min-h-[480px] w-full md:block"
          />
        </>
      )}
    </div>
  );
}
