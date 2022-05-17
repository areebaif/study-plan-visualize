/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};
/** this configuration ensures file changes sync */
module.exports = {
  nextConfig,
  webpackDevMiddleware: (config) => {
    config.watchOptions.poll = 300;
    return config;
  },
};
