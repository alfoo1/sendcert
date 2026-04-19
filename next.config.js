/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'pdf-lib', '@pdf-lib/fontkit'],
  },
  // Permitir imágenes de dominios externos si se necesitase en el futuro
  images: {
    remotePatterns: [],
  },
};

module.exports = nextConfig;
