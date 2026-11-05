
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';

const WELCOME_MESSAGE = {
  role: 'assistant',
  content:
    "Hi! I'm Gyarados AI, your InfoMatrix library assistant. 📚\n\n" +
    "You can ask me about books, availability, programming, " +
    "research, and other school-related questions!",
  books: [],
};

function BookResults({ books, onNavigate }) {
  if (!Array.isArray(books) || books.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      {books.map((book) => (
        <div
          key={book.id}
          className="rounded-xl border border-gray-200 bg-white p-3 text-gray-900 shadow-sm"
        >
          <div className="flex items-start gap-2">
            <span className="text-xl">📖</span>

            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-bold">
                {book.title}
              </p>

              <p className="mt-1 text-xs text-gray-600">
                Author: {book.author}
              </p>

              <p className="text-xs text-gray-600">
                Category: {book.category}
              </p>

              <p className="mt-2 text-xs font-semibold">
                {book.copiesAvailable > 0 ? (
                  <span className="text-green-700">
                    ● {book.copiesAvailable} of{' '}
                    {book.copiesTotal} copies available
                  </span>
                ) : (
                  <span className="text-red-600">
                    ● Currently unavailable
                  </span>
                )}
              </p>

              <Link
                to={book.url}
                onClick={onNavigate}
                className="mt-3 inline-block rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
              >
                View in Library →
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    WELCOME_MESSAGE,
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'smooth',
      });
    }
  }, [messages, open, loading]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const sendMessage = async (event) => {
    event?.preventDefault();

    const text = input.trim();

    if (!text || loading || sendingRef.current) {
      return;
    }

    sendingRef.current = true;
    setLoading(true);
    setInput('');

    const userMessage = {
      role: 'user',
      content: text,
      books: [],
    };

    const updatedMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(updatedMessages);

    try {
      const payload = updatedMessages
        .filter(
          (message) =>
            message !== WELCOME_MESSAGE &&
            (message.role === 'user' ||
              message.role === 'assistant')
        )
        .slice(-10)
        .map(({ role, content }) => ({
          role,
          content,
        }));

      const { data, error } =
        await supabase.functions.invoke('ai-chat', {
          body: {
            messages: payload,
          },
        });

      if (error) {
        throw error;
      }

      if (
        !data ||
        typeof data.reply !== 'string' ||
        !data.reply.trim()
      ) {
        throw new Error(
          'The AI returned an invalid response.'
        );
      }

      const assistantMessage = {
        role: 'assistant',
        content: data.reply,
        books: Array.isArray(data.books)
          ? data.books
          : [],
      };

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);
    } catch (error) {
      console.error('Gyarados AI Error:', error);

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            'Sorry, I could not process your request right now. ' +
            'Please try again in a moment.',
          books: [],
          isError: true,
        },
      ]);
    } finally {
      sendingRef.current = false;
      setLoading(false);
    }
  };

  const clearChat = () => {
    if (loading) return;

    setMessages([WELCOME_MESSAGE]);
    setInput('');
  };

  return (
    <div className="fixed bottom-5 right-5 z-[100]">
      {/* CHAT WINDOW */}
      {open && (
        <section
          role="dialog"
          aria-label="Gyarados AI Assistant"
          className="mb-4 flex h-[min(600px,75vh)] w-[min(380px,calc(100vw-40px))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        >
          {/* HEADER */}
          <div className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-xl">
                🤖
              </div>

              <div>
                <h2 className="text-sm font-bold">
                  Gyarados AI
                </h2>
                <p className="text-xs text-slate-300">
                  InfoMatrix Library Assistant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearChat}
                disabled={loading}
                title="Clear conversation"
                aria-label="Clear conversation"
                className="rounded-lg px-2 py-1 text-sm hover:bg-slate-700 disabled:opacity-50"
              >
                ↻
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chatbot"
                className="rounded-lg px-2 py-1 text-xl hover:bg-slate-700"
              >
                ×
              </button>
            </div>
          </div>

          {/* MESSAGES */}
          <div
            aria-live="polite"
            className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4"
          >
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user'
                    ? 'justify-end'
                    : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-3 py-3 text-sm shadow-sm ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.isError
                        ? 'border border-red-200 bg-red-50 text-red-800'
                        : 'border border-gray-200 bg-white text-gray-800'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <p className="mb-2 text-xs font-bold text-blue-600">
                      Gyarados AI
                    </p>
                  )}

                  <p className="whitespace-pre-wrap break-words leading-relaxed">
                    {message.content}
                  </p>

                  <BookResults
                    books={message.books}
                    onNavigate={() => setOpen(false)}
                  />
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm">
                  <span className="animate-pulse">
                    Gyarados AI is thinking...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* INPUT */}
          <form
            onSubmit={sendMessage}
            className="border-t border-gray-200 bg-white p-3"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();

                    if (!loading) {
                      sendMessage();
                    }
                  }
                }}
                placeholder="Ask about books or anything..."
                rows={2}
                maxLength={2000}
                disabled={loading}
                className="min-h-[44px] flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? '...' : 'Send'}
              </button>
            </div>

            <p className="mt-2 text-center text-[10px] text-gray-400">
              AI responses may contain mistakes.
              Book availability comes from the library database.
            </p>
          </form>
        </section>
      )}

      {/* FLOATING CHAT BUTTON */}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={
          open
            ? 'Close Gyarados AI'
            : 'Open Gyarados AI'
        }
        aria-expanded={open}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-2xl text-white shadow-xl transition hover:scale-105 hover:bg-blue-700"
      >
        {open ? '×' : '🤖'}
      </button>
    </div>
  );
}
