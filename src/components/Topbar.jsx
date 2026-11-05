
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useDebounce } from '../hooks/useFetch.js';
import { getBooks } from '../api/supabaseApi';
import { supabase } from '../lib/supabaseClient';
import {
  formatBookSummary,
  getBookSummary,
  getBookSummaryQuery,
} from '../lib/bookSummary.js';
import Icon from './Icon.jsx';

const SEARCHABLE = ['/library', '/assets'];

export default function Topbar() {
  const [params, setParams] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [value, setValue] = useState(params.get('q') || '');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Ask me to summarize a book, describe a plot, or find a digital asset.',
    },
  ]);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const skipDebouncedUpdate = useRef(false);
  const debounced = useDebounce(value, 300);

  // Keep the search box in sync when the page changes.
  useEffect(() => {
    setValue(params.get('q') || '');
  }, [pathname]); // eslint-disable-line

  useEffect(() => {
    if (skipDebouncedUpdate.current) {
      skipDebouncedUpdate.current = false;
      return;
    }

    if ((params.get('q') || '') === debounced) return;

    if (!SEARCHABLE.includes(pathname)) {
      if (debounced) {
        navigate(`/library?q=${encodeURIComponent(debounced)}`);
      }
      return;
    }

    const next = new URLSearchParams(params);

    debounced
      ? next.set('q', debounced)
      : next.delete('q');

    setParams(next, { replace: true });
  }, [debounced]); // eslint-disable-line

  const placeholder =
    pathname === '/assets'
      ? 'Search files, tags and collections'
      : 'Search titles, authors and ISBNs';

  async function sendMessage(event) {
    event.preventDefault();
    const text = value.trim();
    if (!text || loading) return;

    const isAssetsPage = pathname === '/assets';
    const summaryQuery = getBookSummaryQuery(text);
    const isBookSummary = !isAssetsPage && summaryQuery !== null;

    setAssistantOpen(true);
    setMessages((previous) => [...previous, { role: 'user', text }]);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('library-ai', {
        body: {
          action: isAssetsPage
            ? (/(summari[sz]e|describe|overview|tell me about)/i.test(text) ? 'summarize_assets' : 'search_assets')
            : (isBookSummary ? 'summarize_book' : 'search_books'),
          query: isBookSummary ? summaryQuery : text,
        },
      });

      if (error) throw error;

      const books = Array.isArray(data?.books) ? data.books : [];
      const assets = Array.isArray(data?.assets) ? data.assets : [];
      setMessages((previous) => [...previous, {
        role: 'assistant',
        text: data?.message || (books.length || assets.length ? 'I found these matches in your library.' : 'I could not find a close match in your library.'),
        books,
        assets,
      }]);

      if (!isAssetsPage && !isBookSummary && books.length) {
        navigate(`/library?q=${encodeURIComponent(text)}`);
      }
    } catch (error) {
      console.error('Library AI request failed:', error);
      setMessages((previous) => [...previous, {
        role: 'assistant',
        text: `The AI assistant could not complete your request. ${error.message || 'Please try again.'} Make sure the library-ai Supabase Edge Function is deployed and its AI key is configured.`,
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-shelf/90 px-4 py-3 backdrop-blur sm:px-8">
      <form
        className="relative flex-1 max-w-xl"
        onSubmit={sendMessage}
      >
        <label>
          <span className="sr-only">
            Search or ask the library assistant
          </span>

          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute"
          />

          <input
            className="input pl-9 pr-16"
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              pathname === '/assets'
                ? placeholder
                : 'Describe a book plot or ask about a digital asset'
            }
            maxLength={1000}
            disabled={loading}
          />
        </label>

        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {loading ? '...' : 'Ask'}
        </button>

        {assistantOpen && (
          <section
            className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-line bg-white shadow-xl"
            aria-label="Library assistant"
          >
            <header className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <strong className="text-sm">Gyarados AI</strong>
                <p className="text-xs text-ink-soft">
                  Library &amp; Digital Asset Assistant
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAssistantOpen(false)}
                aria-label="Close assistant"
                className="rounded px-2 py-1 text-lg text-ink-soft hover:bg-shelf"
              >
                ×
              </button>
            </header>

            <div
              className="max-h-[60vh] space-y-3 overflow-y-auto bg-shelf/50 p-4"
              role="log"
              aria-live="polite"
            >
              {messages.map((message, index) => (
                <div key={index}>
                  <p
                    className={`w-fit max-w-full whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-relaxed ${
                      message.role === 'user'
                        ? 'ml-auto bg-navy text-white'
                        : 'border border-line bg-white text-ink'
                    }`}
                  >
                    {message.text}
                  </p>

                  {message.books?.map((book) => (
                    <article
                      key={book.id}
                      className="mt-2 rounded-lg border border-line bg-white p-3 text-sm"
                    >
                      <strong>{book.title}</strong>

                      <p className="mt-1 text-xs text-ink-soft">
                        By {book.author}
                      </p>

                      {(book.summary || book.description) && (
                        <p className="mt-2 leading-relaxed">
                          {getBookSummary(book)}
                        </p>
                      )}

                      {book.category && (
                        <small className="mt-2 block text-ink-mute">
                          {book.category}
                        </small>
                      )}
                    </article>
                  ))}

                  {message.assets?.map((asset) => (
                    <article key={asset.id} className="mt-2 rounded-lg border border-line bg-white p-3 text-sm">
                      <strong>{asset.title}</strong>
                      <p className="mt-1 text-xs text-ink-soft">{asset.type || asset.mime_type || 'Digital asset'}</p>
                      {asset.aiSummary && <p className="mt-2 leading-relaxed">{asset.aiSummary}</p>}
                      {asset.tags?.length > 0 && <p className="mt-2 text-xs text-ink-mute">Tags: {asset.tags.join(', ')}</p>}
                    </article>
                  ))}
                </div>
              ))}

              {loading && (
                <p className="w-fit rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink-soft">
                  Searching the library...
                </p>
              )}
            </div>
          </section>
        )}
      </form>
    </header>
  );
}
