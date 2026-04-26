import Link from "next/link";

import { signUpAction } from "@/features/auth/actions";
import { AuthField } from "@/components/auth/AuthField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Notice } from "@/components/ui/notice";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <div className="space-y-7">
      <div className="space-y-3 pt-5 text-center sm:pt-0">
        <h1 className="text-[40px] font-semibold tracking-[-0.03em] text-[#dce9ff] sm:text-[56px]">
          Create account
        </h1>
        <p className="text-[20px] text-[#6785b1]">Start your journey with us today</p>
      </div>

      {error ? (
        <Notice className="border-[#ff3e73]/45 bg-[#431634]/45 text-[#ffd2df]">{error}</Notice>
      ) : null}

      <form action={signUpAction} className="space-y-5">
        <AuthField
          id="fullName"
          name="fullName"
          label="Full Name"
          iconName="user"
          autoComplete="name"
          placeholder="John Doe"
        />
        <AuthField
          id="email"
          name="email"
          label="Email"
          iconName="mail"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          required
        />
        <AuthField
          id="password"
          name="password"
          label="Password"
          iconName="key"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          minLength={8}
          required
        />
        <AuthField
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm Password"
          iconName="key"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          minLength={8}
          required
        />

        <label className="flex items-center gap-3 text-[15px] text-[#7a97c0]">
          <input
            type="checkbox"
            name="acceptTerms"
            required
            className="h-5 w-5 rounded-[6px] border border-[#1f3860] bg-[#0f1d3d] text-[#ff3e73] accent-[#ff3e73]"
          />
          <span>
            I agree to the <span className="text-[#ff4f81]">Terms of Service</span> and{" "}
            <span className="text-[#ff4f81]">Privacy Policy</span>
          </span>
        </label>

        <SubmitButton className="h-14 w-full rounded-[18px] border-0 bg-[#ff3e73] text-[18px] font-semibold tracking-normal text-white shadow-[0_10px_26px_rgba(255,62,115,0.35)] hover:bg-[#ff5a88]">
          Create account
        </SubmitButton>
      </form>

      <p className="pb-2 text-center text-[18px] text-[#6684af]">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[#ff4f81] transition hover:text-[#ff6b95]">
          Sign in
        </Link>
      </p>
    </div>
  );
}
