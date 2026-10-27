import type { Metadata } from "next";
import { FieldDesk } from "@/components/FieldDesk";

export const metadata: Metadata = {
  title: "Field desk",
  description: "Cast a custom drift and watch the same retraining rule respond.",
};

export default function DeskPage() {
  return <FieldDesk />;
}
