import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Guide revendeur Vinted — Vintflow";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 64,
          background: "linear-gradient(135deg, #07080d 0%, #1e1b4b 50%, #07080d 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 28, color: "#c4b5fd", fontWeight: 700 }}>
          Vintflow · Guide 2026
        </div>
        <div style={{ fontSize: 52, fontWeight: 800, marginTop: 16, lineHeight: 1.15 }}>
          Revendeur Vinted : stock, marge & crosslisting
        </div>
        <div style={{ fontSize: 24, color: "#a1a1aa", marginTop: 24, maxWidth: 900 }}>
          SKU, Leboncoin, facturation micro-BIC et outils pro pour scaler.
        </div>
      </div>
    ),
    { ...size },
  );
}