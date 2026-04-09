/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'drive.google.com',
            },
        ],
    },
    // Increase API route timeout for complex operations like meal planning
    // This is especially important for routes that make multiple OpenAI API calls
    experimental: {
        // Set max duration for API routes (in seconds)
        // Note: This may require a paid Vercel plan for values > 10s
        serverActions: {
            bodySizeLimit: '2mb',
        },
    },
    // For serverless functions on Vercel, this sets the max execution time
    // Free tier: 10s, Hobby: 10s, Pro: 60s, Enterprise: 900s
    async headers() {
        return [
            // Allow browser/CDN caching for bon-voyage API (5 min cache, 10 min stale-while-revalidate)
            {
                source: '/api/drive/folders/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, s-maxage=300, stale-while-revalidate=600',
                    },
                ],
            },
            // No caching for other APIs
            {
                source: '/api/:path((?!drive/folders).*)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'no-store, must-revalidate',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
