const { execSync } = require('child_process');
const path = require('path');
const packageJson = require('./package.json');

import type { NextConfig } from 'next';

/**/
const buildInfo = JSON.stringify({
  branch: execSync('git rev-parse --abbrev-ref HEAD').toString().trim(),
  commit: execSync('git rev-parse --short HEAD').toString().trim(),
  builtTime: new Date().toLocaleString('en-GB', { timeZone: 'UTC' }),
  version: packageJson.version
});

/**/
const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  experimental: {
    globalNotFound: true
  },
  webpack(config) {
    config.plugins.push(
      new (require('webpack').DefinePlugin)({
        __BUILD_INFO__: buildInfo
      })
    );
    return config;
  }
};

/**/
export default nextConfig;
