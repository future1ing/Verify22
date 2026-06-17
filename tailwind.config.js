/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#0b0f0e',
        sf:      '#111815',
        sf2:     '#182219',
        sf3:     '#1f2d22',
        bdr:     '#2a3d2d',
        accent:  '#4ade80',
        tx:      '#e8f0e9',
        tx2:     '#8fa890',
        tx3:     '#5a7060',
        danger:  '#f87171',
        warn:    '#fb923c',
        info:    '#60a5fa',
      },
      fontFamily: {
        sans:    ['"DM Sans"', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
