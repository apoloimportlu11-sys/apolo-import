"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { resolveIsAdmin } from "@/lib/admin-role";
import { Eye, EyeOff, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "register";
}

export default function LoginModal({
  isOpen,
  onClose,
  initialMode = "login",
}: LoginModalProps) {
  const router = useRouter();
  const supabase = createBrowserSupabase();

  const [isRegister, setIsRegister] = useState(initialMode === "register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsRegister(initialMode === "register");
  }, [initialMode]);

  // Reset form when modal closes or opens
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      setLoading(false);
    }
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleGoogleSignIn() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) {
        setLoading(false);
        setErrorMessage(error.message);
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err?.message || "Error al iniciar sesión con Google");
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (!error && data?.session) {
      try {
        await fetch("/api/auth/set-cookie", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_in: data.session.expires_at
              ? Math.max(60, data.session.expires_at - Math.floor(Date.now() / 1000))
              : undefined,
          }),
        });
      } catch (err) {
        console.error("Failed to set cookies", err);
      }

      const isAdmin = await resolveIsAdmin(supabase, data.user);
      onClose();
      if (isAdmin) {
        router.replace("/admin");
      } else {
        router.refresh();
      }
    } else if (error) {
      setLoading(false);
      setErrorMessage(
        error.message === "Invalid login credentials"
          ? "Credenciales incorrectas. Verifica tu correo y contraseña."
          : error.message
      );
    } else {
      setLoading(false);
      setErrorMessage("No se pudo iniciar sesión.");
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name: name || "Cliente",
          role: "cliente",
        },
      },
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
    } else if (data?.user) {
      // Ensure user profile in public.users exists as cliente
      try {
        await supabase.from("users").upsert(
          {
            id: data.user.id,
            name: name || "Cliente",
            email: cleanEmail,
            role: "cliente",
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "email" }
        );
      } catch (e) {
        console.error("Error creating public user row:", e);
      }

      setSuccessMessage(
        "Cuenta de cliente creada con éxito. Ahora puedes iniciar sesión con tus credenciales."
      );
      setIsRegister(false);
      setPassword("");
    } else {
      setErrorMessage("No se pudo completar el registro.");
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in-0 duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 fade-in-0 duration-200 grid grid-cols-1 md:grid-cols-12 min-h-[440px]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 rounded-full p-2 text-white/80 md:text-white/90 hover:text-white md:hover:bg-white/20 transition-colors focus:outline-none cursor-pointer"
          aria-label="Cerrar modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Left Side: Form */}
        <div className="order-2 md:order-1 md:col-span-7 flex flex-col justify-center p-8 sm:p-10 bg-white text-gray-900">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">
            {isRegister ? "Crear cuenta" : "Iniciar sesión"}
          </h2>

          {errorMessage && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-600 border border-red-100">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700 border border-emerald-100">
              <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Botón Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.99] text-gray-700 text-sm font-semibold transition-all shadow-xs mb-4 disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isRegister ? "Registrarse con Google" : "Continuar con Google"}</span>
          </button>

          {/* Separador "O" */}
          <div className="relative flex items-center justify-center mb-4">
            <div className="border-t border-gray-200 w-full" />
            <span className="bg-white px-3 text-xs text-gray-400 font-medium uppercase shrink-0">
              O con correo
            </span>
            <div className="border-t border-gray-200 w-full" />
          </div>

          <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Nombre completo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/20 transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 pr-11 text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 transition-colors focus:outline-none cursor-pointer"
                  title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] py-3 text-sm font-semibold text-white transition-all shadow-md shadow-red-600/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{isRegister ? "Registrando..." : "Ingresando..."}</span>
                </>
              ) : isRegister ? (
                "Registrarse"
              ) : (
                "Ingresar"
              )}
            </button>
          </form>

          {!isRegister && (
            <div className="mt-5 text-center">
              <p className="text-xs text-gray-400">¿Olvidaste tu contraseña?</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Contacta a tu administrador.
              </p>
            </div>
          )}
        </div>

        {/* Right Side: Red Side Panel */}
        <div className="order-1 md:order-2 md:col-span-5 bg-gradient-to-br from-red-600 via-red-600 to-rose-700 p-8 sm:p-10 text-white flex flex-col items-center justify-center text-center relative overflow-hidden">
          {/* Subtle decorative circles */}
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-black/10 blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center">
            <h3 className="text-2xl font-bold tracking-tight text-white mb-2">
              {isRegister ? "¿Ya tienes cuenta?" : "¿Eres nuevo?"}
            </h3>
            <p className="text-xs sm:text-sm text-red-100/90 mb-6 max-w-[200px] leading-relaxed">
              {isRegister
                ? "Inicia sesión con tus credenciales"
                : "Crea tu cuenta en segundos"}
            </p>

            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="rounded-xl border-2 border-white px-7 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-white hover:text-red-600 active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              {isRegister ? "Iniciar sesión" : "Registrarse"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
