/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['puppeteer', 'html-pdf-node'],
  },
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig
