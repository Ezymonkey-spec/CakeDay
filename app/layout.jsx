// The layout wraps every page — like the cover and binding of a
// book that every page sits inside. Fonts and metadata live here.

import "./globals.css";

export const metadata = {
  title: "Cake Day — never miss a birthday",
  description:
    "Free birthday reminders by email, a week before — just enough time to post a card. Plus ready-to-send birthday messages.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Nunito+Sans:opsz,wght@6..12,400..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
