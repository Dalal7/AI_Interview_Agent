import "@/styles/globals.css";
import "@/styles/designer.css";
import "@livekit/components-styles";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
