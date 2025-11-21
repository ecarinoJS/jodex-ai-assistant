/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['jodex-ai-assistant'],
  env: {
    NEXT_PUBLIC_OPENAI_API_KEY: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    NEXT_PUBLIC_LIVEKIT_URL: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    NEXT_PUBLIC_LIVEKIT_TOKEN: process.env.NEXT_PUBLIC_LIVEKIT_TOKEN,
  },
};

module.exports = nextConfig;