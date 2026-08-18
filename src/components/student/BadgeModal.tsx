"use client";

import { useEffect, useRef, useState } from "react";
import { Download, RefreshCw, Upload, X } from "lucide-react";
import { renderBadgeBlob, downloadBlob } from "@/lib/student/badgeImage";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";

interface SavedBadge {
  name: string;
  photoDataUrl: string | null;
  imageDataUrl: string;
}

function storageKey(userId: string) {
  return `equidata-badge:${userId}`;
}

function loadSavedBadge(userId: string): SavedBadge | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as SavedBadge) : null;
  } catch {
    return null;
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Flujo de la insignia (2 pasos, como el modal de referencia): formulario
 * (nombre + foto opcional) → generar → preview con "Descargar"/"Crear de
 * nuevo". La foto nunca se guarda en el repositorio — solo vive en memoria
 * y, para "volver a la insignia guardada", en localStorage del navegador.
 */
export function BadgeModal({
  open,
  onClose,
  userId,
  defaultName,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  defaultName: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"form" | "preview">("form");
  const [name, setName] = useState(defaultName);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedBadge | null>(null);

  useEffect(() => {
    if (open) setSaved(loadSavedBadge(userId));
  }, [open, userId]);

  function reset() {
    setStep("form");
    setName(defaultName);
    setPhotoDataUrl(null);
    setResultBlob(null);
    setResultUrl(null);
  }

  function handleClose() {
    onClose();
    reset();
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setPhotoDataUrl(dataUrl);
  }

  async function generate() {
    if (!name.trim()) return;
    setGenerating(true);
    try {
      const blob = await renderBadgeBlob({
        displayName: name.trim(),
        photoDataUrl,
      });
      const url = URL.createObjectURL(blob);
      setResultBlob(blob);
      setResultUrl(url);
      setStep("preview");

      const imageDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(blob);
      });
      const record: SavedBadge = { name: name.trim(), photoDataUrl, imageDataUrl };
      localStorage.setItem(storageKey(userId), JSON.stringify(record));
      setSaved(record);
    } finally {
      setGenerating(false);
    }
  }

  function restoreSaved() {
    if (!saved) return;
    setName(saved.name);
    setPhotoDataUrl(saved.photoDataUrl);
    setResultBlob(null);
    setResultUrl(saved.imageDataUrl);
    setStep("preview");
  }

  function download() {
    const slug = name.trim().toLowerCase().replace(/\s+/g, "-") || "equidata";
    if (resultBlob) {
      downloadBlob(resultBlob, `insignia-equidata-${slug}.png`);
    } else if (resultUrl) {
      const a = document.createElement("a");
      a.href = resultUrl;
      a.download = `insignia-equidata-${slug}.png`;
      a.click();
    }
  }

  function createAgain() {
    setStep("form");
    setResultBlob(null);
    setResultUrl(null);
  }

  return (
    <Modal open={open} onClose={handleClose} className="max-w-md">
      {step === "form" && (
        <div>
          <Label>Mi insignia</Label>
          <h3 className="mt-1 font-display text-xl text-[var(--color-navy)]">
            Hago parte de #EQUIdata
          </h3>

          <div className="mt-5 space-y-4">
            <Input
              label="Tu nombre completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Valentina Mendoza"
              required
            />

            <div className="flex flex-col gap-1.5">
              <Label>Sube tu foto (opcional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
              {photoDataUrl ? (
                <div className="flex items-center gap-3">
                  <img
                    src={photoDataUrl}
                    alt="Vista previa"
                    className="h-14 w-14 rounded-[var(--radius-token)] object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotoDataUrl(null)}
                    className="flex items-center gap-1 text-sm text-[var(--color-coral)] hover:underline"
                  >
                    <X size={14} /> Quitar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 rounded-[var(--radius-token)] border border-dashed border-[var(--color-divider)] py-3 text-sm text-[var(--color-muted)] transition-colors hover:border-[var(--color-lavender)] hover:text-[var(--color-lavender-text)]"
                >
                  <Upload size={15} /> Subir foto
                </button>
              )}
            </div>

            <Button
              className="w-full"
              onClick={generate}
              disabled={generating || !name.trim()}
            >
              {generating ? "Generando…" : "Generar insignia"}
            </Button>

            {saved && (
              <button
                type="button"
                onClick={restoreSaved}
                className="block w-full text-center text-sm text-[var(--color-lavender-text)] hover:underline"
              >
                Volver a la insignia guardada
              </button>
            )}
          </div>
        </div>
      )}

      {step === "preview" && resultUrl && (
        <div>
          <Label>Mi insignia</Label>
          <h3 className="mt-1 font-display text-xl text-[var(--color-navy)]">
            ¡Ya está lista!
          </h3>

          <img
            src={resultUrl}
            alt="Insignia EQUIdata"
            className="mt-4 w-full rounded-[var(--radius-card)]"
          />

          <div className="mt-4 flex gap-2">
            <Button className="flex-1" onClick={download}>
              <Download size={15} /> Descargar imagen
            </Button>
            <Button variant="secondary" onClick={createAgain}>
              <RefreshCw size={15} /> Crear de nuevo
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
