import './lazy.css';

export default function Lazy() {
  return (
    <>
      <h1>Lazy heading</h1>
      <p className="lazy-note">This page lives in its own chunk.</p>
      <h2 id="details">Details</h2>
    </>
  );
}
