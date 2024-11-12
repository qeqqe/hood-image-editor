import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Image Processing Studio",
  description: "A modern image processing application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-zinc-100">{children}</body>
    </html>
  );
}
