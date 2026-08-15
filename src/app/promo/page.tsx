import type { Metadata } from "next";
import { PromoStudio } from "@/components/promo/PromoStudio";

// Unlisted internal tool — not linked from public navigation, and excluded
// from search indexing. Not authenticated (no accounts/DB in this project),
// so treat the URL itself as the access control.
export const metadata: Metadata = {
  title: "JURY Promo Studio",
  robots: { index: false, follow: false },
};

export default function PromoPage() {
  return (
    <main className="flex-1 px-4 pt-8 pb-16">
      <PromoStudio />
    </main>
  );
}
