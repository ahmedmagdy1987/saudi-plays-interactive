import "./AtmosphereBackground.css";

/**
 * Premium ambient background. A fixed, non-interactive layer of a few very soft
 * aurora fields that slowly zoom in/out, drift and fade on long, calm loops —
 * the restrained "slow zoom · fade · depth" mood, built entirely from native
 * gradients + GPU transforms (no video, no heavy assets). It blends additively
 * (screen) so it only ever adds gentle light over the dark UI and never reduces
 * text contrast. Rendered ONCE, outside the language-keyed motion layer, so it
 * persists seamlessly across language switches. Fully frozen on reduced motion.
 */
export default function AtmosphereBackground() {
  return (
    <div className="atmos" aria-hidden="true">
      <span className="atmos__aura atmos__aura--teal" />
      <span className="atmos__aura atmos__aura--violet" />
      <span className="atmos__aura atmos__aura--deep" />
      <span className="atmos__grain" />
    </div>
  );
}
