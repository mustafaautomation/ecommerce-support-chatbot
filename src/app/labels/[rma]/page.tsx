import { Suspense } from "react";
import LabelSheet from "@/components/label-sheet";

export default function LabelPage() {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-sm text-muted-foreground">Printing the label…</p>}>
      <LabelSheet />
    </Suspense>
  );
}
