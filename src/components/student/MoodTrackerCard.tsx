"use client";

import { useState } from "react";
import Image from "next/image";
import { SmilePlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getRepository } from "@/lib/data";
import { dayKeyOf } from "@/lib/logic/gamification";
import type { MoodValue } from "@/lib/domain/types";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";

const MOOD_OPTIONS: { value: MoodValue; label: string; img: string }[] = [
  { value: "feliz", label: "Feliz", img: "/emojis/feliz.png" },
  { value: "entusiasmada", label: "Entusiasmada", img: "/emojis/entusiasmada.png" },
  { value: "divertida", label: "Divertida", img: "/emojis/divertida.png" },
  { value: "enternecida", label: "Enternecida", img: "/emojis/enternecida.png" },
  { value: "sorprendida", label: "Sorprendida", img: "/emojis/sorprendida.png" },
  { value: "pensativa", label: "Pensativa", img: "/emojis/pensativa.png" },
  { value: "indiferente", label: "Indiferente", img: "/emojis/indiferente.png" },
  { value: "aburrida", label: "Aburrida", img: "/emojis/aburrida.png" },
  { value: "cansada", label: "Cansada", img: "/emojis/cansada.png" },
  { value: "abrumada", label: "Abrumada", img: "/emojis/abrumada.png" },
  { value: "preocupada", label: "Preocupada", img: "/emojis/preocupada.png" },
  { value: "asustada", label: "Asustada", img: "/emojis/asustada.png" },
  { value: "triste", label: "Triste", img: "/emojis/triste.png" },
  { value: "frustrada", label: "Frustrada", img: "/emojis/frustrada.png" },
  { value: "enojada", label: "Enojada", img: "/emojis/enojada.png" },
  { value: "en-desacuerdo", label: "En desacuerdo", img: "/emojis/en-desacuerdo.png" },
];

const FEATURED_MOODS = ["triste", "pensativa", "indiferente", "feliz", "entusiasmada"];

/**
 * Mood Tracker diario (spec nueva): reemplaza el picker rápido de 4 ánimos
 * por un flujo en modal con los 16 emojis de `assets/emojis`. Escribe en el
 * mismo `MoodEntry` de siempre (uno por usuario/día vía `dayKeyOf` +
 * `setMoodEntry`) — el "ya respondiste hoy" sale gratis de `currentMood`.
 */
export function MoodTrackerCard({
  currentMood,
  onMoodSaved,
}: {
  currentMood: MoodValue | null;
  onMoodSaved: () => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<MoodValue | null>(null);
  const [saving, setSaving] = useState(false);

  const loggedOption = MOOD_OPTIONS.find((o) => o.value === currentMood) ?? null;

  function openTracker() {
    setSelected(null);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
  }

  async function pickMood(value: MoodValue) {
    if (!user || saving) return;
    setSelected(value);
    setSaving(true);
    await getRepository().setMoodEntry({
      userId: user.id,
      dayKey: dayKeyOf(new Date().toISOString()),
      mood: value,
      createdAt: new Date().toISOString(),
    });
    setSaving(false);
    setOpen(false);
    onMoodSaved();
  }

  return (
    <Card
      bordered
      className="overflow-hidden bg-[var(--color-lavender-tint)] p-0"
    >
      <div className="flex flex-wrap items-center justify-between gap-5 bg-white/80 px-6 py-5">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex shrink-0 -space-x-2">
            {FEATURED_MOODS.map((mood, index) => {
              const opt = MOOD_OPTIONS.find((o) => o.value === mood)!;
              return (
                <span
                  key={opt.value}
                  className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-white shadow-[0_4px_12px_-8px_rgba(25,41,98,0.35)]"
                  style={{ transform: `translateY(${index % 2 === 0 ? 0 : 4}px)` }}
                >
                  <Image
                    src={opt.img}
                    alt=""
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                </span>
              );
            })}
          </div>

          <div className="min-w-0">
            {loggedOption ? (
              <div className="mt-1.5 flex items-center gap-2">
                <Image
                  src={loggedOption.img}
                  alt={loggedOption.label}
                  width={28}
                  height={28}
                  className="rounded-full"
                />
                <p className="text-sm text-[var(--color-navy)]">
                  Hoy te sientes{" "}
                  <span className="font-medium">
                    {loggedOption.label.toLowerCase()}
                  </span>.
                  Vuelve mañana para registrar de nuevo.
                </p>
              </div>
            ) : (
              <div className="mt-1.5">
                <p className="text-base font-medium text-[var(--color-navy)]">
                  ¿Qué color tiene tu día?
                </p>
                <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                  Elige el emoji que mejor acompaña tu momento.
                </p>
              </div>
            )}
          </div>
        </div>

        {!loggedOption && (
          <button
            onClick={openTracker}
            className="group flex shrink-0 items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-navy)] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-16px_rgba(25,41,98,0.85)] transition-all hover:-translate-y-0.5 hover:bg-[var(--color-navy-hover)] hover:shadow-[0_14px_28px_-16px_rgba(25,41,98,0.95)] focus-ring"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/14 transition-colors group-hover:bg-white/20">
              <SmilePlus size={16} />
            </span>
            Registrar ánimo
          </button>
        )}
      </div>

      <Modal open={open} onClose={closeModal}>
        <div>
          <Label>Mood Tracker</Label>
          <h3 className="mt-1 font-display text-xl text-[var(--color-navy)]">
            ¿Cómo te sientes hoy?
          </h3>

          <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-3">
            {MOOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => pickMood(opt.value)}
                disabled={saving}
                className="flex flex-col items-center gap-1.5 rounded-[var(--radius-token)] p-2 text-center transition-colors hover:bg-[var(--color-navy-tint)] disabled:cursor-wait disabled:opacity-60"
              >
                <Image
                  src={opt.img}
                  alt={opt.label}
                  width={48}
                  height={48}
                  className="rounded-full"
                />
                <span className="text-xs leading-tight text-[var(--color-navy)]">
                  {selected === opt.value ? "Guardando..." : opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </Card>
  );
}
