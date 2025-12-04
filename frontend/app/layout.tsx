import "./globals.css";

export const metadata = {
  title: "AI Dynamic Form Generator",
  description: "Centralign AI assessment project"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem" }}>
          {children}
        </div>
      </body>
    </html>
  );
}
