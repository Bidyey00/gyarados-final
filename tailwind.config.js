/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        shelf: '#ecf3f9',      // page background, a cool near-white like the fins
        navy: { DEFAULT: '#0f3d6e', 700: '#175089', 800: '#0a2d52' },   // the crest
        ink: { DEFAULT: '#11263b', soft: '#465d75', mute: '#768aa0' },
        line: '#d3e0ec',
        saffron: { DEFAULT: '#f5dc7b', 600: '#e0c03f', 50: '#fdf8e2' }, // the belly
        teal: { DEFAULT: '#0b79b8', 700: '#085f93', 50: '#e2f3fc' },     // the body blue, dark enough for text
        sky: '#27b1f0',        // the body blue at full brightness, for decoration only
        brick: { DEFAULT: '#cf2a52', 50: '#fcebef' },                    // the eyes
        moss: { DEFAULT: '#2f8a63', 50: '#e5f4ec' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        lift: '0 1px 0 rgba(13,34,64,.06), 0 8px 24px -12px rgba(13,34,64,.25)',
      },
    },
  },
  plugins: [],
};
