"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  Bird,
  CheckCircle2,
  Eye,
  EyeOff,
  Feather,
  Flame,
  GraduationCap,
  KeyRound,
  Leaf,
  LoaderCircle,
  Mail,
  Phone,
  Sparkles,
  Sun,
  User,
  type LucideIcon,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { houseFromValue, houseThemes, themeAttributeForHouse } from "@/lib/houses";
import type { ArrivalParticipant } from "@/lib/common-room/types";
import { useHouse } from "./house-provider";
import { useAuth } from "./auth-provider";
import { useMagic } from "./experience";
import { useRegistrationArrival } from "./registration-arrival";

export const HOUSES = [
  "gryffindor",
  "slytherin",
  "ravenclaw",
  "hufflepuff",
] as const;
export type CanonicalHouse = (typeof HOUSES)[number];

type AuthMode = "login" | "signup" | "forgot" | "reset";
type CallbackError = "confirmation" | "reset";
type SupabaseBrowserClient = NonNullable<ReturnType<typeof getSupabase>>;

interface SignupExperienceProps {
  initialMode?: AuthMode;
  callbackError?: CallbackError;
  onSignupSuccess?: (participant: ArrivalParticipant) => void;
}

const houseIcons: Record<CanonicalHouse, LucideIcon> = {
  gryffindor: Flame,
  slytherin: Leaf,
  ravenclaw: Bird,
  hufflepuff: Sun,
};

const houseColorStyles: Record<
  CanonicalHouse,
  { border: string; bg: string; text: string; glow: string }
> = {
  gryffindor: {
    border: "border-red-600/60",
    bg: "bg-red-950/40",
    text: "text-red-300",
    glow: "shadow-[0_0_30px_rgba(220,38,38,0.35)]",
  },
  slytherin: {
    border: "border-emerald-600/60",
    bg: "bg-emerald-950/40",
    text: "text-emerald-300",
    glow: "shadow-[0_0_30px_rgba(16,185,129,0.35)]",
  },
  ravenclaw: {
    border: "border-sky-600/60",
    bg: "bg-sky-950/40",
    text: "text-sky-300",
    glow: "shadow-[0_0_30px_rgba(14,165,233,0.35)]",
  },
  hufflepuff: {
    border: "border-amber-500/60",
    bg: "bg-amber-950/40",
    text: "text-amber-300",
    glow: "shadow-[0_0_30px_rgba(245,158,11,0.35)]",
  },
};

const houseLore: Record<
  CanonicalHouse,
  { title: string; speech: string; subtext: string }
> = {
  gryffindor: {
    title: "Gryffindor",
    speech:
      "Where dwell the brave at heart! Their daring, nerve, and chivalry set Gryffindors apart.",
    subtext: "Element: Fire · Mascot: Lion · Values: Courage, Daring, Resolve",
  },
  slytherin: {
    title: "Slytherin",
    speech:
      "You could be great, you know... and Slytherin will help you on the way to greatness!",
    subtext:
      "Element: Water · Mascot: Serpent · Values: Ambition, Cunning, Resolve",
  },
  ravenclaw: {
    title: "Ravenclaw",
    speech:
      "For those of wit and learning, where curiosity unlocks every ancient door of wisdom.",
    subtext: "Element: Air · Mascot: Eagle · Values: Intelligence, Wisdom, Wit",
  },
  hufflepuff: {
    title: "Hufflepuff",
    speech:
      "Just and loyal! Patient and true, where a shared bond is the strongest spell of all.",
    subtext:
      "Element: Earth · Mascot: Badger · Values: Loyalty, Dedication, Heart",
  },
};

const IDLE_SPEECH =
  "Step forward, wizard... The Great Hall falls quiet as you take the stool. Whisper your credentials, and let the Hat discover the colours of your destiny.";
const IDLE_SUBTEXT =
  "Four houses. Equal belonging. The Hat weighs ambition, daring, intellect, and heart.";

/* ------------------------------------------------------------------ */
/* House helpers                                                       */
/* ------------------------------------------------------------------ */

function normalizeHouse(value: unknown): CanonicalHouse | null {
  if (typeof value !== "string") return null;
  const v = value.toLowerCase().trim();
  return (HOUSES as readonly string[]).includes(v)
    ? (v as CanonicalHouse)
    : null;
}

/**
 * Evenly and randomly distributes house assignment across the 4 canonical houses:
 * gryffindor, slytherin, ravenclaw, hufflepuff.
 * Queries current counts from `profiles`, finds the house(s) with the minimum member count,
 * and breaks ties by picking uniformly at random among the minimum-count houses.
 */
async function getBalancedHouse(
  client: SupabaseBrowserClient,
): Promise<CanonicalHouse> {
  try {
    const { data, error } = await client.from("profiles").select("house");

    if (!error && Array.isArray(data)) {
      const counts: Record<CanonicalHouse, number> = {
        gryffindor: 0,
        slytherin: 0,
        ravenclaw: 0,
        hufflepuff: 0,
      };

      for (const row of data) {
        const h = normalizeHouse(row?.house);
        if (h && h in counts) {
          counts[h]++;
        }
      }

      const minCount = Math.min(
        counts.gryffindor,
        counts.slytherin,
        counts.ravenclaw,
        counts.hufflepuff,
      );

      const candidates = HOUSES.filter((h) => counts[h] === minCount);
      if (candidates.length > 0) {
        return candidates[Math.floor(Math.random() * candidates.length)];
      }
    }
  } catch (err) {
    console.warn("Could not determine balanced house from profiles:", err);
  }

  // Fallback if querying profiles fails
  return HOUSES[Math.floor(Math.random() * HOUSES.length)];
}

async function resolveHouse(
  client: SupabaseBrowserClient,
  userId: string,
): Promise<CanonicalHouse> {
  try {
    const { data } = await client
      .from("profiles")
      .select("house")
      .eq("id", userId)
      .maybeSingle();
    const existing = normalizeHouse(data?.house);
    if (existing) return existing;
  } catch (err) {
    console.warn("Could not read profile house:", err);
  }

  // Assign balanced house and persist
  const assigned = await getBalancedHouse(client);
  try {
    await client
      .from("profiles")
      .upsert({ id: userId, house: assigned }, { onConflict: "id" });
  } catch {
    /* best-effort */
  }

  return assigned;
}

async function syncHouseMetadata(
  client: SupabaseBrowserClient,
  house: CanonicalHouse,
  currentMetaHouse: unknown,
) {
  if (currentMetaHouse === house) return;
  try {
    await client.auth.updateUser({ data: { house } });
  } catch {
    /* metadata sync is best-effort */
  }
}

function parseAuthError(caught: unknown): string {
  const message =
    caught instanceof Error
      ? caught.message
      : typeof caught === "string"
        ? caught
        : (caught as { message?: string })?.message ||
          "The Owlery could not complete that request. Please try again.";
  if (/invalid login credentials/i.test(message))
    return "That email and password do not match. Please verify your credentials or reset your password.";
  if (/already registered|already exists/i.test(message))
    return "An account already exists for that email. Sign in or request a password reset.";
  if (/(email|user)[ _]not[ _]confirmed/i.test(message))
    return "Please confirm the verification letter sent to your inbox before signing in.";
  if (/fetch|network|timeout/i.test(message))
    return "Cannot reach the Supabase account service. Check your internet connection.";
  if (/rate limit|too many/i.test(message))
    return "Too many attempts reached the Owlery. Please wait a moment before trying again.";
  if (/database error saving new user/i.test(message))
    return "The castle ledger encountered an error saving your student record. Please try again or sign in directly.";
  return message;
}

/* ------------------------------------------------------------------ */
/* Reusable input field (defined at module level so it never remounts) */
/* ------------------------------------------------------------------ */

const inputBase =
  "w-full rounded-xl border border-neutral-700/60 bg-neutral-900/80 py-3 text-base text-neutral-100 outline-none transition-colors duration-200 placeholder:text-neutral-500 text-ellipsis focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 disabled:opacity-60 sm:text-sm";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: LucideIcon;
  hint?: string;
  trailing?: ReactNode;
}

function Field({
  label,
  icon: Icon,
  hint,
  trailing,
  ...inputProps
}: FieldProps) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-neutral-300">
      <span>{label}</span>
      <span className="relative block">
        <Icon
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400/80"
        />
        <input
          {...inputProps}
          className={`${inputBase} pl-10 ${trailing ? "pr-11" : "pr-4"}`}
        />
        {trailing}
      </span>
      {hint && (
        <span className="text-[11px] font-normal text-neutral-500">{hint}</span>
      )}
    </label>
  );
}

const linkBtn =
  "font-medium text-amber-400 underline underline-offset-2 transition-colors hover:text-amber-300 disabled:opacity-60";

/* ------------------------------------------------------------------ */

export function SignupLoading() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-6 text-amber-200"
      aria-busy="true"
    >
      <LoaderCircle size={32} className="mb-4 animate-spin text-amber-400" />
      <h1 className="font-serif text-2xl tracking-wider text-amber-100">
        The Sorting Hat Awaits
      </h1>
      <p className="mt-2 text-xs uppercase tracking-widest text-amber-300/70">
        Opening the Great Hall doors…
      </p>
    </div>
  );
}

export function SignupExperience({
  initialMode = "login",
  callbackError,
  onSignupSuccess,
}: SignupExperienceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setHouse } = useHouse();
  const { user } = useAuth();
  const { enabled } = useMagic();
  const { begin: beginArrival, active: arrivalActive } = useRegistrationArrival();

  const [mode, setMode] = useState<AuthMode>(() =>
    searchParams.get("step") === "signup" ? "signup" : initialMode,
  );
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [continuation, setContinuation] = useState<"/account" | "/login" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [assignedHouse, setAssignedHouse] = useState<CanonicalHouse | null>(
    null,
  );

  const [hatMood, setHatMood] = useState<
    | "idle"
    | "focus_email"
    | "focus_password"
    | "deliberating"
    | "revealed"
    | "error"
  >("idle");
  const [hatSpeech, setHatSpeech] = useState(IDLE_SPEECH);
  const [hatSubtext, setHatSubtext] = useState(IDLE_SUBTEXT);

  const [error, setError] = useState(
    callbackError === "reset"
      ? "That password reset link has expired or could not be verified. Request a new reset letter below."
      : callbackError === "confirmation"
        ? "That confirmation link has expired. Request a new confirmation email below."
        : "",
  );
  const [message, setMessage] = useState("");

  const alertRef = useRef<HTMLParagraphElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockRef = useRef(false);
  const mounted = useRef(true);
  const verification = useRef<AbortController | null>(null);

  const isSignup = mode === "signup";
  const isReset = mode === "reset";
  const isForgot = mode === "forgot";
  const isNewPassword = isSignup || isReset;
  const disabled = busy || leaving || continuation !== null;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      verification.current?.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (error) alertRef.current?.focus();
  }, [error]);

  const resetHat = () => {
    setHatMood("idle");
    setHatSpeech(IDLE_SPEECH);
    setHatSubtext(IDLE_SUBTEXT);
  };

  const switchMode = (next: AuthMode, speech?: string) => {
    setMode(next);
    setError("");
    setMessage("");
    resetHat();
    if (speech) setHatSpeech(speech);
  };

  const handleInputFocus = (field: "email" | "password") => {
    if (disabled) return;
    if (field === "email") {
      setHatMood("focus_email");
      setHatSpeech(
        "Mmm, yes... searching the enchanted scrolls for your mark upon the castle ledger...",
      );
      setHatSubtext("Enter your registered student or owl-post address.");
    } else {
      setHatMood("focus_password");
      setHatSpeech(
        "A guarded incantation... ancient doors yield only to a true and steadfast key.",
      );
      setHatSubtext("Speak your secret passphrase to unseal the chambers.");
    }
  };

  const handleInputBlur = () => {
    if (disabled || assignedHouse) return;
    resetHat();
  };

  const handlePreviewHouse = (houseKey: CanonicalHouse) => {
    const lore = houseLore[houseKey];
    setAssignedHouse(houseKey);
    setHouse(houseKey);
    setHatMood("revealed");
    setHatSpeech(lore.speech);
    setHatSubtext(lore.subtext);
  };

  /** Helper: Retry API call with exponential backoff */
  const fetchWithRetry = async (url: string, signal: AbortSignal, maxRetries = 3): Promise<Response> => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const res = await fetch(url, { cache: "no-store", signal });
        if (res.ok) return res;
        if (i < maxRetries - 1) await new Promise(r => setTimeout(r, 500 * (i + 1)));
      } catch (err) {
        if (signal.aborted) throw err;
        if (i < maxRetries - 1) await new Promise(r => setTimeout(r, 500 * (i + 1)));
        else throw err;
      }
    }
    throw new Error(`Failed after ${maxRetries} retries`);
  };

  /** Reads the house the database assigned, announces it, then redirects. */
  const sortAndEnter = async (
    client: SupabaseBrowserClient,
    userId: string,
    knownHouse: unknown,
    delay: number,
  ) => {
    setLeaving(true);
<<<<<<< HEAD
    const house = normalizeHouse(knownHouse) || (await resolveHouse(client, userId));
=======
    const house = await resolveHouse(client, userId);
    if (!mounted.current) return;
    if (isSignup) {
      const controller = new AbortController();
      verification.current = controller;
      const timeout = setTimeout(() => controller.abort(), 10_000);
      try {
        const response = await fetchWithRetry("/api/common-room/arrival", controller.signal);
        const result: { status?: string; participant?: Partial<ArrivalParticipant> } = await response.json();
        const saved = result?.participant;
        const verifiedHouse = houseFromValue(saved?.house);
        if (!response.ok) throw new Error(`API returned ${response.status}: ${result?.status}`);
        if (result?.status !== "ready") throw new Error(`Arrival not ready: ${result?.status}`);
        if (saved?.id !== userId) throw new Error("User ID mismatch");
        if (typeof saved.displayName !== "string" || !saved.displayName.trim()) throw new Error("No displayName");
        if (!verifiedHouse || verifiedHouse === "default") throw new Error(`Invalid house: ${saved?.house}`);
        if (saved.house !== verifiedHouse) throw new Error("House verification failed");
        if (!mounted.current) return;
        const participant: ArrivalParticipant = { id: userId, displayName: saved.displayName, house: verifiedHouse };
        setAssignedHouse(verifiedHouse); setHouse(verifiedHouse);
        setHatMood("revealed"); setHatSpeech("Your acceptance letter has arrived.");
        setHatSubtext(houseThemes[verifiedHouse].motto);
        setMessage("Your registration is confirmed. Your acceptance letter is ready.");
        void syncHouseMetadata(client, verifiedHouse, metaHouse);
        (onSignupSuccess ?? beginArrival)(participant);
      } catch {
        if (!mounted.current) return;
        setAssignedHouse(null); setHatMood("idle");
        setHatSpeech("Your record is safe. The profile ledger needs another look.");
        setMessage("Your registration succeeded, but we could not verify your session and saved house. Continue to your Common Room to retry.");
        setContinuation("/account");
      } finally { clearTimeout(timeout); verification.current = null; }
      return;
    }
>>>>>>> 2acf31bbde9b4d88311ed58dcabef235f371347e
    setAssignedHouse(house);
    setHouse(house);
    setHatMood("revealed");
    setHatSpeech(`BETTER BE... ${house.toUpperCase()}! ⚡`);
    setHatSubtext(houseThemes[house].motto);
    setMessage(
      `${houseThemes[house].name} welcomes you! ${houseThemes[house].motto}`,
    );
    void syncHouseMetadata(client, house, knownHouse);

    timerRef.current = setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, delay);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (lockRef.current || leaving || continuation) return;
    setError("");
    setMessage("");

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const name = String(form.get("name") || "").trim();
    const college = String(form.get("college") || "").trim();
    const phone = String(form.get("phone") || "")
      .trim()
      .replace(/[\s().-]/g, "");
    const password = String(form.get("password") || "");

    if (isSignup && name.length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }
    if (isSignup && college.length < 2) {
      setError("Please enter your college or institution name.");
      return;
    }
    if (isSignup && !/^\+?\d{10,15}$/.test(phone)) {
      setError(
        "Enter a valid 10-15 digit phone number (e.g. +91 98765 43210).",
      );
      return;
    }
    if (
      isNewPassword &&
      (password.length < 12 || !/[a-z]/i.test(password) || !/\d/.test(password))
    ) {
      setError(
        "Choose a password of 12+ characters containing at least one letter and one number.",
      );
      return;
    }
    if (isReset && password !== String(form.get("confirmPassword") || "")) {
      setError("Your passwords do not match. Please verify both fields.");
      return;
    }

    const client = getSupabase();
    if (!client) {
      const err =
        "The Owlery is temporarily unreachable. Please check your Supabase configuration.";
      setError(err);
      setHatMood("error");
      setHatSpeech(
        "The connection to the castle towers has faded into mist...",
      );
      setHatSubtext(err);
      return;
    }

    lockRef.current = true;
    setBusy(true);
    setHatMood("deliberating");
    setHatSpeech("Hmm... what do we have here? Difficult, very difficult...");
    setHatSubtext(
      "The Sorting Hat weighs ambition, daring, intellect, and heart…",
    );

    try {
      if (isForgot) {
        const { error: resetErr } = await client.auth.resetPasswordForEmail(
          email,
          {
            redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
              "/reset-password",
            )}`,
          },
        );
        if (resetErr) throw resetErr;
        const msg =
          "If an account exists for that email, a password reset letter is on its way. Check your inbox and spam folder.";
        setMessage(msg);
        setHatMood("idle");
        setHatSpeech(
          "An owl has taken flight. Check your correspondence for the password reset scroll.",
        );
        setHatSubtext(msg);
      } else if (isSignup) {
<<<<<<< HEAD
        // 1. Balance and assign house across the 4 canonical houses
        const chosenHouse = await getBalancedHouse(client);

        // 2. Pass house directly in options.data alongside full_name, college, phone
=======
        // Loading public animation code is not a success signal; rendering waits for verification.
        void import("./acceptance-letter").catch(() => {});
        // The profile row (incl. a balanced house) is created by the DB trigger.
>>>>>>> 2acf31bbde9b4d88311ed58dcabef235f371347e
        const { data: signUpData, error: signUpErr } = await client.auth.signUp(
          {
            email,
            password,
            options: {
              data: {
                full_name: name,
                display_name: name,
                name,
                college,
                phone,
                house: chosenHouse,
              },
              emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
                "/login",
              )}`,
            },
          },
        );
        if (!mounted.current) return;
        if (signUpErr) throw signUpErr;

        // 3. Upsert profiles record if user/session was returned
        if (signUpData.user) {
          try {
            await client.from("profiles").upsert(
              {
                id: signUpData.user.id,
                full_name: name,
                college,
                phone,
                house: chosenHouse,
              },
              { onConflict: "id" },
            );
          } catch {
            /* best-effort sync */
          }
        }

        const emailConfirmed = Boolean(
          signUpData.user?.email_confirmed_at || signUpData.user?.confirmed_at,
        );

        if (!emailConfirmed) {
          if (signUpData.session) await client.auth.signOut();
          const signupMsg =
            `Your enrollment is written in the castle ledger! The Sorting Hat has foreseen you in ${chosenHouse.toUpperCase()}! Confirm the verification email sent to your inbox to enter your common room.`;
          setMessage(signupMsg);
          setAssignedHouse(chosenHouse);
          setHouse(chosenHouse);
          setHatMood("revealed");
          setHatSpeech(houseLore[chosenHouse].speech);
          setHatSubtext(signupMsg);
          setContinuation("/login");
          return;
        }

        if (signUpData.session && signUpData.user) {
          await sortAndEnter(
            client,
            signUpData.user.id,
            chosenHouse,
            1800,
          );
        } else {
          setMessage("Your registration was received, but no signed-in session was returned. Sign in to verify your Common Room.");
          setHatMood("idle"); setContinuation("/login");
        }
      } else if (isReset) {
        const { data: verified, error: verifyErr } =
          await client.auth.getUser();
        if (verifyErr || !verified.user) {
          setError(
            "Please open the verified password reset link from your email first.",
          );
          return;
        }
        const { error: updateErr } = await client.auth.updateUser({ password });
        if (updateErr) throw updateErr;
        setMessage(
          "Your password has been changed. Your common room is ready.",
        );
        setHatMood("revealed");
        setHatSpeech("Your castle key is renewed. Step into the Great Hall!");
      } else {
        setHatSpeech(
          "I see courage, yes... and a keen intellect... where shall I place you?",
        );

        const { data: authData, error: authErr } =
          await client.auth.signInWithPassword({
            email,
            password,
          });
        if (authErr) throw authErr;

        if (!authData.user.email_confirmed_at && !authData.user.confirmed_at) {
          await client.auth.signOut();
          throw new Error("Email not confirmed");
        }

        // Determine user house from profiles or assign balanced house if missing
        let userHouse: CanonicalHouse | null = null;
        try {
          const { data: prof } = await client
            .from("profiles")
            .select("house")
            .eq("id", authData.user.id)
            .maybeSingle();
          userHouse = normalizeHouse(prof?.house);
        } catch {
          // ignore
        }

        if (!userHouse) {
          userHouse = normalizeHouse(authData.user.user_metadata?.house);
        }

        if (!userHouse) {
          userHouse = await getBalancedHouse(client);
          try {
            await client.from("profiles").upsert(
              {
                id: authData.user.id,
                full_name:
                  (authData.user.user_metadata?.full_name as string) ||
                  (authData.user.user_metadata?.display_name as string) ||
                  authData.user.email?.split("@")[0] ||
                  "Wizard",
                college: (authData.user.user_metadata?.college as string) || "",
                phone: (authData.user.user_metadata?.phone as string) || "",
                house: userHouse,
              },
              { onConflict: "id" },
            );
            await client.auth.updateUser({ data: { house: userHouse } });
          } catch {
            /* best-effort sync */
          }
        }

        setAssignedHouse(userHouse);
        setHouse(userHouse);
        setHatMood("revealed");
        setHatSpeech(houseLore[userHouse].speech);
        setHatSubtext(houseLore[userHouse].subtext);

        await sortAndEnter(
          client,
          authData.user.id,
          userHouse,
          enabled ? 1750 : 850,
        );
      }
    } catch (caught) {
      const friendlyErr = parseAuthError(caught);
      setError(friendlyErr);
      setHatMood("error");
      setHatSpeech(
        "The lock resists that incantation. The Owlery shakes its head. Check your key and try again.",
      );
      setHatSubtext(friendlyErr);
    } finally {
      if (mounted.current) { lockRef.current = false; setBusy(false); }
    }
  };

  const currentTheme = assignedHouse
    ? houseThemes[assignedHouse]
    : houseThemes.default;
  const currentStyles = assignedHouse ? houseColorStyles[assignedHouse] : null;
  const HouseIcon = assignedHouse ? houseIcons[assignedHouse] : null;

  return (
    <div
      className={`flex min-h-[100dvh] w-full items-center justify-center bg-neutral-950 px-4 pb-12 pt-24 text-neutral-100 selection:bg-amber-500/30 selection:text-amber-100 transition-opacity duration-500 motion-reduce:transition-none sm:px-6 sm:pt-28 lg:px-8 ${arrivalActive ? "pointer-events-none opacity-0" : ""}`}
      data-theme={
        assignedHouse ? themeAttributeForHouse(assignedHouse) : undefined
      }
      data-house={assignedHouse || undefined}
    >
      {/* minmax(0, …) stops long text from stretching the grid columns */}
      <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl border border-amber-500/20 bg-neutral-900/60 shadow-2xl shadow-black/80 backdrop-blur-2xl lg:min-h-[44rem] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* ============ LEFT: SORTING HAT ============ */}
        <aside className="relative flex min-w-0 flex-col items-center gap-4 overflow-hidden border-b border-amber-500/20 bg-gradient-to-b from-amber-950/20 via-neutral-950/80 to-purple-950/20 p-5 sm:p-8 lg:border-b-0 lg:border-r">
          <div
            className="pointer-events-none absolute left-1/2 top-12 h-56 w-56 -translate-x-1/2 rounded-full bg-gradient-to-tr from-amber-400/10 via-orange-500/10 to-transparent blur-3xl"
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-wrap items-center justify-center gap-x-2 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-amber-300">
            <span aria-hidden="true" className="text-amber-400">
              ✦
            </span>
            <span>The Great Hall · BIT Patna</span>
            <span aria-hidden="true" className="text-amber-400">
              ✦
            </span>
          </div>

          <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center gap-4">
            {/* Hat artwork: fixed box, image fills it (no more overflow) */}
            <div
              className={`relative h-32 w-32 shrink-0 transition-transform duration-500 sm:h-40 sm:w-40 lg:h-44 lg:w-44 ${
                hatMood === "deliberating"
                  ? "scale-105 animate-pulse"
                  : hatMood === "revealed"
                    ? "scale-110 drop-shadow-[0_0_25px_rgba(245,158,11,0.6)]"
                    : ""
              }`}
            >
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute -inset-3 -z-10 rounded-full blur-2xl transition-colors duration-500 ${
                  currentStyles ? currentStyles.bg : "bg-amber-500/15"
                }`}
              />
              <Image
                src="/images/sorting-hat.png"
                alt="The Sorting Hat"
                width={260}
                height={260}
                priority
                sizes="(min-width: 1024px) 176px, 160px"
                className="h-full w-full object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.9)]"
              />
            </div>

            {/* Chatbox */}
            <div className="flex w-full max-w-md flex-col gap-4">
              <div
                className={`relative rounded-2xl border bg-neutral-900/90 p-4 shadow-2xl backdrop-blur-xl transition-[border-color,box-shadow] duration-500 sm:p-5 ${
                  currentStyles
                    ? `${currentStyles.border} ${currentStyles.glow}`
                    : "border-amber-500/30 shadow-amber-500/10"
                }`}
              >
                <div
                  className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-l border-t border-inherit bg-neutral-900"
                  aria-hidden="true"
                />

                <div className="mb-3 flex items-center justify-between gap-2 border-b border-amber-500/20 pb-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="shrink-0 animate-spin text-xs text-amber-400 [animation-duration:6s]"
                    >
                      ✦
                    </span>
                    <span className="truncate text-[10px] font-semibold uppercase tracking-widest text-amber-200 sm:text-xs">
                      The Sorting Hat
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-500/20 bg-neutral-950/80 px-2.5 py-1 text-[9px] uppercase tracking-wider text-neutral-300">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        hatMood === "deliberating"
                          ? "animate-ping bg-amber-400"
                          : hatMood === "revealed"
                            ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                            : hatMood === "error"
                              ? "bg-red-400"
                              : "bg-amber-400/80"
                      }`}
                    />
                    <span>
                      {hatMood === "deliberating"
                        ? "Deliberating…"
                        : hatMood === "revealed"
                          ? "Sorted!"
                          : hatMood === "error"
                            ? "Lock resisted"
                            : "Listening"}
                    </span>
                  </div>
                </div>

                {hatMood === "revealed" && assignedHouse && HouseIcon && (
                  <div
                    className={`mb-3 flex items-center gap-3 rounded-xl border p-3 animate-in fade-in zoom-in-95 duration-500 ${currentStyles?.border} ${currentStyles?.bg}`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/40 bg-neutral-950/80">
                      <HouseIcon size={22} className={currentStyles?.text} />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[9px] font-semibold uppercase tracking-widest text-amber-400/90">
                        Decree of the Founders
                      </span>
                      <h3
                        className={`font-serif text-lg font-bold uppercase leading-tight tracking-wider sm:text-xl ${currentStyles?.text}`}
                      >
                        {currentTheme.name}
                      </h3>
                      <p className="break-words text-[11px] italic leading-snug text-neutral-300">
                        {currentTheme.motto}
                      </p>
                    </div>
                  </div>
                )}

                {/* min-height keeps the box from jumping as the Hat's lines change */}
                <div className="flex min-h-[5.5rem] items-start gap-2 sm:min-h-[6rem]">
                  <Feather
                    size={14}
                    className="mt-1.5 shrink-0 text-amber-400"
                    aria-hidden="true"
                  />
                  <p className="break-words font-serif text-sm italic leading-relaxed text-amber-50/95 sm:text-[15px]">
                    &ldquo;{hatSpeech}&rdquo;
                  </p>
                </div>

                {hatSubtext && (
                  <div className="mt-3 flex items-start gap-1.5 border-t border-white/5 pt-2.5 text-[11px] leading-snug text-neutral-400">
                    <Sparkles
                      size={11}
                      className="mt-0.5 shrink-0 text-amber-400"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 break-words">{hatSubtext}</span>
                  </div>
                )}
              </div>

              {/* Houses */}
              <div className="flex flex-col gap-2">
                <span className="text-center text-[9px] uppercase tracking-[0.2em] text-neutral-400">
                  Four houses · equal belonging
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {HOUSES.map((h) => {
                    const Icon = houseIcons[h];
                    const isSelected = assignedHouse === h;
                    return (
                      <button
                        type="button"
                        key={h}
                        onClick={() => handlePreviewHouse(h)}
                        aria-pressed={isSelected}
                        title={`${houseLore[h].title}: click to hear the Hat`}
                        className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-[9px] font-medium capitalize transition-all duration-300 ${
                          isSelected
                            ? `${houseColorStyles[h].border} ${houseColorStyles[h].bg} ${houseColorStyles[h].text} shadow-lg`
                            : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                        }`}
                      >
                        <Icon size={16} />
                        <span className="max-w-full truncate">{h}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 hidden items-center gap-3 text-[9px] uppercase tracking-[0.2em] text-neutral-500 sm:flex">
            <span>The Hat remembers</span>
            <span aria-hidden="true" className="text-amber-400">
              ✦
            </span>
            <span>Your destiny awaits</span>
          </div>
        </aside>

        {/* ============ RIGHT: FORM ============ */}
        <section className="flex min-w-0 flex-col justify-center bg-gradient-to-br from-neutral-900/90 via-neutral-950 to-neutral-900/90 p-5 sm:p-8 lg:p-10">
          <div className="mx-auto flex w-full max-w-md flex-col gap-5">
            <div>
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-400">
                {isSignup
                  ? "Chapter I · Your letter has arrived"
                  : isForgot
                    ? "A lost key can be found"
                    : isReset
                      ? "A new key to the castle"
                      : "Return to the common room"}
              </span>

              <h1 className="font-serif text-3xl font-normal leading-tight tracking-tight text-neutral-100 sm:text-4xl">
                {isSignup ? (
                  <>
                    The Hat <em className="italic text-amber-300">Awaits</em>
                  </>
                ) : isForgot ? (
                  <>
                    Recover your{" "}
                    <em className="italic text-amber-300">castle key</em>
                  </>
                ) : isReset ? (
                  <>
                    A fresh start.{" "}
                    <em className="italic text-amber-300">A stronger spell</em>
                  </>
                ) : (
                  <>
                    The Hat{" "}
                    <em className="italic text-amber-300">Remembers You</em>
                  </>
                )}
              </h1>

              <p className="mt-2 text-xs leading-relaxed text-neutral-400 sm:text-sm">
                {isSignup
                  ? "Create your student record. Once created, the Hat will divine your house with balanced harmony."
                  : isForgot
                    ? "Enter your registered email to receive an owl-post password reset link."
                    : isReset
                      ? "Choose a strong new passphrase for your Technika account."
                      : "Sign in with your email and password. If unsorted, the Hat will assign your house evenly across the four."}
              </p>
            </div>

            {user && !isReset && !leaving && (
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                <span className="min-w-0 break-all">
                  Signed in as {user.email}.
                </span>
                <Link
                  href="/account"
                  className="inline-flex shrink-0 items-center gap-1 font-semibold underline hover:text-amber-100"
                >
                  Common Room <ArrowRight size={13} />
                </Link>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              {isSignup && (
                <>
                  <Field
                    label="Full name"
                    icon={User}
                    name="name"
                    type="text"
                    autoComplete="name"
                    minLength={2}
                    maxLength={80}
                    placeholder="Name on your Hogwarts letter"
                    disabled={disabled}
                    required
                  />
                  <Field
                    label="College / University"
                    icon={GraduationCap}
                    name="college"
                    type="text"
                    autoComplete="organization"
                    minLength={2}
                    maxLength={160}
                    placeholder="Your college or university"
                    disabled={disabled}
                    required
                  />
                  <Field
                    label="Phone number"
                    icon={Phone}
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={25}
                    placeholder="e.g. +91 98765 43210"
                    hint="Include the country code (+91 for India)."
                    disabled={disabled}
                    required
                  />
                </>
              )}

              {!isReset && (
                <Field
                  label="Email address"
                  icon={Mail}
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  placeholder="you@your-college.ac.in"
                  disabled={disabled}
                  onFocus={() => handleInputFocus("email")}
                  onBlur={handleInputBlur}
                  required
                />
              )}

              {!isForgot && (
                <Field
                  label={isReset ? "New password" : "Password"}
                  icon={KeyRound}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    isNewPassword ? "new-password" : "current-password"
                  }
                  minLength={isNewPassword ? 12 : 1}
                  maxLength={128}
                  placeholder="Your secret key to the castle"
                  hint={
                    isNewPassword
                      ? "12+ characters, including a letter and a number."
                      : undefined
                  }
                  disabled={disabled}
                  onFocus={() => handleInputFocus("password")}
                  onBlur={handleInputBlur}
                  required
                  trailing={
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-neutral-400 transition-colors hover:text-amber-200"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
              )}

              {isReset && (
                <Field
                  label="Confirm password"
                  icon={KeyRound}
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  placeholder="Repeat your new password"
                  disabled={disabled}
                  required
                />
              )}

              {mode === "login" && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    switchMode(
                      "forgot",
                      "A misplaced key? Fear not. Tell me your owl-post address and we shall dispatch a replacement cipher.",
                    )
                  }
                  className="-mt-1 self-end text-xs text-amber-400/90 transition-colors hover:text-amber-300 disabled:opacity-60"
                >
                  Forgot your password?
                </button>
              )}

              {error && (
                <p
                  ref={alertRef}
                  tabIndex={-1}
                  role="alert"
                  className="break-words rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs leading-relaxed text-red-200 outline-none"
                >
                  {error}
                </p>
              )}

              {message && (
                <p
                  role="status"
                  className="flex items-start gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs leading-relaxed text-emerald-200"
                >
                  <CheckCircle2
                    size={16}
                    className="mt-0.5 shrink-0 text-emerald-400"
                  />
                  <span className="min-w-0 break-words">{message}</span>
                </p>
              )}

              <button
                type="submit"
                disabled={disabled}
                className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-widest text-neutral-950 shadow-lg shadow-amber-500/20 transition-all duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
              >
                {continuation ? <><CheckCircle2 size={16} /><span>Registration recorded</span></> : disabled ? (
                  <>
                    <LoaderCircle size={16} className="shrink-0 animate-spin" />
                    <span>
                      {leaving
                        ? assignedHouse
                          ? `Entering ${assignedHouse.toUpperCase()}…`
                          : "Opening Common Room…"
                        : "The Hat is Deliberating…"}
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      {isSignup
                        ? "Begin Your Ceremony"
                        : isForgot
                          ? "Send Reset Letter"
                          : isReset
                            ? "Save New Password"
                            : "Return To Your House"}
                    </span>
                    <ArrowRight size={16} className="shrink-0" />
                  </>
                )}
              </button>
            </form>
            {continuation && <Link href={continuation} className={`${linkBtn} inline-flex min-h-11 items-center justify-center gap-2 text-sm`} data-no-transition>{continuation === "/login" ? "Continue to sign in" : "Continue to your Common Room"}<ArrowRight size={15} /></Link>}

            <div className="border-t border-neutral-800 pt-4 text-center text-xs text-neutral-400">
              {isSignup ? (
                <>
                  Already sorted into a house?{" "}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => switchMode("login")}
                    className={linkBtn}
                  >
                    Return to sign in
                  </button>
                </>
              ) : isForgot ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => switchMode("login")}
                  className={linkBtn}
                >
                  ← Back to sign in
                </button>
              ) : isReset ? (
                <Link href="/login" className={linkBtn}>
                  Return to sign in →
                </Link>
              ) : (
                <>
                  New to the castle?{" "}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      switchMode(
                        "signup",
                        "A new student approaches! Speak your name and let your chapter begin.",
                      )
                    }
                    className={linkBtn}
                  >
                    Let the Hat discover you
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
