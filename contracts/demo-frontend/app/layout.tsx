import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Multichain Demo - Self Protocol",
  description: "Multichain verification demo: Celo to Base via LayerZero",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}


