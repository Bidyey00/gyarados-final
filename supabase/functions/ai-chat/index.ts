
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `
You are Gyarados AI, the Hybrid AI Assistant for
InfoMatrix Digital Library and Asset Management System.

You help students and library users with:
- Books and reading recommendations
- Library navigation and borrowing guidance
- Programming and educational questions
- Research and study assistance
- General academic explanations

Respond in Filipino, English, or Taglish depending
on the user's language.

The library catalog is located at /library.
Users can view borrowing records at /loans.

Never invent book availability, loan status,
or database records.

For live book searches, the backend retrieves
actual catalog records from Supabase.

For general questions, you do not have access
to private database information.

Never reveal private user information.
`;

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type DatabaseBook = {
  id: string;
  title: string;
  author: string;
  description: string | null;
  copies_available: number;
  copies_total: number;
  categories: {
    name: string;
  }[] | null;
};

type BookResult = {
  id: string;
  title: string;
  author: string;
  category: string;
  description: string | null;
  copiesAvailable: number;
  copiesTotal: number;
  url: string;
};

type GeminiPart = {
  text?: string;
};

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: GeminiPart[];
    };
  }[];
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function getBookSearchTerm(message: string): string | null {
  const text = message.trim();

  const patterns = [
    /(?:meron|mayroon|may|available|hanapin|hanap|search|find|locate|look for|do you have|where can i find|where is)\s+(?:ba\s+)?(?:kayong\s+|kayo\s+|ng\s+|ang\s+|yung\s+|si\s+|the\s+|a\s+|an\s+|book\s+|books\s+|libro\s+|aklat\s+|titled\s+|called\s+|about\s+)*(.+)/i,
    /(?:book|libro|aklat)\s+(?:na\s+|about\s+|titled\s+|called\s+)?(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) {
      const term = match[1]
        .replace(/[?.!]+$/g, '')
        .replace(
          /\s+(?:sa library|sa catalog|in the library|in your library|ninyo|nyo|please|po)$/i,
          '',
        )
        .trim();

      if (term.length >= 2 && term.length <= 100) {
        return term;
      }
    }
  }

  return null;
}

function safeSearch(value: string): string {
  return value
    .replace(/[,%()*\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    // AUTHENTICATION
    const authHeader = req.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    const supabaseKey =
      Deno.env.get('SUPABASE_ANON_KEY') ||
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY');

    const geminiKey = Deno.env.get('GEMINI_API_KEY');

    if (!supabaseUrl || !supabaseKey || !geminiKey) {
      return json(
        { error: 'Server configuration missing' },
        500,
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const token = authHeader.slice(7);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    // VALIDATE MESSAGES
    let body: { messages?: ChatMessage[] };

    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }

    const messages = body.messages;

    if (
      !Array.isArray(messages) ||
      messages.length === 0 ||
      messages.length > 10 ||
      !messages.every(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim().length > 0 &&
          m.content.length <= 2000
      ) ||
      messages[messages.length - 1].role !== 'user'
    ) {
      return json({ error: 'Invalid messages' }, 400);
    }

    const latestMessage =
      messages[messages.length - 1].content.trim();

    const searchTerm = getBookSearchTerm(latestMessage);

    // REAL-TIME BOOK LOCATOR
    if (searchTerm) {
      const cleaned = safeSearch(searchTerm);

      if (!cleaned) {
        return json({
          reply: 'Please enter a book title or author.',
          books: [],
        });
      }

      const searchCatalog = async (term: string) => {
        return await supabase
          .from('books')
          .select(`
            id,
            title,
            author,
            description,
            copies_available,
            copies_total,
            categories(name)
          `)
          .or(
            `title.ilike.%${term}%,author.ilike.%${term}%`,
          )
          .limit(5);
      };

      let { data, error } = await searchCatalog(cleaned);

      if (error) {
        console.error(
          'Book search failed:',
          error.message,
        );

        return json(
          { error: 'Unable to search library catalog' },
          500,
        );
      }

      // FALLBACK SEARCH
      if (!data?.length) {
        const words = cleaned.split(' ').filter(Boolean);

        if (words.length > 1) {
          const shorter = words
            .filter(
              (word) =>
                ![
                  'the',
                  'a',
                  'an',
                  'by',
                  'ni',
                  'ng',
                  'sa',
                  'book',
                  'libro',
                  'aklat',
                ].includes(word.toLowerCase()),
            )
            .slice(0, 3);

          for (const word of shorter) {
            if (word.length < 3) continue;

            const result = await searchCatalog(word);

            if (result.error) {
              console.error(
                'Fallback search failed:',
                result.error.message,
              );

              return json(
                {
                  error:
                    'Unable to search library catalog',
                },
                500,
              );
            }

            if (result.data?.length) {
              data = result.data;
              break;
            }
          }
        }
      }

      // FORMAT DATABASE RESULTS
      const databaseBooks = (data || []) as DatabaseBook[];

      const books: BookResult[] = databaseBooks.map(
        (book) => ({
          id: String(book.id),
          title: book.title,
          author: book.author,
          category:
            book.categories?.[0]?.name ||
            'Uncategorized',
          description: book.description,
          copiesAvailable: Number(
            book.copies_available ?? 0,
          ),
          copiesTotal: Number(
            book.copies_total ?? 0,
          ),
          url:
            '/library?q=' +
            encodeURIComponent(book.title),
        }),
      );

      if (books.length === 0) {
        return json({
          reply:
            `Wala akong nakitang matching book para sa "${cleaned}" ` +
            'sa library catalog. Try another title or author.',
          books: [],
        });
      }

      const reply =
        books.length === 1
          ? `Nakakita ako ng 1 matching book para sa "${cleaned}".`
          : `Nakakita ako ng ${books.length} matching books para sa "${cleaned}".`;

      return json({
        reply,
        books,
      });
    }

    // GEMINI AI FOR GENERAL QUESTIONS
    const model =
      Deno.env.get('GEMINI_MODEL') ||
      'gemini-3.5-flash-lite';

    const contents = messages.map((message) => ({
      role:
        message.role === 'assistant'
          ? 'model'
          : 'user',
      parts: [
        {
          text: message.content,
        },
      ],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: SYSTEM_PROMPT,
              },
            ],
          },
          contents,
          generationConfig: {
            maxOutputTokens: 700,
          },
        }),
      },
    );

    if (!response.ok) {
      console.error(
        'Gemini API error:',
        response.status,
      );

      return json(
        {
          error:
            response.status === 429
              ? 'Gemini quota exceeded'
              : 'AI service unavailable',
        },
        response.status === 429 ? 429 : 502,
      );
    }

    const result: GeminiResponse =
      await response.json();

    const reply = result.candidates?.[0]?.content?.parts
      ?.filter(
        (part: GeminiPart) =>
          typeof part.text === 'string',
      )
      .map(
        (part: GeminiPart) => part.text,
      )
      .join('')
      .trim();

    if (!reply) {
      return json(
        { error: 'Empty AI response' },
        502,
      );
    }

    return json({
      reply,
      books: [],
    });
  } catch (error) {
    console.error('AI Chat Error:', error);

    return json(
      { error: 'Internal server error' },
      500,
    );
  }
});
