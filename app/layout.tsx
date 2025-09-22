import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Gemini API",
  description: "API Endpoint for Gemini",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
