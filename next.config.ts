import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The library is read from content/pieces at request time too (signed-in pages are
  // dynamic), so the files must ship with the server bundle.
  outputFileTracingIncludes: {
    "/**": ["./content/pieces/**/*"],
  },
};

export default nextConfig;
