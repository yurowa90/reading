"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startChatAction } from "@/actions/chat";
import { Field, inputClass } from "@/components/ui/field";
import { Alert, Button } from "@/components/ui";
import type { BookOption } from "@/components/works/review-form";

export function StartChatForm({ classId, books }: { classId: string; books: BookOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await startChatAction(classId, null, fd);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push(`/chat/${result.data.sessionId}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Field label="어떤 책으로 생각을 넓혀볼까요?" htmlFor="bookId" required>
        <select id="bookId" name="bookId" defaultValue="" required className={inputClass}>
          <option value="" disabled>
            도서를 선택하세요
          </option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "시작하는 중…" : "산파법 대화 시작"}
      </Button>
    </form>
  );
}
