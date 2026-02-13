/** @type {import('next').NextConfig} */
const nextConfig = {
  // Désactive le parsing du body pour la route webhook Stripe
  // afin de pouvoir vérifier la signature avec le body brut.
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },
};

module.exports = nextConfig;
