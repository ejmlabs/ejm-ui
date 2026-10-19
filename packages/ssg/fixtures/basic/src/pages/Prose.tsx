import serverImage from '../server-only.svg?no-inline';

// Server-only prose for the Static test: the marker below must never reach the browser bundle.
export function Prose() {
  return (
    <p className="prose-note">
      <img src={serverImage} alt="Server-only fixture" width={16} height={16} />
      static-marker-7f3a: this text is only in the HTML. <a href="/lazy/" id="prose-link">Read the lazy page</a>.
    </p>
  );
}
