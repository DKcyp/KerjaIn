import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manajemen Blueprint",
};

export default function BlueprintLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
