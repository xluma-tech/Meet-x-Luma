'use client';

export default function SignInButton() {
  return (
    <a
      href="/auth/login"
      className="auth-button signin-button"
    >
      <svg className="button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
      </svg>
      Sign In
    </a>
  );
}
