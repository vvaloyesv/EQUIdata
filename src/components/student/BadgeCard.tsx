"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { BadgeModal } from "@/components/student/BadgeModal";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";

/**
 * Insignia "Hago parte de #EQUIdata": abre el flujo de 2 pasos (nombre + foto
 * opcional → generar → descargar/crear de nuevo) en `BadgeModal`.
 */
export function BadgeCard({
  userId,
  displayName,
}: {
  userId: string;
  displayName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card bordered className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-navy)] text-[var(--color-lime)]">
            <Sparkles size={20} />
          </div>

          <div>
            <Label>Insignia</Label>
            <p className="mt-1 text-sm text-[var(--color-navy)]">
              Genera tu insignia y comparte que eres parte de{" "}
              <span className="font-medium">#EQUIdata</span>.
            </p>
          </div>
        </div>

        <Button variant="secondary" onClick={() => setOpen(true)}>
          Ver mi insignia
        </Button>
      </Card>

      <BadgeModal
        open={open}
        onClose={() => setOpen(false)}
        userId={userId}
        defaultName={displayName}
      />
    </>
  );
}
