import { Contents, DocBody, DocHead, DocsLayout, DocsSidebar, Pager, SectionBody, navGroups, pageContents, pageHref, pagerFor } from '@ejm/ui';
import { docs } from './index';

/** One page of the docs: sidebar, reading column and contents, built only from @ejm/ui parts. The gallery frame (header, main, footer) comes from the site's App. */
export function DocsPageView({ slug }: { slug?: string }) {
  const page = docs.pages.find(p => p.slug === slug) ?? docs.pages[0]!;
  const { prev, next } = pagerFor(docs, page);
  return (
    <DocsLayout
      sidebar={<DocsSidebar groups={navGroups(docs)} current={pageHref(docs, page)} filter />}
      contents={<Contents items={pageContents(page)} />}
    >
      <article>
        <DocHead page={page} />
        <SectionBody>
          <DocBody page={page} />
        </SectionBody>
        <Pager prev={prev} next={next} />
      </article>
    </DocsLayout>
  );
}
