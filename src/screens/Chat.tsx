import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";

import { chatStream } from "../lib/api";

type Msg = { role: "user" | "assistant"; content: string };

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [system, setSystem] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [showParams, setShowParams] = useState(false);

  const accRef = useRef("");
  const busyRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const un1 = listen<string>("chat://token", (e) => {
      accRef.current += e.payload;
      const text = accRef.current;
      setMessages((m) => {
        if (m.length === 0) return m;
        const copy = m.slice();
        copy[copy.length - 1] = { role: "assistant", content: text };
        return copy;
      });
    });
    const un2 = listen("chat://done", () => {
      busyRef.current = false;
      setBusy(false);
    });
    const un3 = listen<string>("chat://error", (e) => {
      busyRef.current = false;
      setBusy(false);
      setErr(e.payload);
    });
    return () => {
      un1.then((f) => f());
      un2.then((f) => f());
      un3.then((f) => f());
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || busyRef.current) return;
    setErr(null);
    const apiMsgs: { role: string; content: string }[] = [];
    if (system.trim()) apiMsgs.push({ role: "system", content: system });
    for (const m of messages) apiMsgs.push(m);
    apiMsgs.push({ role: "user", content: text });

    setMessages([...messages, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setInput("");
    accRef.current = "";
    busyRef.current = true;
    setBusy(true);
    try {
      await chatStream({ messages: apiMsgs, temperature, maxTokens });
    } catch (e) {
      setErr(String(e));
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col h-full max-w-3xl">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">Чат</h1>
        <button
          className="text-xs text-neutral-500 hover:text-neutral-800"
          onClick={() => setShowParams((v) => !v)}
        >
          {showParams ? "скрыть параметры" : "параметры"}
        </button>
      </div>

      {showParams && (
        <div className="mb-3 rounded-lg border border-neutral-200 p-3 space-y-2">
          <label className="block">
            <div className="text-xs text-neutral-500 mb-1">Системный промпт</div>
            <textarea
              className={inputCls + " h-16 resize-y"}
              value={system}
              onChange={(e) => setSystem(e.target.value)}
            />
          </label>
          <div className="flex gap-3">
            <label className="block w-36">
              <div className="text-xs text-neutral-500 mb-1">Temperature</div>
              <input
                className={inputCls}
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
              />
            </label>
            <label className="block w-36">
              <div className="text-xs text-neutral-500 mb-1">Max tokens</div>
              <input
                className={inputCls}
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
              />
            </label>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-4">
        {messages.length === 0 && (
          <div className="text-sm text-neutral-400">
            Сообщений пока нет. Работает с уже загруженной моделью (экран LLM).
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              "mb-3 whitespace-pre-wrap text-sm " +
              (m.role === "user" ? "text-neutral-900" : "text-neutral-700")
            }
          >
            <div className="text-[11px] uppercase tracking-wide text-neutral-400 mb-0.5">
              {m.role === "user" ? "вы" : "модель"}
            </div>
            {m.content || (busy && i === messages.length - 1 ? "…" : "")}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {err && <div className="mt-2 text-sm text-red-600">✗ {err}</div>}

      <div className="mt-3 flex gap-2 items-end">
        <textarea
          className={inputCls + " h-20 resize-y flex-1"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
          }}
          placeholder="Сообщение… (Cmd/Ctrl+Enter — отправить)"
        />
        <button className={btnPrimary} onClick={send} disabled={busy}>
          {busy ? "…" : "Отправить"}
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md bg-white border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-sky-500";
const btnPrimary =
  "rounded-md px-4 py-2 text-sm bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50";
