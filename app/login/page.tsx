"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ApiError, api } from "../../lib/api";
import { loadProfile } from "../../lib/profile";

type Step = "mobile" | "code";

const RESEND_SECONDS = 30;

function normalizeMobile(input: string): string | null {
  let compact = input.trim().replace(/[\s().-]/g, "");
  if (!compact) return null;
  if (compact.startsWith("00")) compact = `+${compact.slice(2)}`;
  const digits = compact.replace(/\D/g, "");
  const saudi = digits.match(/^(?:966)?0?(5\d{8})$/);
  if (saudi && (digits.length === 9 || digits.length === 10 || digits.startsWith("966"))) {
    return `+966${saudi[1]}`;
  }
  if (digits.startsWith("0") || digits.startsWith("966") || digits.length < 7 || digits.length > 15) return null;
  return `+${digits}`;
}

function formatMobile(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.length !== 12 || !digits.startsWith("966")) return e164;
  const local = digits.slice(3);
  return `+966 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
}

function mobileError(input: string): string {
  if (!input.trim()) return "Enter your mobile number.";
  if (!normalizeMobile(input)) return "Enter a valid mobile number, for example +966 5X XXX XXXX.";
  return "";
}

export default function LoginPage() {
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);
  const busy = useRef(false);
  const [step, setStep] = useState<Step>("mobile");
  const [mobile, setMobile] = useState("");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [devCode, setDevCode] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<"send" | "verify" | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const code = digits.join("");
  const normalized = normalizeMobile(mobile);
  const shownMobile = normalized ? formatMobile(normalized) : mobile.trim();

  useEffect(() => {
    if (step === "code") codeRefs.current[0]?.focus();
  }, [step]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  function resetMessages() {
    setFieldError("");
    setFormError("");
    setNotice("");
  }

  function applyCode(value: string) {
    const next = value.replace(/\D/g, "").slice(0, 6).split("");
    setDigits(Array.from({ length: 6 }, (_, index) => next[index] ?? ""));
    setFieldError("");
    setFormError("");
    const focusAt = Math.min(next.length, 5);
    codeRefs.current[focusAt]?.focus();
  }

  function onDigitChange(index: number, raw: string) {
    const only = raw.replace(/\D/g, "");
    if (only.length > 1) {
      applyCode(digits.slice(0, index).join("") + only);
      return;
    }
    const next = [...digits];
    next[index] = only;
    setDigits(next);
    setFieldError("");
    setFormError("");
    if (only && index < 5) codeRefs.current[index + 1]?.focus();
  }

  function onDigitKeyDown(index: number, key: string) {
    if (key === "Backspace" && !digits[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  }

  async function requestCode(event?: FormEvent) {
    event?.preventDefault();
    const problem = mobileError(mobile);
    if (problem || !normalized) {
      setFieldError(problem || "Enter a valid mobile number, for example +966 5X XXX XXXX.");
      setFormError("");
      setNotice("");
      return;
    }
    setPending("send");
    resetMessages();
    try {
      const result = await api<{ data: { message: string; devCode?: string } }>("/auth/otp/request", {
        method: "POST",
        body: { mobile: normalized },
      });
      setDevCode(result.data.devCode ?? "");
      setDigits(["", "", "", "", "", ""]);
      setNotice(result.data.devCode ? "" : "If this number is registered, a code was sent. It expires in 5 minutes.");
      setResendIn(RESEND_SECONDS);
      setStep("code");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not send the code. Try again.");
    } finally {
      setPending(null);
    }
  }

  async function verifyCode(nextCode: string) {
    const entered = nextCode.trim();
    if (busy.current) return;
    if (!normalized || entered.length !== 6) {
      setFieldError(entered.length !== 6 ? "Enter the 6-digit code." : "Enter a valid mobile number, for example +966 5X XXX XXXX.");
      setFormError("");
      return;
    }
    busy.current = true;
    setPending("verify");
    resetMessages();
    let signedInNow = false;
    try {
      await api("/auth/otp/verify", { method: "POST", body: { mobile: normalized, code: entered } });
      const profile = await loadProfile(true);
      signedInNow = true;
      setSignedIn(true);
      const next = profile.verified || profile.complete ? "/my-vehicle" : "/profile/complete";
      setNotice(profile.verified || profile.complete ? "Signed in. Opening your vehicle page." : "Signed in. Opening your profile.");
      window.setTimeout(() => {
        window.location.assign(next);
      }, 400);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "The code was not accepted. Try again.");
    } finally {
      if (!signedInNow) {
        busy.current = false;
        setPending(null);
      }
    }
  }

  function verify(event: FormEvent) {
    event.preventDefault();
    void verifyCode(code);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-brand-soft px-4 py-8 sm:px-6">
      <section className="login-card w-full max-w-[440px] overflow-hidden rounded-lg border border-line bg-card shadow-[0_1px_2px_rgba(17,22,16,0.04),0_16px_40px_rgba(17,22,16,0.06)]">
        <div className="bg-brand px-5 py-6 sm:px-8">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-card text-sm font-semibold text-ink">VMS</span>
          <p className="mt-4 text-xs font-medium tracking-wide text-ink/70 uppercase">Vehicle Management System</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Welcome</h1>
          <p className="mt-1 text-sm leading-6 text-ink/80">Sign in with your mobile number to open your assigned vehicle.</p>
        </div>
        <div className="px-5 py-6 sm:px-8 sm:py-7">

        <ol className="grid grid-cols-2 gap-3" aria-label="Sign-in steps">
          <StepItem index={1} label="Phone number" active={step === "mobile"} done={step === "code" || signedIn} />
          <StepItem index={2} label="OTP verification" active={step === "code" || signedIn} done={signedIn} />
        </ol>

        {signedIn ? (
          <p role="status" className="mt-6 rounded-md border border-status-ok bg-status-ok-bg px-3 py-3 text-sm text-status-ok">
            {notice || "Signed in."}
          </p>
        ) : step === "mobile" ? (
          <form onSubmit={requestCode} className="mt-6" noValidate>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Step 1 of 2</p>
            <h2 className="mt-1 text-lg font-semibold">Phone number login</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Enter the mobile number registered on your driver account.
            </p>
            <label className="mt-4 block text-sm" htmlFor="mobile">
              <span className="mb-1 block font-medium">Mobile number</span>
              <input
                id="mobile"
                name="tel"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                autoFocus
                placeholder="+966 5X XXX XXXX"
                aria-invalid={fieldError ? true : undefined}
                aria-describedby={fieldError ? "mobile-error" : "mobile-hint"}
                className={`h-12 w-full rounded-md border bg-card px-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 ${fieldError ? "border-status-danger" : "border-line"}`}
                value={mobile}
                onChange={(event) => {
                  setMobile(event.target.value);
                  setFieldError("");
                  setFormError("");
                }}
              />
            </label>
            {fieldError ? (
              <p id="mobile-error" className="mt-2 text-sm text-status-danger">{fieldError}</p>
            ) : (
              <p id="mobile-hint" className="mt-2 text-sm text-muted">Use the Saudi format +966 5X XXX XXXX.</p>
            )}
            {formError ? <Alert tone="danger">{formError}</Alert> : null}
            <button
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-brand px-3 text-sm font-medium text-ink transition duration-150 ease-out hover:bg-brand-strong active:bg-brand-mid disabled:cursor-not-allowed disabled:opacity-60"
              disabled={pending !== null}
            >
              {pending === "send" ? <Spinner /> : null}
              {pending === "send" ? "Sending code..." : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="mt-6" noValidate>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Step 2 of 2</p>
            <h2 className="mt-1 text-lg font-semibold">OTP verification</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Enter the 6-digit code for <span className="font-medium text-ink">{shownMobile}</span>.
            </p>

            <div className="mt-4 grid grid-cols-6 gap-2" role="group" aria-label="6-digit code">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(node) => {
                    codeRefs.current[index] = node;
                  }}
                  value={digit}
                  onChange={(event) => onDigitChange(index, event.target.value)}
                  onKeyDown={(event) => onDigitKeyDown(index, event.key)}
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  aria-label={`Digit ${index + 1}`}
                  aria-invalid={fieldError ? true : undefined}
                  className={`h-12 rounded-md border bg-card text-center text-lg font-semibold outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 ${fieldError ? "border-status-danger" : "border-line"}`}
                  disabled={pending !== null}
                />
              ))}
            </div>
            {fieldError ? <p className="mt-2 text-sm text-status-danger">{fieldError}</p> : null}

            {devCode ? (
              <div className="mt-4 rounded-md border border-status-warn bg-status-warn-bg px-3 py-3 text-sm text-status-warn">
                <p className="font-medium">Demo code: {devCode}</p>
                <p className="mt-1">Use this code for any mobile number. It works only in this development environment.</p>
                <button
                  type="button"
                  className="mt-2 font-medium text-ink underline disabled:cursor-not-allowed disabled:text-muted"
                  disabled={pending !== null}
                  onClick={() => {
                    applyCode(devCode);
                    void verifyCode(devCode);
                  }}
                >
                  Sign in with demo code
                </button>
              </div>
            ) : null}

            {notice ? <Alert tone="muted">{notice}</Alert> : null}
            {formError ? <Alert tone="danger">{formError}</Alert> : null}

            <button
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-brand px-3 text-sm font-medium text-ink transition duration-150 ease-out hover:bg-brand-strong active:bg-brand-mid disabled:cursor-not-allowed disabled:opacity-60"
              disabled={pending !== null}
            >
              {pending === "verify" ? <Spinner /> : null}
              {pending === "verify" ? "Checking code..." : "Verify and continue"}
            </button>

            <div className="mt-4 flex items-center justify-between gap-3 text-sm">
              <button
                type="button"
                className="font-medium text-brand-deep disabled:cursor-not-allowed disabled:text-muted"
                disabled={pending !== null}
                onClick={() => {
                  setStep("mobile");
                  setDigits(["", "", "", "", "", ""]);
                  setDevCode("");
                  resetMessages();
                }}
              >
                Change number
              </button>
              <button
                type="button"
                className="font-medium text-brand-deep disabled:cursor-not-allowed disabled:text-muted"
                disabled={pending !== null || resendIn > 0}
                onClick={() => {
                  void requestCode();
                }}
              >
                {pending === "send" ? "Sending code..." : resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
              </button>
            </div>
          </form>
        )}
        </div>
      </section>
    </main>
  );
}

function StepItem({ index, label, active, done }: { index: number; label: string; active: boolean; done: boolean }) {
  const on = active || done;
  return (
    <li className="flex items-center gap-2" aria-current={active && !done ? "step" : undefined}>
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md text-xs font-semibold ${on ? "bg-brand text-ink" : "border border-line bg-brand-soft text-muted"}`}>
        {index}
      </span>
      <span className={`min-w-0 text-sm leading-5 ${on ? "font-medium" : "text-muted"}`}>{label}</span>
    </li>
  );
}

function Alert({ tone, children }: { tone: "ok" | "danger" | "muted"; children: string }) {
  const styles = tone === "ok"
    ? "border-status-ok bg-status-ok-bg text-status-ok"
    : tone === "danger"
      ? "border-status-danger bg-status-danger-bg text-status-danger"
      : "border-line bg-canvas text-ink";
  return (
    <p role={tone === "danger" ? "alert" : "status"} className={`mt-4 rounded-md border px-3 py-2 text-sm ${styles}`}>
      {children}
    </p>
  );
}

function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ink border-t-transparent" aria-hidden="true" />;
}
