import type { Metadata } from "next";
import { Suspense } from "react";
import { ObservatoryApp } from "@/components/ObservatoryApp";

export const metadata: Metadata = {
  title: "Observatory",
  description: "Replay six weather systems and watch the retraining rule decide.",
};

export default function ObservatoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-night" />}>
      <ObservatoryApp />
    </Suspense>
  );
}
