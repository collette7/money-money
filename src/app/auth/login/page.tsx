import { login } from "./actions";
import Link from "next/link";
import { SubmitButton } from "./submit-button";

export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const searchParams = await props.searchParams;
  const error = searchParams?.error;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <header className="auth-brand">
          <div className="auth-logo" aria-hidden="true">
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 22V6h3.2l4.8 11L16.8 6H20v16h-2.8V11.2L12.6 22h-1.2L6.8 11.2V22H4z"
                fill="currentColor"
              />
            </svg>
          </div>
          <h1 className="auth-title">Money Money</h1>
          <p className="auth-subtitle">Your personal finance dashboard</p>
        </header>

        {error && (
          <div className="auth-error" role="alert">
            <svg
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M8 4.5v4M8 10.5v.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <p>{decodeURIComponent(error)}</p>
          </div>
        )}

        {/* Proton Pass browser extension injects data-protonpass-form, causing hydration mismatch */}
        <form className="auth-form" suppressHydrationWarning>
          <div className="auth-field">
            <label htmlFor="email" className="auth-label">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="auth-input"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password" className="auth-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="auth-input"
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>

          <SubmitButton formAction={login} />
        </form>

        <p className="auth-footer">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="auth-link">
            Sign up
          </Link>
        </p>

        <div className="auth-trust" aria-hidden="true">
          <svg
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4.5 7V5a3.5 3.5 0 1 1 7 0v2M3 7h10a1 1 0 0 1 1 1v5.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5V8a1 1 0 0 1 1-1z"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Secured with encryption</span>
        </div>
      </div>
    </div>
  );
}
