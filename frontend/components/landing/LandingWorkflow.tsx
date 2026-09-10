"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowUp, Bot } from "lucide-react";
import { useRef } from "react";
import { BorderBeam } from "../ui/border-beam";
import { Button } from "../ui/button";

const USER_PROMPT = "Design a todo API with auth and Postgres";
const AI_REPLY = "I'll draw Gateway, Auth, and Postgres on the canvas.";

function typeText(el: HTMLElement, text: string, secondsPerChar = 0.028) {
  const proxy = { n: 0 };
  return gsap.to(proxy, {
    n: text.length,
    duration: Math.max(0.55, text.length * secondsPerChar),
    ease: "none",
    onUpdate: () => {
      el.textContent = text.slice(0, Math.round(proxy.n));
    },
  });
}

export function LandingWorkflow() {
  const rootRef = useRef<HTMLDivElement>(null);
  const userMsgRef = useRef<HTMLDivElement>(null);
  const userTextRef = useRef<HTMLParagraphElement>(null);
  const typingRef = useRef<HTMLDivElement>(null);
  const aiMsgRef = useRef<HTMLDivElement>(null);
  const aiTextRef = useRef<HTMLParagraphElement>(null);
  const placeholderRef = useRef<HTMLSpanElement>(null);
  const inputTextRef = useRef<HTMLSpanElement>(null);
  const caretWrapRef = useRef<HTMLSpanElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);
  const beamRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<HTMLButtonElement>(null);

  useGSAP(
    () => {
      const userMsg = userMsgRef.current;
      const userText = userTextRef.current;
      const typing = typingRef.current;
      const aiMsg = aiMsgRef.current;
      const aiText = aiTextRef.current;
      const placeholder = placeholderRef.current;
      const inputText = inputTextRef.current;
      const caretWrap = caretWrapRef.current;
      const caret = caretRef.current;
      const beam = beamRef.current;
      const send = sendRef.current;
      if (
        !userMsg ||
        !userText ||
        !typing ||
        !aiMsg ||
        !aiText ||
        !placeholder ||
        !inputText ||
        !caretWrap ||
        !caret ||
        !beam ||
        !send
      ) {
        return;
      }

      const prefersReduced =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (prefersReduced) {
        gsap.set(userMsg, { autoAlpha: 1, y: 0, display: "block" });
        gsap.set(aiMsg, { autoAlpha: 1, y: 0, display: "flex" });
        gsap.set([typing, placeholder, caretWrap, beam], { autoAlpha: 0 });
        gsap.set(typing, { display: "none" });
        userText.textContent = USER_PROMPT;
        aiText.textContent = AI_REPLY;
        inputText.textContent = "";
        return;
      }

      gsap.set([userMsg, typing, aiMsg], { autoAlpha: 0, y: 6, display: "none" });
      gsap.set(beam, { autoAlpha: 0 });
      gsap.set(caretWrap, { autoAlpha: 0 });
      gsap.set(placeholder, { autoAlpha: 1 });
      gsap.set(send, { scale: 1 });
      userText.textContent = "";
      aiText.textContent = "";
      inputText.textContent = "";

      gsap.to(".chat-dot", {
        y: -2.5,
        opacity: 1,
        duration: 0.32,
        stagger: 0.12,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(caret, {
        opacity: 0,
        duration: 0.5,
        repeat: -1,
        yoyo: true,
        ease: "none",
      });

      const tl = gsap.timeline({
        defaults: { ease: "power2.out" },
        repeat: -1,
        repeatDelay: 1.4,
      });

      tl.call(() => {
        userText.textContent = "";
        aiText.textContent = "";
        inputText.textContent = "";
      })
        .set([userMsg, typing, aiMsg], { autoAlpha: 0, y: 6, display: "none" })
        .set(beam, { autoAlpha: 0 })
        .set(placeholder, { autoAlpha: 1 })
        .set(caretWrap, { autoAlpha: 0 })
        .set(send, { scale: 1 })
        .add(() => {
          gsap.set(placeholder, { autoAlpha: 0 });
          gsap.set(caretWrap, { autoAlpha: 1 });
        })
        .add(typeText(inputText, USER_PROMPT))
        .to(send, { scale: 0.92, duration: 0.08 })
        .to(send, { scale: 1, duration: 0.12 })
        .add(() => {
          inputText.textContent = "";
          userText.textContent = USER_PROMPT;
        })
        .set(caretWrap, { autoAlpha: 0 })
        .set(userMsg, { display: "block" })
        .fromTo(userMsg, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.28 })
        .to(beam, { autoAlpha: 1, duration: 0.2 }, "<")
        .set(typing, { display: "flex" })
        .fromTo(typing, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.22 })
        .to(typing, { autoAlpha: 0, duration: 0.16 }, "+=0.85")
        .set(typing, { display: "none" })
        .set(aiMsg, { display: "flex" })
        .fromTo(aiMsg, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.28 })
        .add(typeText(aiText, AI_REPLY, 0.024))
        .to(beam, { autoAlpha: 0, duration: 0.25 })
        .set(placeholder, { autoAlpha: 1 })
        .to({}, { duration: 1.6 });
    },
    { scope: rootRef },
  );

  return (
    <div
      ref={rootRef}
      role="region"
      aria-label="AI chat preview"
      className="pointer-events-none flex min-h-0 flex-1 flex-col font-mono text-xs"
    >
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-2 overflow-hidden p-3">
        <div
          ref={userMsgRef}
          className="ml-auto hidden max-w-[85%] rounded-lg rounded-br-sm border border-accent/40 bg-selection/50 px-2.5 py-2"
        >
          <p
            ref={userTextRef}
            className="text-[11px] leading-relaxed text-foreground"
          />
        </div>

        <div ref={typingRef} className="hidden items-center gap-2 pr-8">
          <BotMark />
          <div className="flex items-center gap-1.5 rounded-lg rounded-tl-sm border border-sidebar-border bg-panel px-2.5 py-2">
            <span className="chat-dot h-1 w-1 rounded-full bg-muted opacity-40" />
            <span className="chat-dot h-1 w-1 rounded-full bg-muted opacity-40" />
            <span className="chat-dot h-1 w-1 rounded-full bg-muted opacity-40" />
          </div>
        </div>

        <div ref={aiMsgRef} className="hidden items-start gap-2 pr-6">
          <BotMark />
          <div className="rounded-lg rounded-tl-sm border border-sidebar-border bg-panel px-2.5 py-2">
            <p
              ref={aiTextRef}
              className="text-[11px] leading-relaxed text-foreground"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-sidebar-border p-2">
        <div className="relative overflow-hidden rounded-lg border border-sidebar-border bg-panel">
          <div
            ref={beamRef}
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0"
          >
            <BorderBeam
              size={64}
              duration={8}
              colorFrom="#007acc"
              colorTo="#38bdf8"
              borderWidth={1.5}
            />
          </div>
          <div className="relative min-h-12 px-2.5 py-2 text-[11px] leading-relaxed">
            <span
              ref={placeholderRef}
              className="pointer-events-none absolute inset-x-2.5 top-2 text-muted"
            >
              Describe the system...
            </span>
            <span ref={inputTextRef} className="text-foreground" />
            <span ref={caretWrapRef} className="inline-block opacity-0">
              <span
                ref={caretRef}
                aria-hidden
                className="ml-px inline-block h-3 w-px translate-y-px bg-accent"
              />
            </span>
          </div>
          <div className="relative flex justify-end border-t border-sidebar-border p-1.5">
            <Button
              ref={sendRef}
              type="button"
              size="sm"
              tabIndex={-1}
              aria-hidden
              className="h-7 w-7 p-0"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BotMark() {
  return (
    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-panel">
      <Bot className="h-3.5 w-3.5 text-accent" />
    </div>
  );
}
