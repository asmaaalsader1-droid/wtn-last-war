/** @type {import('next').NextConfig} */
// `next dev` and `next build` must never share a distDir. Running a build while the
// dev server is live overwrites the dev server's compiled chunks, and every
// /_next/static/* request then 404s. Production keeps the default `.next` so the
// static export still lands in `out/` for Netlify; dev is isolated to `.next-dev`.
const isDev = process.env.NODE_ENV === 'development';

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  distDir: isDev ? '.next-dev' : '.next',
};

export default nextConfig;
