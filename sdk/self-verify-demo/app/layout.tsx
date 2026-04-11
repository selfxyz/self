import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Self Verify — Identity Verification Widget Demo',
  description: 'Drop-in identity verification for any website. Prove humanity, verify age, or complete KYC with a single HTML tag.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white text-gray-900 dark:bg-self-dark dark:text-gray-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
