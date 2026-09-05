import type { MetadataRoute } from "next";
export default function sitemap():MetadataRoute.Sitemap{const origin=process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000";return ["/","/about","/faq","/contact","/waitlist","/classroom"].map(path=>({url:`${origin}${path}`,lastModified:new Date(),changeFrequency:"weekly",priority:path==="/"?1:0.7}))}
