/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0F2D52',
          50: '#EBF1F8',
          100: '#C5D8EC',
          200: '#8FB3D4',
          300: '#5A8EBC',
          400: '#2E6BA0',
          500: '#0F2D52',
          600: '#0C2444',
          700: '#091B36',
          800: '#061228',
          900: '#030A18',
        },
        gold: {
          DEFAULT: '#C9A84C',
          50: '#FBF5E6',
          100: '#F3E4B8',
          200: '#E8CC80',
          300: '#DDB548',
          400: '#C9A84C',
          500: '#AA8A34',
          600: '#876D27',
          700: '#64501A',
          800: '#42350E',
          900: '#201A07',
        },
      },
      fontFamily: {
        sans: ['Inter', '"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 16px rgba(15,45,82,0.10)',
        'card-hover': '0 8px 32px rgba(15,45,82,0.18)',
      },
    },
  },
  plugins: [],
}
