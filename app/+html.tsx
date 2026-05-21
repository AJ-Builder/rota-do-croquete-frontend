import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta name="theme-color" content="#D96606" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Croquete" />
        <meta
          name="description"
          content="Ranking de croquetes com os teus amigos"
        />
        <link rel="apple-touch-icon" href="/icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
