import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // İtokent Urla — brand palette, refined.
        // Primary: deep sage-emerald (from the İtokent logo)
        // Secondary: petrol-teal (from the "Urla" script)
        // Neutrals: warm ivory + charcoal
        // Accent: whisper of champagne-brass (edel, never flashy)

        // Primary — İtokent green, taken darker & more sophisticated than the original logo
        itokent: {
          50:  "#f1f7f2",
          100: "#dcecdf",
          200: "#bbd9c1",
          300: "#8fbf9c",
          400: "#5fa072",
          500: "#3f8553",
          600: "#2f6b41",
          700: "#275636",
          800: "#21472d",
          900: "#153020",
          950: "#0a1e13",
        },

        // Secondary — "Urla" petrol teal
        teal: {
          50:  "#eff7f9",
          100: "#d6eaee",
          200: "#a9d1da",
          300: "#72b2c0",
          400: "#488fa0",
          500: "#2f7487",
          600: "#245d6f",
          700: "#1f4c5a",
          800: "#1b3e4a",
          900: "#11303b",
          950: "#081e25",
        },

        // Warm ivory canvas
        ivory: {
          50:  "#fcfaf5",
          100: "#f8f4ea",
          200: "#f0e7d2",
          300: "#e6d7b2",
          400: "#d8c18a",
          500: "#c9aa63",
          600: "#a98847",
          700: "#836a37",
          800: "#62502a",
          900: "#463923",
        },

        // Champagne / brass — used extremely sparingly
        brass: {
          50:  "#faf6ec",
          100: "#f2e9cf",
          200: "#e4d19b",
          300: "#d4b466",
          400: "#c29a44",
          500: "#a47f35",
          600: "#82632a",
          700: "#634b22",
          800: "#47361c",
          900: "#302514",
        },

        // Deep charcoal for body copy on light surfaces
        ink: {
          50:  "#f6f5f2",
          100: "#e7e5dd",
          200: "#c8c5b8",
          300: "#a19d8f",
          400: "#6e6b60",
          500: "#464338",
          600: "#343125",
          700: "#27241a",
          800: "#1a1810",
          900: "#0e0c07",
        },

        // ─── Legacy aliases ──────────────────────────────────────────
        // Previous palette names mapped to the new İtokent refined palette,
        // so existing `forest-xxx`, `gold-xxx`, `cream-xxx` classes keep
        // working and automatically pick up the new edler colors.
        forest: {
          50:  "#f1f7f2",
          100: "#dcecdf",
          200: "#bbd9c1",
          300: "#8fbf9c",
          400: "#5fa072",
          500: "#3f8553",
          600: "#2f6b41",
          700: "#275636",
          800: "#21472d",
          900: "#153020",
          950: "#0a1e13",
        },
        gold: {
          50:  "#faf6ec",
          100: "#f2e9cf",
          200: "#e4d19b",
          300: "#d4b466",
          400: "#c29a44",
          500: "#a47f35",
          600: "#82632a",
          700: "#634b22",
          800: "#47361c",
          900: "#302514",
          950: "#1a1409",
        },
        cream: {
          50:  "#fcfaf5",
          100: "#f8f4ea",
          200: "#f0e7d2",
          300: "#e6d7b2",
          400: "#d8c18a",
          500: "#c9aa63",
          600: "#a98847",
          700: "#836a37",
          800: "#62502a",
          900: "#463923",
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        script: ['"Dancing Script"', '"Brush Script MT"', 'cursive'],
      },
      letterSpacing: {
        'logo': '0.18em',
        'widest-plus': '0.28em',
      },
      boxShadow: {
        // Edel means: soft, low-contrast shadows. No glow, no drama.
        'edel': '0 2px 8px -2px rgba(21, 48, 32, 0.06), 0 12px 28px -12px rgba(21, 48, 32, 0.12)',
        'edel-lg': '0 4px 12px -4px rgba(21, 48, 32, 0.08), 0 24px 48px -24px rgba(21, 48, 32, 0.18)',
        'inner-ivory': 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
        // Legacy aliases
        'luxury': '0 4px 12px -4px rgba(21, 48, 32, 0.08), 0 24px 48px -24px rgba(21, 48, 32, 0.18)',
        'gold-glow': '0 0 24px rgba(164, 127, 53, 0.25)',
      },
      backgroundImage: {
        'gradient-itokent': 'linear-gradient(135deg, #21472d 0%, #275636 50%, #153020 100%)',
        'gradient-teal': 'linear-gradient(135deg, #245d6f 0%, #2f7487 50%, #1b3e4a 100%)',
        'gradient-brass': 'linear-gradient(135deg, #a47f35 0%, #d4b466 55%, #a47f35 100%)',
        // Legacy aliases — old class names remapped to the new refined gradients
        'gradient-gold':   'linear-gradient(135deg, #a47f35 0%, #d4b466 55%, #a47f35 100%)',
        'gradient-forest': 'linear-gradient(135deg, #21472d 0%, #275636 50%, #153020 100%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
