import {
  absoluteUrl,
  breadcrumbSchema,
  pageSeo,
  siteDescription,
  siteName,
  siteUrl,
  type SitePath,
} from "@/lib/seo";

export function JsonLd({ data, id }: { data: object; id: string }) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export function BreadcrumbsSchema({ path }: { path: SitePath }) {
  const page = pageSeo[path];
  return (
    <JsonLd
      id="page-breadcrumbs"
      data={{
        "@context": "https://schema.org",
        "@graph": [
          breadcrumbSchema(path),
          {
            "@type": "WebPage",
            "@id": `${absoluteUrl(path)}#webpage`,
            url: absoluteUrl(path),
            name: page.title,
            description: page.description,
            inLanguage: "en-IN",
            isPartOf: { "@id": `${siteUrl}/#website` },
            about: { "@id": `${siteUrl}/#festival` },
          },
        ],
      }}
    />
  );
}

export function SiteSchema() {
  return (
    <JsonLd
      id="festival-site-schema"
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": `${siteUrl}/#website`,
            url: absoluteUrl("/"),
            name: siteName,
            description: siteDescription,
            inLanguage: "en-IN",
            publisher: { "@id": `${siteUrl}/#festival` },
          },
          {
            "@type": "WebPage",
            "@id": `${siteUrl}/#webpage`,
            url: absoluteUrl("/"),
            name: pageSeo["/"].title,
            description: pageSeo["/"].description,
            inLanguage: "en-IN",
            isPartOf: { "@id": `${siteUrl}/#website` },
            about: { "@id": `${siteUrl}/#festival` },
          },
          {
            "@type": "Organization",
            "@id": `${siteUrl}/#festival`,
            name: "Technika — BIT Patna",
            url: absoluteUrl("/"),
            logo: {
              "@type": "ImageObject",
              url: absoluteUrl("/images/crest.webp"),
              width: 500,
              height: 500,
            },
            image: absoluteUrl("/images/social-card.jpg"),
            parentOrganization: { "@id": `${siteUrl}/#bit-patna` },
          },
          {
            "@type": "CollegeOrUniversity",
            "@id": `${siteUrl}/#bit-patna`,
            name: "Birla Institute of Technology, Patna",
            url: "https://www.bitmesra.ac.in",
            sameAs: ["https://www.bitmesra.ac.in"],
            address: {
              "@type": "PostalAddress",
              addressLocality: "Patna",
              addressRegion: "Bihar",
              postalCode: "800014",
              addressCountry: "IN",
            },
          },
        ],
      }}
    />
  );
}
