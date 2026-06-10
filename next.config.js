module.exports = async () => {
  if (process.env.NODE_ENV === 'development') {
    const { setupDevPlatform } = require('@cloudflare/next-on-pages/next-dev');
    await setupDevPlatform();
  }

  return {
    images: {
      unoptimized: true,
    },
    experimental: {
      serverComponentsExternalPackages: [],
    },
  };
};

