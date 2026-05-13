"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_COUNTRIES, type CountryCode } from "@/lib/calendar";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState<CountryCode>("IE");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, country }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? "Something went wrong");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="relative rounded-2xl bg-slate-900/70 backdrop-blur-xl ring-1 ring-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent"
        />
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shadow-[0_0_40px_-4px_rgba(99,102,241,0.6)] ring-1 ring-white/20 mb-5">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Office Tracker
          </h1>
          <p className="text-sm text-slate-300 mt-2 max-w-xs leading-relaxed">
            Track your in-office days against the 60% policy. No password —
            just enter your email.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="text-xs font-semibold uppercase tracking-wider text-slate-300"
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="you@datadoghq.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-950/60 border-0 ring-1 ring-white/15 text-white text-base placeholder:text-slate-500 h-11 focus-visible:ring-indigo-400/60 focus-visible:ring-2"
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="country"
              className="text-xs font-semibold uppercase tracking-wider text-slate-300"
            >
              Country
            </Label>
            <Select
              value={country}
              onValueChange={(v) => setCountry(v as CountryCode)}
            >
              <SelectTrigger
                id="country"
                className="bg-slate-950/60 border-0 ring-1 ring-white/15 text-white text-base h-11 w-full focus-visible:ring-indigo-400/60 focus-visible:ring-2"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && (
            <p
              className="text-sm text-red-300 bg-red-500/10 ring-1 ring-red-500/30 rounded-md px-3 py-2"
              role="alert"
            >
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="w-full h-11 mt-2 bg-gradient-to-b from-indigo-400 to-indigo-600 hover:from-indigo-300 hover:to-indigo-500 text-white shadow-[0_8px_24px_-8px_rgba(99,102,241,0.7),inset_0_1px_0_rgba(255,255,255,0.2)] ring-1 ring-indigo-300/30 font-medium"
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Continue →"}
          </Button>
        </form>
      </div>
    </div>
  );
}
