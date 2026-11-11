export function LightAtmosphere({
  seam,
  variant = "curve",
}: {
  seam?: "ink" | "gold" | "bronze" | "night" | "red" | "violet";
  variant?: "curve" | "diagonal" | "fade";
}) {
  return (
    <>
      {seam ? <div className={`light-seam seam-${variant} seam-${seam}`} aria-hidden="true" /> : null}
      <div className="light-blobs" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="light-grain" aria-hidden="true" />
    </>
  );
}
