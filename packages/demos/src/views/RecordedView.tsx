import type { ComponentProps } from 'react';
import { Showcase } from '../islands/Showcase';

/** Shared passive player presentation; product commands and state stay in recorded frames. */
export function RecordedView(props: ComponentProps<typeof Showcase>) {
  return <Showcase {...props} />;
}
