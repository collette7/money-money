# Money Money - Login Page UI Design

## Overview
A polished, premium login page design for the Money Money financial dashboard application. The design emphasizes trust, security, and professional aesthetics suitable for a financial application.

## Design Features

### Visual Design
- **Premium Card Design**: Floating card with 4-layer shadow depth
- **Ambient Background**: Subtle radial gradient glow with dot grid overlay
- **Brand Identity**: Custom "M" monogram logo with hover animation
- **Dark Mode Support**: Fully responsive to system theme preferences
- **Accessibility**: WCAG compliant with proper ARIA labels and reduced motion support

### Interactions & Animations
- **Entrance Animation**: Card slides up with scale effect (0.7s spring easing)
- **Staggered Reveal**: Child elements cascade in with 90ms delays
- **Micro-interactions**: 
  - Logo scales and rotates on hover
  - Input labels change color when focused
  - Submit button lifts with shadow on hover
  - Links fade in underlines smoothly
- **Loading States**: Animated spinner during form submission

### Typography & Spacing
- **Visual Hierarchy**: Clear zones for brand → form → footer
- **Generous Spacing**: 48px between major sections
- **Optimized Inputs**: 46px tall for comfortable interaction
- **Professional Typography**: Tight tracking on title, readable body text

## Component Code

### Login Page Component (page.tsx)

```tsx
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
```

### Submit Button Component (submit-button.tsx)

```tsx
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
      type="submit"
      formAction={formAction}
      disabled={pending}
      className="auth-submit"
    >
      {pending ? (
        <>
          <svg
            className="auth-spinner"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="31.4 62.8"
              opacity="0.25"
            />
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="31.4 62.8"
              strokeDashoffset="47.1"
            />
          </svg>
          Signing in...
        </>
      ) : (
        "Sign in"
      )}
    </button>
  );
}
```

## Styles (CSS)

```css
/* ─── Auth Pages ─────────────────────────────────────────────────────────── */

.auth-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  position: relative;
  overflow: hidden;
}

/* Ambient gradient glow behind the card */
.auth-page::before {
  content: '';
  position: absolute;
  top: -30%;
  left: 50%;
  width: 140%;
  height: 80%;
  transform: translateX(-50%);
  background: radial-gradient(
    ellipse 60% 50% at 50% 50%,
    oklch(0.94 0.012 250 / 0.6) 0%,
    oklch(0.96 0.008 250 / 0.2) 40%,
    transparent 70%
  );
  pointer-events: none;
  z-index: 0;
}

.dark .auth-page::before {
  background: radial-gradient(
    ellipse 60% 50% at 50% 50%,
    oklch(0.22 0.025 260 / 0.4) 0%,
    oklch(0.18 0.012 260 / 0.15) 40%,
    transparent 70%
  );
}

/* Subtle dot grid overlay */
.auth-page::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(oklch(0.7 0 0 / 0.07) 1px, transparent 1px);
  background-size: 24px 24px;
  pointer-events: none;
  z-index: 0;
}

.dark .auth-page::after {
  background-image: radial-gradient(oklch(1 0 0 / 0.03) 1px, transparent 1px);
}

/* Card container */
.auth-card {
  width: 100%;
  max-width: 420px;
  position: relative;
  z-index: 1;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) + 8px);
  padding: var(--space-2xl) var(--space-xl);
  display: flex;
  flex-direction: column;
  box-shadow:
    0 1px 2px oklch(0 0 0 / 0.03),
    0 4px 8px oklch(0 0 0 / 0.04),
    0 12px 24px oklch(0 0 0 / 0.05),
    0 24px 48px oklch(0 0 0 / 0.04);
  animation: auth-card-enter 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.dark .auth-card {
  box-shadow:
    0 0 0 1px oklch(1 0 0 / 0.04),
    0 4px 8px oklch(0 0 0 / 0.15),
    0 12px 24px oklch(0 0 0 / 0.2),
    0 24px 48px oklch(0 0 0 / 0.15);
}

@keyframes auth-card-enter {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.auth-card > * {
  opacity: 0;
  animation: auth-stagger-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes auth-stagger-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.auth-card > *:nth-child(1) { animation-delay: 0.3s; }
.auth-card > *:nth-child(2) { animation-delay: 0.39s; }
.auth-card > *:nth-child(3) { animation-delay: 0.48s; }
.auth-card > *:nth-child(4) { animation-delay: 0.57s; }
.auth-card > *:nth-child(5) { animation-delay: 0.66s; }

/* Brand / header section */
.auth-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-xs);
  margin-bottom: var(--space-xl);
}

.auth-logo {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: calc(var(--radius) + 4px);
  background: var(--primary);
  color: var(--primary-foreground);
  margin-bottom: var(--space-md);
  box-shadow:
    0 2px 4px oklch(0 0 0 / 0.1),
    0 4px 12px oklch(0 0 0 / 0.08);
  transition:
    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.auth-logo:hover {
  transform: scale(1.05) rotate(-2deg);
  box-shadow:
    0 4px 8px oklch(0 0 0 / 0.1),
    0 8px 20px oklch(0 0 0 / 0.1);
}

.auth-title {
  font-size: var(--text-title);
  font-weight: var(--font-bold);
  color: var(--foreground);
  letter-spacing: -0.03em;
  line-height: 1.2;
  margin: 0;
}

.auth-subtitle {
  font-size: var(--text-body);
  color: var(--muted-foreground);
  line-height: 1.5;
  letter-spacing: 0.01em;
  margin: 0;
}

/* Error alert */
.auth-error {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: oklch(0.97 0.02 25);
  border: 1px solid oklch(0.9 0.06 25);
  border-radius: var(--radius);
  color: oklch(0.5 0.18 25);
  font-size: var(--text-detail);
  line-height: 1.4;
  margin-bottom: var(--space-md);
  animation: slide-up 0.3s ease-out;
}

.dark .auth-error {
  background: oklch(0.2 0.04 25);
  border-color: oklch(0.35 0.1 25);
  color: oklch(0.78 0.14 25);
}

.auth-error svg {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-top: 1px;
}

/* Form */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
}

/* Individual field */
.auth-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.auth-label {
  font-size: var(--text-detail);
  font-weight: var(--font-medium);
  color: var(--foreground);
  line-height: 1.3;
  transition: color 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.auth-field:has(.auth-input:focus) .auth-label {
  color: var(--ring);
}

.auth-input {
  height: 46px;
  width: 100%;
  padding: 0 var(--space-sm);
  background: var(--background);
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  font-size: var(--text-body);
  font-family: inherit;
  color: var(--foreground);
  transition:
    border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  outline: none;
}

.auth-input::placeholder {
  color: var(--muted-foreground);
  opacity: 0.4;
}

.auth-input:hover:not(:focus) {
  border-color: oklch(0.75 0 0);
}

.dark .auth-input:hover:not(:focus) {
  border-color: oklch(0.4 0 0);
}

.auth-input:focus {
  border-color: var(--ring);
  box-shadow:
    0 0 0 3px oklch(0.7 0 0 / 0.1),
    inset 0 1px 2px oklch(0 0 0 / 0.03);
  background: var(--card);
}

.dark .auth-input:focus {
  box-shadow:
    0 0 0 3px oklch(0.5 0 0 / 0.15),
    inset 0 1px 2px oklch(0 0 0 / 0.06);
}

/* Submit button */
.auth-submit {
  height: 48px;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  margin-top: var(--space-md);
  padding: 0 var(--space-md);
  background: var(--primary);
  color: var(--primary-foreground);
  border: none;
  border-radius: var(--radius);
  font-size: var(--text-body);
  font-weight: var(--font-medium);
  font-family: inherit;
  cursor: pointer;
  transition:
    transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.2s ease;
  position: relative;
  overflow: hidden;
}

.auth-submit::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    oklch(1 0 0 / 0.08) 0%,
    transparent 50%,
    oklch(0 0 0 / 0.04) 100%
  );
  pointer-events: none;
}

.auth-submit:hover:not(:disabled) {
  transform: translateY(-1.5px);
  box-shadow:
    0 4px 8px oklch(0 0 0 / 0.08),
    0 8px 20px oklch(0 0 0 / 0.1);
}

.auth-submit:active:not(:disabled) {
  transform: translateY(0.5px) scale(0.98);
  box-shadow: 0 1px 3px oklch(0 0 0 / 0.1);
  transition-duration: 0.1s;
}

.auth-submit:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.auth-submit:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

/* Loading spinner */
@keyframes auth-spin {
  to { transform: rotate(360deg); }
}

.auth-spinner {
  width: 18px;
  height: 18px;
  animation: auth-spin 0.7s linear infinite;
}

/* Footer */
.auth-footer {
  text-align: center;
  font-size: var(--text-detail);
  color: var(--muted-foreground);
  margin: 0 0 var(--space-sm);
  line-height: 1.5;
}

.auth-link {
  color: var(--foreground);
  font-weight: var(--font-medium);
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 4px;
  transition:
    text-decoration-color 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    color 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.auth-link:hover {
  text-decoration-color: currentColor;
}

/* Trust indicator */
.auth-trust {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: var(--text-label);
  color: var(--muted-foreground);
  letter-spacing: 0.02em;
}

.auth-trust svg {
  width: 12px;
  height: 12px;
  opacity: 0.7;
}

@media (prefers-reduced-motion: reduce) {
  .auth-card,
  .auth-card > * {
    animation: none;
    opacity: 1;
  }

  .auth-logo,
  .auth-input,
  .auth-submit,
  .auth-label,
  .auth-link {
    transition: none;
  }
}

@media (max-width: 480px) {
  .auth-page {
    padding: var(--space-md);
    align-items: flex-start;
  }

  .auth-card {
    margin-top: var(--space-2xl);
    padding: var(--space-xl) var(--space-lg);
  }
}
```

## Design System Variables Used

```css
/* Spacing tokens */
--space-xs: 0.5rem;   /* 8px */
--space-sm: 1rem;     /* 16px */
--space-md: 1.5rem;   /* 24px */
--space-lg: 2rem;     /* 32px */
--space-xl: 3rem;     /* 48px */
--space-2xl: 4rem;    /* 64px */

/* Typography */
--text-title: 1.75rem;  /* 28px */
--text-body: 1rem;      /* 16px */
--text-detail: 0.875rem;/* 14px */
--text-label: 0.75rem;  /* 12px */

/* Font weights */
--font-bold: 700;
--font-medium: 500;
--font-regular: 400;

/* Border radius */
--radius: 0.625rem;     /* 10px */

/* Colors */
--primary: oklch(0.205 0 0);
--primary-foreground: oklch(0.985 0 0);
--foreground: oklch(0.145 0 0);
--muted-foreground: oklch(0.556 0 0);
--background: oklch(1 0 0);
--card: oklch(1 0 0);
--border: oklch(0.922 0 0);
--ring: oklch(0.708 0 0);
```

## Key Design Decisions

1. **Trust & Security**: The design emphasizes trust through:
   - Clean, professional aesthetics
   - "Secured with encryption" message with lock icon
   - Subtle animations that feel stable, not flashy
   - Conservative color palette

2. **Accessibility**: 
   - Proper semantic HTML structure
   - ARIA labels for screen readers
   - Respects prefers-reduced-motion
   - High contrast ratios for text

3. **Performance**:
   - No external dependencies
   - CSS-only animations
   - Built-in React hooks for form status
   - Optimized for server components

4. **Mobile-First**:
   - Responsive padding and spacing
   - Touch-friendly input heights (46px)
   - Card adjusts position on small screens

## Implementation Notes

- The login page is a server component that handles errors via URL params
- The submit button is a client component to handle loading states
- All styles use CSS custom properties from the design system
- Animations use spring curves for natural motion
- Dark mode automatically adapts to system preferences