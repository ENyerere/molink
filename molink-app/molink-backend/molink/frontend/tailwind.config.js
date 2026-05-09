/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 使用 CSS 变量定义的语义化颜色
        theme: {
          base: 'rgb(var(--color-theme-base) / <alpha-value>)',
          surface: 'rgb(var(--color-theme-surface) / <alpha-value>)',
          accent: 'rgb(var(--color-theme-accent) / <alpha-value>)',
        },
        // 语义化文本颜色
        text: {
          main: 'rgb(var(--color-text-main) / <alpha-value>)',
          muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
          inverted: 'rgb(var(--color-text-inverted) / <alpha-value>)',
        },
        // 保留原有的 primary 作为兼容，但指向 accent
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: 'rgb(var(--color-theme-accent) / <alpha-value>)', // 映射 500 到 accent
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        }
      }
    },
  },
  plugins: [],
}
