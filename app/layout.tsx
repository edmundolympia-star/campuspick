import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CampusPick",
  description: "University campus food preorder and pickup for students and vendors."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
