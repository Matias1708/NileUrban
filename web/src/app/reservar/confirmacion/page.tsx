import { Suspense } from "react";
import { ConfirmacionClient } from "@/components/ConfirmacionClient";

export default function ConfirmacionPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-16 text-center text-muted">
          Cargando...
        </div>
      }
    >
      <ConfirmacionClient />
    </Suspense>
  );
}
