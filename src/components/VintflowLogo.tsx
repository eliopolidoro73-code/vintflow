import React from "react";

interface VintflowLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  darkText?: boolean;
  className?: string;
}

export function VintflowLogo({
  size = "md",
  showText = true,
  darkText = true,
  className = "",
}: VintflowLogoProps) {
  const iconDims =
    size === "sm" ? "h-7 w-7" : size === "lg" ? "h-10 w-10" : "h-8 w-8";
  const textSize =
    size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-lg";

  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconDims} shrink-0 shadow-sm rounded-[11px]`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="vf-bg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0d9488" />
            <stop offset="55%" stopColor="#0891b2" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="11" fill="url(#vf-bg)" />
        <path
          d="M10.5 13L18.2 28.2C18.9 29.5 20.8 29.5 21.5 28.2L29.5 12.2"
          stroke="#ffffff"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M24.2 12.2H29.8V17.8"
          stroke="#ffffff"
          strokeWidth="3.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10.5" cy="13" r="2.2" fill="#99f6e4" />
      </svg>

      {showText && (
        <span
          className={`font-extrabold tracking-tight ${textSize} ${
            darkText ? "text-slate-900" : "text-white"
          }`}
        >
          Vint<span className="text-teal-600">flow</span>
        </span>
      )}
    </span>
  );
}
