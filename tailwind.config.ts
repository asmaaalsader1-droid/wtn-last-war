import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#071014',
        panel: '#0d1b20',
        panel2: '#12252b',
        line: '#1f3a40',
        cyan: '#44d6c4',
        'cyan-soft': 'rgba(68, 214, 196, <alpha-value>)',
        amber: '#f0b45a',
        danger: '#ef6f6c',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(68,214,196,.16), 0 16px 50px rgba(0,0,0,.28)',
      },
    },
  },
  plugins: [],
};

export default config;
