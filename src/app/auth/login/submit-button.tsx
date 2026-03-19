"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  formAction,
}: {
  formAction: (formData: FormData) => void;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      formAction={formAction}
      disabled={pending}
      className="auth-submit"
    >
      {pending && (
        <svg
          className="auth-spinner"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2.5"
            opacity="0.25"
          />
          <path
            d="M12 2a10 10 0 0 1 10 10"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      )}
      <span>{pending ? "Signing in\u2026" : "Sign in"}</span>
    </button>
  );
}
