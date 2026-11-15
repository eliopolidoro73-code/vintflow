import React from "react";

interface VintflowLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function VintflowLogo({
  size = "md",
  showText = true,
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
        className={`${iconDims} shrink-0 drop-shadow-[0_0_14px_rgba(139,92,246,0.45)]`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="vf-bg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="55%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="11" fill="url(#vf-bg)" />
        <path
          d="M10.5 13L18.2 28.2C18.9 29.5 20.8 29.5 21.5 28.2L29.5 12.2"
          stroke="#ffffff"
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M24.2 12.2H29.8V17.8"
          stroke="#ffffff"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10.5" cy="13" r="2.1" fill="#ddd6fe" />
      </svg>

      {showText && (
        <span className={`font-extrabold tracking-tight text-white ${textSize}`}>
          Vint<span className="text-violet-400">Flow</span>
        </span>
      )}
    </span>
  );
}
