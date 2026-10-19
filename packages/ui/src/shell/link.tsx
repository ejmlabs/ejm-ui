import { createContext, useContext, type ComponentPropsWithoutRef, type ComponentType } from 'react';

export type LinkProps = ComponentPropsWithoutRef<'a'> & { href: string };
/** The component the shell uses for internal links. Give it a router adapter; the default is a plain <a>. */
export type LinkComponent = ComponentType<LinkProps>;

const PlainLink: LinkComponent = props => <a {...props} />;
const LinkContext = createContext<LinkComponent>(PlainLink);

/** Sets the internal link component for everything below. SiteLayout, DocsLayout and AppShell do this from their `linkComponent` prop. */
export const LinkProvider = LinkContext.Provider;
export const useLinkComponent = (): LinkComponent => useContext(LinkContext);

export interface NavItem {
  label: string;
  href: string;
  /** Marks the current page (aria-current="page"). */
  current?: boolean;
  /** Another site: rendered with ExternalLink. */
  external?: boolean;
}
