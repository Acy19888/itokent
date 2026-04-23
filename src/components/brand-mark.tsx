import { useTranslations } from "next-intl";

/**
 * İtokent brand mark — the wordmark "İtokent" in serif caps with the
 * cursive "Urla" tucked underneath, echoing the real İtokent logo.
 * Two color schemes: `light` for dark backgrounds, `dark` for light backgrounds.
 */
export function BrandMark({
  size = "md",
  scheme = "dark",
  withSuffix = true,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  scheme?: "light" | "dark";
  withSuffix?: boolean;
}) {
  const brand = useTranslations("Brand");

  const sizes = {
    sm: { word: "text-lg", suffix: "text-sm -mt-1" },
    md: { word: "text-2xl", suffix: "text-base -mt-1.5" },
    lg: { word: "text-4xl", suffix: "text-2xl -mt-2" },
    xl: { word: "text-6xl", suffix: "text-4xl -mt-3" },
  };

  return (
    <div className="inline-flex flex-col items-center leading-none">
      <span
        className={`font-serif font-semibold tracking-logo uppercase ${
          scheme === "light" ? "text-ivory-50" : "text-itokent-900"
        } ${sizes[size].word}`}
      >
        {brand("name")}
      </span>
      {withSuffix && (
        <span
          className={`font-script italic pl-12 ${
            scheme === "light" ? "text-teal-200" : "text-teal-600"
          } ${sizes[size].suffix}`}
        >
          {brand("suffix")}
        </span>
      )}
    </div>
  );
}

/**
 * Just the little roof / house icon from the İtokent mark.
 */
export function BrandIcon({
  size = 40,
  scheme = "dark",
}: {
  size?: number;
  scheme?: "light" | "dark";
}) {
  const leaf = scheme === "light" ? "#8fbf9c" : "#3f8553";
  const shadow = scheme === "light" ? "#245d6f" : "#1b3e4a";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Stylised roofline inspired by the İtokent mark */}
      <path
        d="M6 28 L24 10 L42 28 L42 38 Q42 40 40 40 L8 40 Q6 40 6 38 Z"
        fill={leaf}
      />
      <path
        d="M24 10 L42 28 L42 38 Q42 40 40 40 L24 40 Z"
        fill={shadow}
        fillOpacity={0.35}
      />
      <rect x="20" y="24" width="8" height="16" rx="1" fill={shadow} fillOpacity={0.55} />
    </svg>
  );
}
