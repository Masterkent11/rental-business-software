"use client";

import { useAuthDraft } from "./use-auth-draft";
import Link from "next/link";
import { useEffect } from "react";
import { z } from "zod";
import { container } from "@/infrastructure/composition/owner-web-container";
import { AuthBrand, AuthError, AuthLoading } from "./auth-layout";

const schema = z.object({
  title: z.string(),
  body: z.string(),
  status: z.string(),
});
export function LegalDocument({ slug }: { slug: "terms" | "privacy" }) {
  const [document, setDocument] = useAuthDraft<z.infer<typeof schema> | null>(
    null,
  );
  const [error, setError] = useAuthDraft<string | null>(null);
  const [attempt, setAttempt] = useAuthDraft(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    void container.httpClient
      .request(`/content/${slug}`, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setDocument(schema.parse(data));
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("This document couldn't be loaded. Please try again.");
      });
    return () => controller.abort();
  }, [slug, attempt, setError, setDocument]);
  return (
    <main className="auth-legal-page">
      <AuthBrand />
      <Link className="auth-text-link" href="/sign-in">
        Back to sign in
      </Link>
      {error ? (
        <>
          <AuthError message={error} />
          <button type="button" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </>
      ) : !document ? (
        <AuthLoading />
      ) : (
        <article>
          <h1>{document.title}</h1>
          {document.status !== "PUBLISHED" && (
            <p className="auth-setup-note">
              Draft document. Pending final review.
            </p>
          )}
          {document.body
            .split(/\n\n+/)
            .map((block, i) =>
              block.startsWith("## ") ? (
                <h2 key={i}>{block.slice(3)}</h2>
              ) : (
                <p key={i}>{block}</p>
              ),
            )}
        </article>
      )}
    </main>
  );
}
