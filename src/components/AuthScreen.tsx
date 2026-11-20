import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react';
import { MagicBusLogo } from './MagicBusLogo';

export type AuthMode = 'signup' | 'login';

interface AuthScreenProps {
  initialMode?: AuthMode;
  signingIn: boolean;
  authError: string | null;
  onClearError: () => void;
  onSignUpWithEmail: (
    fullName: string,
    email: string,
    password: string
  ) => Promise<boolean>;
  onSignInWithEmail: (email: string, password: string) => Promise<boolean>;
  onSignInWithGoogle: () => Promise<boolean>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  initialMode = 'signup',
  signingIn,
  authError,
  onClearError,
  onSignUpWithEmail,
  onSignInWithEmail,
  onSignInWithGoogle,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setLocalError(null);
    onClearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    onClearError();

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    if (mode === 'signup') {
      if (fullName.trim().length < 2) {
        setLocalError('Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.');
        return;
      }
      await onSignUpWithEmail(fullName.trim(), cleanEmail, password);
    } else {
      if (!password) {
        setLocalError('Please enter your password.');
        return;
      }
      await onSignInWithEmail(cleanEmail, password);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen w-full bg-[#F4F6FA] grid grid-cols-1 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
      {/* Left Institutional Brand Showcase */}
      <aside
        className="relative overflow-hidden text-white flex flex-col justify-between px-7 sm:px-12 py-8 sm:py-12"
        style={{
          background:
            'linear-gradient(145deg, #041C41 0%, #072A5E 56%, #0B3A7A 100%)',
        }}
      >
        {/* Subtle Student Photo Backdrop with High-Contrast Navy Scrim */}
        <div className="absolute inset-0 pointer-events-none select-none">
          <img
            src="/assets/extracted/hero_students.png"
            alt="Students from Magic Bus India Foundation"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center opacity-20"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(155deg, rgba(4,28,65,0.92) 0%, rgba(7,42,94,0.86) 55%, rgba(4,24,56,0.96) 100%)',
            }}
          />
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <MagicBusLogo size={76} variant="dark" className="shrink-0" />
          <div className="min-w-0">
            <div className="text-[19px] sm:text-[22px] font-extrabold tracking-tight text-white leading-tight">
              Magic Bus India Foundation
            </div>
            <div className="text-[13px] italic text-[#CBD5E1] mt-0.5">
              Childhood to Livelihood
            </div>
          </div>
        </div>

        <div className="relative z-10 my-10 lg:my-0 max-w-lg space-y-5">
          <div className="flex items-stretch gap-4">
            <div
              className="w-[5px] rounded-full shrink-0 my-1"
              style={{ backgroundColor: '#FCD116' }}
              aria-hidden="true"
            />
            <div>
              <h1 className="text-[28px] sm:text-[36px] font-extrabold leading-[1.15] tracking-tight text-white">
                Training Program
                <span className="block mt-1" style={{ color: '#FCD116' }}>
                  Report Generator
                </span>
              </h1>
            </div>
          </div>

          <p className="text-[15px] text-[#DCE8F8] leading-relaxed">
            Create your private trainer workspace to prepare 12-Days AI &amp; Life &amp;
            Employability Skills reports, upload daily training photos up to date, and
            generate 12-Days and Cyber Security attendance sheets.
          </p>

          <div className="pt-4 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13.5px] text-[#E2ECF8]">
            <div>
              <div className="font-bold text-white">Private Trainer Workspace</div>
              <p className="text-[#C5D7F0] mt-0.5 leading-snug">
                Your reports, daily photos, and attendance sheets are visible only to your
                signed-in account.
              </p>
            </div>
            <div>
              <div className="font-bold text-white">Continue Every Day</div>
              <p className="text-[#C5D7F0] mt-0.5 leading-snug">
                Sign back in on Day 2 through Day 12 and resume right where you left off.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-[12.5px] text-[#B8CCE8] flex flex-wrap items-center justify-between gap-2">
          <span>Infosys Project &middot; Livelihood Operations</span>
          <span className="italic">Empowering Youth For Building a Better Tomorrow.</span>
        </div>
      </aside>

      {/* Right Authentication Form Canvas */}
      <main className="flex items-center justify-center px-5 sm:px-10 py-10 sm:py-14">
        <div className="w-full max-w-[440px] bg-white rounded-xl border border-[#DCE4F0] shadow-[0_6px_28px_rgba(7,35,75,0.08)] overflow-hidden">
          {/* Mode Switcher Tabs: Sign Up (Default) | Log In */}
          <div className="p-2 bg-[#F1F5FA] border-b border-[#DCE4F0] grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`py-2.5 px-4 rounded-lg text-[14px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                mode === 'signup'
                  ? 'bg-[#082B59] text-white shadow-sm'
                  : 'text-[#475569] hover:text-[#0A254E] hover:bg-white/70'
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`py-2.5 px-4 rounded-lg text-[14px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                mode === 'login'
                  ? 'bg-[#082B59] text-white shadow-sm'
                  : 'text-[#475569] hover:text-[#0A254E] hover:bg-white/70'
              }`}
            >
              Log In
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            <div>
              <h2 className="text-[22px] font-extrabold text-[#0A254E] tracking-tight">
                {mode === 'signup' ? 'Create Trainer Account' : 'Welcome Back'}
              </h2>
              <p className="text-[13.5px] text-[#475569] mt-1">
                {mode === 'signup'
                  ? 'Sign up to access your private report workspace and save daily photos.'
                  : 'Log in to access your saved reports, daily photos, and attendance sheets.'}
              </p>
            </div>

            {displayError && (
              <div
                role="alert"
                className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-[13px] font-medium text-[#991B1B]"
              >
                {displayError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label
                    htmlFor="auth-full-name"
                    className="block text-[13.5px] font-bold text-[#0A254E] mb-1.5"
                  >
                    Full Name
                  </label>
                  <div className="flex items-stretch rounded-lg border border-[#CBD4E1] bg-white overflow-hidden focus-within:border-[#0B336B] focus-within:ring-2 focus-within:ring-[#0B336B]/15">
                    <div className="w-10 bg-[#F7F9FC] border-r border-[#DCE3ED] flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-[#475569]" />
                    </div>
                    <input
                      id="auth-full-name"
                      type="text"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Busi Reddy Yashwanth Reddy"
                      className="w-full min-w-0 px-3.5 py-2.5 text-[14.5px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none bg-white"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-[13.5px] font-bold text-[#0A254E] mb-1.5"
                >
                  Email Address
                </label>
                <div className="flex items-stretch rounded-lg border border-[#CBD4E1] bg-white overflow-hidden focus-within:border-[#0B336B] focus-within:ring-2 focus-within:ring-[#0B336B]/15">
                  <div className="w-10 bg-[#F7F9FC] border-r border-[#DCE3ED] flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-[#475569]" />
                  </div>
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@magicbusindia.org"
                    className="w-full min-w-0 px-3.5 py-2.5 text-[14.5px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="block text-[13.5px] font-bold text-[#0A254E] mb-1.5"
                >
                  Password
                </label>
                <div className="flex items-stretch rounded-lg border border-[#CBD4E1] bg-white overflow-hidden focus-within:border-[#0B336B] focus-within:ring-2 focus-within:ring-[#0B336B]/15">
                  <div className="w-10 bg-[#F7F9FC] border-r border-[#DCE3ED] flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4 text-[#475569]" />
                  </div>
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      mode === 'signup' ? 'Minimum 6 characters' : 'Enter your password'
                    }
                    className="w-full min-w-0 px-3.5 py-2.5 text-[14.5px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none bg-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="px-3 text-[#64748B] hover:text-[#0A254E] cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <div>
                  <label
                    htmlFor="auth-confirm-password"
                    className="block text-[13.5px] font-bold text-[#0A254E] mb-1.5"
                  >
                    Confirm Password
                  </label>
                  <div className="flex items-stretch rounded-lg border border-[#CBD4E1] bg-white overflow-hidden focus-within:border-[#0B336B] focus-within:ring-2 focus-within:ring-[#0B336B]/15">
                    <div className="w-10 bg-[#F7F9FC] border-r border-[#DCE3ED] flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4 text-[#475569]" />
                    </div>
                    <input
                      id="auth-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className="w-full min-w-0 px-3.5 py-2.5 text-[14.5px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none bg-white"
                      required
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={signingIn}
                className="w-full min-h-[44px] py-2.5 px-5 rounded-lg text-white text-[14.5px] font-bold flex items-center justify-center gap-2 shadow-[0_2px_10px_rgba(7,35,75,0.22)] hover:brightness-110 disabled:opacity-65 transition-all cursor-pointer whitespace-nowrap"
                style={{
                  background: 'linear-gradient(180deg, #0D366E 0%, #07234B 100%)',
                }}
              >
                {signingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>
                      {mode === 'signup' ? 'Creating Account...' : 'Logging In...'}
                    </span>
                  </>
                ) : (
                  <span>{mode === 'signup' ? 'Create Account' : 'Log In'}</span>
                )}
              </button>
            </form>

            <div className="relative flex items-center justify-center py-1">
              <div className="w-full border-t border-[#E2E8F0]" />
              <span className="px-3 bg-white text-[12px] font-semibold text-[#64748B] absolute">
                or
              </span>
            </div>

            <button
              type="button"
              onClick={() => void onSignInWithGoogle()}
              disabled={signingIn}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-lg border border-[#CBD4E1] bg-white text-[#0F172A] text-[14px] font-bold flex items-center justify-center gap-2.5 hover:bg-[#F8FAFD] disabled:opacity-65 transition-colors cursor-pointer whitespace-nowrap"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.87c2.26-2.08 3.57-5.15 3.57-8.64Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.28v3.1A12 12 0 0 0 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.29A7.18 7.18 0 0 1 4.9 12c0-.79.14-1.56.38-2.29v-3.1H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l4-3.1Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.61l4 3.1c.95-2.84 3.6-4.96 6.72-4.96Z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <p className="text-center text-[13px] text-[#475569] pt-1">
              {mode === 'signup' ? (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="font-bold text-[#0B336B] hover:underline cursor-pointer"
                  >
                    Log in
                  </button>
                </>
              ) : (
                <>
                  Need a trainer account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="font-bold text-[#0B336B] hover:underline cursor-pointer"
                  >
                    Sign up
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
