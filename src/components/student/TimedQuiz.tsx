"use client";

/**
 * Quiz cronometrado (24/09/2026): instrucciones en una ventana emergente,
 * confirmación "¿Está seguro…?", y luego una pregunta a la vez con 45
 * segundos cada una, sin volver atrás. Reglas en `src/lib/logic/timedQuiz.ts`.
 *
 * El intento se registra al confirmar (desde ahí cuenta como usado) y cada
 * respuesta se guarda al pulsar Continuar. Si la persona se sale o recarga,
 * `useFinalizeAbandonedAttempts` cierra ese intento con lo guardado la
 * próxima vez que abra el quiz.
 *
 * Seguridad, Fase 1: el navegador no califica ni conoce las respuestas
 * correctas. Abre el intento, manda cada respuesta y pide el cierre; el
 * servidor valida el tiempo de cada pregunta con su propia hora y califica.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import {
  QuestionField,
  isQuestionAnswered,
  type DraftAnswer,
} from "@/components/student/QuestionField";
import { getRepository } from "@/lib/data";
import { formatCountdown, QUESTION_SECONDS, secondsLeft } from "@/lib/logic/timedQuiz";
import type { EvaluationVM } from "@/lib/student/evaluation";
import type { AnswerInput, Attempt, OutcomeScore } from "@/lib/domain/types";

export interface TimedQuizResult {
  score: number;
  outcomeScores: OutcomeScore[];
}

type Phase = "intro" | "running" | "finishing" | "error";

/** El servidor califica y cierra el intento con lo guardado (las que faltan cuentan como incorrectas). */
async function closeAttempt(userId: string, attemptId: string): Promise<TimedQuizResult> {
  const result = await getRepository().completeAttempt(userId, attemptId);
  return { score: result.score, outcomeScores: result.outcomeScores };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Cierra los intentos que quedaron abiertos (la persona se salió o recargó a
 * mitad del quiz) con las respuestas que alcanzó a guardar. Corre en la
 * página, no dentro del quiz: aunque ya no queden intentos para empezar
 * otro, el abandonado igual tiene que quedar registrado con su nota.
 */
export function useFinalizeAbandonedAttempts(
  vm: EvaluationVM | null,
  { paused, onDone }: { paused: boolean; onDone: () => void },
): { closedAbandoned: boolean } {
  const handled = useRef(new Set<string>());
  const [closedAbandoned, setClosedAbandoned] = useState(false);

  useEffect(() => {
    if (!vm || paused) return;
    const pending = vm.pendingAttempts.filter((a) => !handled.current.has(a.id));
    if (pending.length === 0) return;
    pending.forEach((a) => handled.current.add(a.id));
    void (async () => {
      for (const attempt of pending) {
        await closeAttempt(attempt.userId, attempt.id);
      }
      setClosedAbandoned(true);
      onDone();
    })().catch((error) => console.error("[timed-quiz] no se pudo cerrar un intento abandonado", error));
  }, [vm, paused, onDone]);

  return { closedAbandoned };
}

export function TimedQuiz({
  vm,
  userId,
  onRunningChange,
  onFinished,
}: {
  vm: EvaluationVM;
  userId: string;
  /** Mientras corre, la página no debe reemplazar el quiz aunque cambie el estado de intentos. */
  onRunningChange: (running: boolean) => void;
  onFinished: (result: TimedQuizResult) => void;
}) {
  const { evaluation, questions, optionsByQuestion, gate } = vm;
  const [phase, setPhase] = useState<Phase>("intro");
  const [instructionsOpen, setInstructionsOpen] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string>();
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<DraftAnswer>({});
  const [deadline, setDeadline] = useState(0);
  const [left, setLeft] = useState(QUESTION_SECONDS);

  const attemptRef = useRef<Attempt | null>(null);
  // Envíos de respuestas en orden; el cierre espera a que terminen.
  const savesRef = useRef<Promise<void>>(Promise.resolve());
  const sentRef = useRef(new Set<string>());
  const phaseRef = useRef<Phase>("intro");
  phaseRef.current = phase;

  const question = questions[index];
  const options = useMemo(
    () => (question ? (optionsByQuestion[question.id] ?? []) : []),
    [question, optionsByQuestion],
  );
  const timeUp = phase === "running" && left === 0;
  const isLast = index === questions.length - 1;

  // Reloj: se calcula contra la hora de vencimiento (no restando de a un
  // segundo), así una pestaña en segundo plano no "congela" el tiempo.
  useEffect(() => {
    if (phase !== "running") return;
    const tick = () => setLeft(secondsLeft(deadline, Date.now()));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [phase, deadline]);

  // Salir o recargar a mitad del quiz: el navegador pide confirmación. Si
  // la persona igual sale, el intento queda abierto y se cierra al volver.
  useEffect(() => {
    if (phase !== "running") return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  // Navegar a otra pantalla dentro de la app a mitad del quiz: se cierra el
  // intento con lo respondido hasta ahí.
  useEffect(
    () => () => {
      const attempt = attemptRef.current;
      if (attempt && phaseRef.current === "running") {
        void savesRef.current
          .then(() => closeAttempt(userId, attempt.id))
          .catch(() => {
            /* Queda abierto: se cierra la próxima vez que abra el quiz. */
          });
      }
    },
    // Solo al desmontar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  async function start() {
    setStarting(true);
    setStartError(undefined);
    try {
      // El servidor valida que queden intentos y fija la hora de inicio.
      const attempt = await getRepository().beginAttempt(userId, evaluation.id);
      attemptRef.current = attempt;
      savesRef.current = Promise.resolve();
      sentRef.current = new Set();
      setConfirmOpen(false);
      setInstructionsOpen(false);
      setIndex(0);
      setDraft({});
      setDeadline(Date.now() + QUESTION_SECONDS * 1000);
      setLeft(QUESTION_SECONDS);
      setPhase("running");
      onRunningChange(true);
    } catch (error) {
      setStartError(
        error instanceof Error && error.message
          ? error.message
          : "No se pudo iniciar el quiz. Revisa tu conexión e intenta de nuevo.",
      );
    } finally {
      setStarting(false);
    }
  }

  /**
   * Manda una respuesta una sola vez, en orden y con dos reintentos por si
   * falla la red. El servidor la rechaza si llegó fuera de tiempo o repetida.
   */
  const sendAnswer = useCallback(
    (questionId: string, answer: AnswerInput) => {
      const attempt = attemptRef.current;
      if (!attempt || sentRef.current.has(questionId)) return;
      sentRef.current.add(questionId);
      savesRef.current = savesRef.current.then(async () => {
        for (let i = 0; i < 3; i++) {
          try {
            await getRepository().recordAttemptAnswer(userId, attempt.id, questionId, answer);
            return;
          } catch {
            if (i < 2) await wait(700);
          }
        }
      });
    },
    [userId],
  );

  // Si se acaba el tiempo con la pregunta ya respondida, la respuesta cuenta:
  // se manda en ese momento, sin esperar a que pulse Continuar.
  useEffect(() => {
    if (timeUp && question && isQuestionAnswered(question, options, draft)) {
      sendAnswer(question.id, draft);
    }
  }, [timeUp, question, options, draft, sendAnswer]);

  const finish = useCallback(async () => {
    const attempt = attemptRef.current;
    if (!attempt) return;
    setPhase("finishing");
    try {
      await savesRef.current;
      const result = await closeAttempt(userId, attempt.id);
      attemptRef.current = null;
      onRunningChange(false);
      onFinished(result);
    } catch {
      setPhase("error");
    }
  }, [userId, onFinished, onRunningChange]);

  function next() {
    const attempt = attemptRef.current;
    if (!attempt || !question) return;
    // Solo cuenta lo que se alcanzó a responder antes de que venciera el
    // tiempo (tras vencer, la pregunta queda bloqueada y no se puede cambiar).
    // Se guarda en segundo plano; el cierre espera a que termine.
    if (isQuestionAnswered(question, options, draft)) sendAnswer(question.id, draft);
    if (isLast) {
      void finish();
      return;
    }
    setIndex((i) => i + 1);
    setDraft({});
    setDeadline(Date.now() + QUESTION_SECONDS * 1000);
    setLeft(QUESTION_SECONDS);
  }

  // ─── Antes de empezar ──────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <>
        <Card bordered>
          <Label>Quiz cronometrado</Label>
          <p className="mt-2 text-[var(--color-navy)]">
            {questions.length} {questions.length === 1 ? "pregunta" : "preguntas"} ·{" "}
            {QUESTION_SECONDS} segundos por pregunta · intento {gate.usedAttempts + 1} de{" "}
            {gate.attemptCap ?? evaluation.maxAttempts}
            {evaluation.passingScore !== undefined && ` · aprueba con ${evaluation.passingScore}%`}
          </p>
          <Button className="mt-4" onClick={() => setInstructionsOpen(true)}>
            Ver instrucciones y comenzar
          </Button>
        </Card>

        <Modal open={instructionsOpen && !confirmOpen} onClose={() => setInstructionsOpen(false)}>
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-[var(--color-coral)]" />
            <Label>Antes de comenzar</Label>
          </div>
          <h2 className="mt-2 font-display text-2xl text-[var(--color-navy)]">
            Este quiz es cronometrado
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-[var(--color-navy)]">
            <li>Verá una pregunta a la vez.</li>
            <li>
              Tiene <strong>{QUESTION_SECONDS} segundos por pregunta</strong>. El contador está
              arriba de cada pregunta.
            </li>
            <li>
              Pulse <strong>Continuar</strong> para pasar a la siguiente.{" "}
              <strong>No podrá volver</strong> a una pregunta anterior.
            </li>
            <li>
              Si se acaba el tiempo, la pregunta queda sin respuesta, cuenta como incorrecta y
              solo podrá pulsar Continuar.
            </li>
            <li>
              Si sale o recarga la página, el intento cuenta como completado con lo que haya
              respondido. Su profesora puede reabrirlo.
            </li>
          </ul>
          <p className="mt-4 rounded-[var(--radius-token)] bg-[var(--color-canvas)] px-3.5 py-2.5 text-sm text-[var(--color-muted)]">
            {questions.length} {questions.length === 1 ? "pregunta" : "preguntas"} · intento{" "}
            {gate.usedAttempts + 1} de {gate.attemptCap ?? evaluation.maxAttempts}
            {evaluation.passingScore !== undefined && ` · aprueba con ${evaluation.passingScore}%`}
          </p>
          <Button className="mt-5 w-full" onClick={() => setConfirmOpen(true)}>
            Comenzar
          </Button>
        </Modal>

        <Modal open={confirmOpen} onClose={() => !starting && setConfirmOpen(false)}>
          <h2 className="pr-8 font-display text-xl text-[var(--color-navy)]">
            ¿Está seguro de empezar con el quiz?
          </h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Asegúrese de estar preparado. El tiempo empieza a correr apenas pulse Sí.
          </p>
          {startError && <p className="mt-3 text-sm text-[var(--color-coral)]">{startError}</p>}
          <div className="mt-5 flex gap-3">
            <Button className="flex-1" onClick={() => void start()} disabled={starting}>
              {starting ? "Preparando…" : "Sí"}
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setConfirmOpen(false)}
              disabled={starting}
            >
              No
            </Button>
          </div>
        </Modal>
      </>
    );
  }

  // ─── Cerrando / error al cerrar ───────────────────────────────────
  if (phase === "finishing" || phase === "error") {
    return (
      <Card bordered className="text-center">
        {phase === "finishing" ? (
          <p className="text-[var(--color-navy)]">Calificando tus respuestas…</p>
        ) : (
          <>
            <p className="text-[var(--color-navy)]">
              No pudimos guardar el final del quiz. Tus respuestas están a salvo en esta pantalla.
            </p>
            <Button className="mt-4" onClick={() => void finish()}>
              Intentar de nuevo
            </Button>
          </>
        )}
      </Card>
    );
  }

  // ─── Pregunta en curso ────────────────────────────────────────────
  const urgent = left <= 10;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Label>
          Pregunta {index + 1} de {questions.length}
        </Label>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-[var(--radius-pill)] px-3 py-1 font-mono text-sm tabular-nums",
            timeUp
              ? "bg-[var(--color-coral-tint)] text-[var(--color-coral)]"
              : urgent
                ? "bg-[var(--color-coral-tint)] text-[var(--color-coral)]"
                : "bg-[var(--color-navy-tint)] text-[var(--color-navy)]",
          )}
          aria-live="polite"
        >
          <Clock size={14} /> {formatCountdown(left)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-divider)]">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-200 ease-linear",
            urgent ? "bg-[var(--color-coral)]" : "bg-[var(--color-navy)]",
          )}
          style={{ width: `${(left / QUESTION_SECONDS) * 100}%` }}
        />
      </div>

      <fieldset disabled={timeUp} className={cn(timeUp && "opacity-60")}>
        <QuestionField
          key={question.id}
          question={question}
          options={options}
          index={index}
          value={draft}
          onChange={setDraft}
        />
      </fieldset>

      {timeUp && (
        <p className="flex items-center gap-2 text-sm text-[var(--color-coral)]">
          <AlertTriangle size={15} /> Se acabó el tiempo para esta pregunta.
        </p>
      )}

      <div className="flex justify-end">
        <Button onClick={next}>{isLast ? "Terminar quiz" : "Continuar"}</Button>
      </div>
    </div>
  );
}
