import "./globals.css";
import { ConvexProvider } from "./ConvexProvider";

export const metadata = {
  title: "Chess - Real-time Multiplayer",
  description: "Play chess online with real-time synchronization",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ConvexProvider>{children}</ConvexProvider>
      </body>
    </html>
  );
}
