import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Light theme: white surfaces, near-black text, teal brand.
        // `strong` is body/heading text, `muted` secondary text, `label` form labels.
        strong: '#0a0f10',
        muted: '#4a5a5e',
        label: '#3d4c50',
        panel: '#ffffff',
        panel2: '#f4f7f8',
        fill: '#f8fafb',
        line: '#d5e0e2',
        brand: '#0d6f63',
        'brand-strong': '#0f766e',
        'brand-soft': '#e7f1ef',
        amber: '#8a5300',
        'amber-soft': '#f3eee6',
        danger: '#b3261e',
        'danger-soft': '#f7e9e8',
      },
      boxShadow: {
        glow: '0 1px 2px rgba(10,15,16,.05), 0 10px 30px rgba(10,15,16,.07)',
      },
    },
  },
  plugins: [],
};

export default config;
