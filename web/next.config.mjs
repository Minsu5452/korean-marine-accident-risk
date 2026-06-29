/** @type {import('next').NextConfig} */
const nextConfig = {
  // 정적 export: 키 없이 재생되는 데모를 그대로 호스팅(Vercel 등)
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
