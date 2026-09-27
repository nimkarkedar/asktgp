import type { Source } from "@/lib/qa";

// Answer content shared by the /q/{slug} page and the /ask page.

export function Label({ children }: { children: React.ReactNode }) {
  return <p className="t-heading">{children}</p>;
}

export function QuestionBox({ question }: { question: string }) {
  return (
    <div className="rounded-2xl bg-tile px-5 lg:px-6 py-7 lg:py-10">
      <h1 className="t-heading">{question}</h1>
    </div>
  );
}

export function AnswerBody({
  shortAnswer,
  longAnswer,
  sources = [],
}: {
  shortAnswer: string;
  longAnswer: string;
  sources?: Source[];
}) {
  const paragraphs = longAnswer.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <div className="px-1 lg:px-4">
      <div className="mt-8">
        <Label>Short answer</Label>
        <p className="mt-2 t-body">{shortAnswer}</p>
      </div>

      <div className="mt-8">
        <Label>Long answer</Label>
        <div className="mt-2 max-w-[65ch] space-y-4 t-body">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>

      {sources.length > 0 && (
        <p className="mt-8 t-small">
          Reference found in conversations with{" "}
          {sources.map((s, i) => (
            <span key={s.guest}>
              {i > 0 && ", "}
              <i>{s.guest}</i>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
