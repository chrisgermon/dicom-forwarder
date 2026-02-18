import { useEffect } from "react";
import ArticlesList from "@/components/news/ArticlesList";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";

export default function NewsViewAll() {
  useEffect(() => {
    document.title = "Company News | Vision Radiology";
    const meta = (document.querySelector('meta[name="description"]') as HTMLMetaElement) || (() => {
      const m = document.createElement('meta');
      m.name = 'description';
      document.head.appendChild(m);
      return m;
    })();
    meta.setAttribute('content', 'Company news and announcements - latest updates and articles.');

    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', window.location.href);
  }, []);

  return (
    <PageContainer maxWidth="xl" className="space-y-6">
      <PageHeader
        title="Company News"
        description="Stay up to date with the latest company announcements"
      />
      <ArticlesList />
    </PageContainer>
  );
}
