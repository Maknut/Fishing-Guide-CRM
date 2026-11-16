"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CircleAlert, Mail } from "lucide-react";
import { sendSignInLink, type SignInState } from "@/app/signin/actions";
import { Button } from "./ui";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" block pending={pending} icon={<Mail size={18} aria-hidden="true" />}>
      {pending ? "Sending your link" : "Email me a sign-in link"}
    </Button>
  );
}

export function SignInForm({ initialError }: { initialError: string | null }) {
  const [state, action] = useActionState<SignInState, FormData>(sendSignInLink, { error: initialError });
  return (
    <form action={action} noValidate>
      <div className="field">
        <label htmlFor="email">Email address</label>
        <input
          id="email" name="email" type="email" className="input" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
          placeholder="you@example.com" required autoFocus aria-invalid={state.error ? true : undefined} aria-describedby={state.error ? "signin-error" : undefined}
        />
      </div>
      {state.error && (
        <p className="form-error" role="alert" id="signin-error">
          <CircleAlert size={16} aria-hidden="true" />
          <span>{state.error}</span>
        </p>
      )}
      <div style={{ marginTop: 20 }}>
        <Submit />
      </div>
    </form>
  );
}
