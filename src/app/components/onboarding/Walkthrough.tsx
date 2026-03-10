"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Zap,
  LayoutDashboard,
  CheckSquare,
  Users,
  Search,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Flame,
} from "lucide-react";

interface Step {
  target: string | null;
  title: string;
  description: string;
  icon: React.ElementType;
  position: "center" | "right" | "bottom" | "left";
  color: string;
}

const STEPS: Step[] = [
  {
    target: null,
    title: "Welcome to Puff Pastry!",
    description:
      "Your study hub for tracking progress, staying focused, and studying with friends. Let's take a quick tour!",
    icon: Zap,
    position: "center",
    color: "bg-[#FFC107]",
  },
  {
    target: "[data-tour='sidebar-nav']",
    title: "Navigate Your Hub",
    description:
      "Switch between Dashboard, Friends, Tasks, and Notes. Everything you need is one click away.",
    icon: LayoutDashboard,
    position: "right",
    color: "bg-[#B3D4FF]",
  },
  {
    target: "[data-tour='dashboard-stats']",
    title: "Track Your Progress",
    description:
      "See your tasks done, study hours, streak, and GPA at a glance. Stay on top of your semester.",
    icon: Flame,
    position: "bottom",
    color: "bg-[#FFC107]",
  },
  {
    target: "[data-tour='nav-tasks']",
    title: "Manage Tasks & Burnout",
    description:
      "Add tasks, track academic load, and monitor your burnout risk with AI-powered analysis.",
    icon: CheckSquare,
    position: "right",
    color: "bg-[#B3FFB3]",
  },
  {
    target: "[data-tour='nav-friends']",
    title: "Study With Friends",
    description:
      "Start live study sessions, send messages, and view friend profiles. Learning is better together.",
    icon: Users,
    position: "right",
    color: "bg-[#FFB3C1]",
  },
  {
    target: "[data-tour='topbar-actions']",
    title: "Search & Notifications",
    description:
      "Find anything fast with search, and never miss updates with the notification bell.",
    icon: Search,
    position: "bottom",
    color: "bg-[#B3D4FF]",
  },
  {
    target: null,
    title: "You're All Set!",
    description:
      "Start exploring your dashboard. You can replay this tour anytime from the sidebar.",
    icon: Sparkles,
    position: "center",
    color: "bg-[#B3FFB3]",
  },
];

const STORAGE_KEY = "puff_pastry_tour_completed";

function getRect(selector: string): DOMRect | null {
  const el = document.querySelector(selector);
  return el ? el.getBoundingClientRect() : null;
}

export default function Walkthrough() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Check localStorage on mount
  useEffect(() => {
    setMounted(true);
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      const timer = setTimeout(() => setActive(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  // Position spotlight and tooltip when step changes
  const positionElements = useCallback(() => {
    const current = STEPS[step];
    if (!current.target) {
      setSpotlightRect(null);
      setTooltipStyle({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      });
      return;
    }

    const rect = getRect(current.target);
    if (!rect) {
      setSpotlightRect(null);
      setTooltipStyle({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      });
      return;
    }

    const pad = 8;
    setSpotlightRect(rect);

    const tooltip = tooltipRef.current;
    const tooltipW = tooltip?.offsetWidth ?? 360;
    const tooltipH = tooltip?.offsetHeight ?? 200;

    let style: React.CSSProperties = { position: "fixed" };

    switch (current.position) {
      case "right":
        style.top = Math.max(16, rect.top + rect.height / 2 - tooltipH / 2);
        style.left = rect.right + pad + 16;
        if ((style.left as number) + tooltipW > window.innerWidth - 16) {
          style.left = rect.left - tooltipW - pad - 16;
        }
        break;
      case "bottom":
        style.top = rect.bottom + pad + 16;
        style.left = Math.max(
          16,
          Math.min(
            rect.left + rect.width / 2 - tooltipW / 2,
            window.innerWidth - tooltipW - 16
          )
        );
        break;
      case "left":
        style.top = Math.max(16, rect.top + rect.height / 2 - tooltipH / 2);
        style.left = rect.left - tooltipW - pad - 16;
        break;
      default:
        style.top = "50%";
        style.left = "50%";
        style.transform = "translate(-50%, -50%)";
    }

    setTooltipStyle(style);
  }, [step]);

  useEffect(() => {
    if (!active) return;
    positionElements();
    window.addEventListener("resize", positionElements);
    window.addEventListener("scroll", positionElements, true);
    return () => {
      window.removeEventListener("resize", positionElements);
      window.removeEventListener("scroll", positionElements, true);
    };
  }, [active, step, positionElements]);

  const finish = useCallback(() => {
    setActive(false);
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  const next = useCallback(() => {
    if (step >= STEPS.length - 1) {
      finish();
    } else {
      setStep((s) => s + 1);
    }
  }, [step, finish]);

  const prev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  // Keyboard navigation
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, next, prev, skip]);

  if (!mounted || !active) return null;

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const Icon = current.icon;

  const spotlightClip = spotlightRect
    ? `polygon(
        0% 0%, 0% 100%, 
        ${spotlightRect.left - 8}px 100%, 
        ${spotlightRect.left - 8}px ${spotlightRect.top - 8}px, 
        ${spotlightRect.right + 8}px ${spotlightRect.top - 8}px, 
        ${spotlightRect.right + 8}px ${spotlightRect.bottom + 8}px, 
        ${spotlightRect.left - 8}px ${spotlightRect.bottom + 8}px, 
        ${spotlightRect.left - 8}px 100%, 
        100% 100%, 100% 0%
      )`
    : undefined;

  return createPortal(
    <div className="walkthrough-overlay" aria-modal="true" role="dialog" aria-label="Feature walkthrough">
      {/* Dark overlay with spotlight cutout */}
      <div
        className="fixed inset-0 z-[9998] transition-all duration-300"
        style={{
          backgroundColor: spotlightRect ? "transparent" : "rgba(0,0,0,0.6)",
          clipPath: spotlightClip,
          background: spotlightRect ? "rgba(0,0,0,0.6)" : undefined,
        }}
        onClick={skip}
      />

      {/* Spotlight border ring */}
      {spotlightRect && (
        <div
          className="fixed z-[9999] border-[3px] border-[#FFC107] shadow-[0_0_0_4px_rgba(255,193,7,0.3)] pointer-events-none transition-all duration-300"
          style={{
            top: spotlightRect.top - 8,
            left: spotlightRect.left - 8,
            width: spotlightRect.width + 16,
            height: spotlightRect.height + 16,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[10000] w-[340px] max-w-[calc(100vw-32px)]"
        style={tooltipStyle}
      >
        <div className={`${current.color} border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5`}>
          {/* Icon + Title */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] shrink-0">
              <Icon className="w-5 h-5 text-black" strokeWidth={2.5} />
            </div>
            <h3 className="font-black text-base text-black uppercase tracking-wide leading-tight">
              {current.title}
            </h3>
          </div>

          {/* Description */}
          <p className="font-bold text-sm text-black/80 leading-relaxed mb-4">
            {current.description}
          </p>

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mb-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 border border-black transition-all duration-200 ${
                  i === step
                    ? "w-6 bg-black"
                    : i < step
                      ? "w-3 bg-black/40"
                      : "w-3 bg-white"
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={skip}
              className="px-3 py-2 font-black text-xs text-black/50 uppercase tracking-wide hover:text-black transition-colors outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              {isLast ? "" : "Skip Tour"}
            </button>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={prev}
                  className="flex items-center gap-1 px-3 py-2 bg-white border-[3px] border-black font-black text-xs text-black uppercase tracking-wide shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all outline-none focus-visible:ring-2 focus-visible:ring-black"
                >
                  <ArrowLeft className="w-3 h-3" strokeWidth={3} />
                  Back
                </button>
              )}

              <button
                onClick={next}
                className="flex items-center gap-1 px-4 py-2 bg-black border-[3px] border-black font-black text-xs text-white uppercase tracking-wide shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {isLast ? (
                  <>
                    Let&apos;s Go!
                    <Sparkles className="w-3 h-3" strokeWidth={3} />
                  </>
                ) : isFirst ? (
                  <>
                    Start Tour
                    <ArrowRight className="w-3 h-3" strokeWidth={3} />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-3 h-3" strokeWidth={3} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Step counter */}
        <div className="mt-2 text-center">
          <span className="font-black text-xs text-white/70 uppercase tracking-widest">
            {step + 1} / {STEPS.length}
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Export a trigger function for replaying
export function WalkthroughTrigger() {
  const handleReplay = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  return (
    <button
      onClick={handleReplay}
      className="flex items-center gap-2 w-full px-4 py-3 text-left font-black text-xs uppercase tracking-wide text-black/50 hover:text-black hover:bg-[#FFC107]/20 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-inset"
    >
      <Sparkles className="w-4 h-4" strokeWidth={2.5} />
      Replay Tour
    </button>
  );
}
