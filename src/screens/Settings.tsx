import { useEffect, useState, type ReactNode } from "react";

import {
  getApiKey,
  getPassword,
  loadProfile,
  saveApiKey,
  saveProfile,
  testConnection,
  type Profile,
} from "../lib/api";

type Status =
  | { kind: "idle" }
  | { kind: "busy"; text: string }
  | { kind: "ok"; text: string }
  | { kind: "err"; text: string };

export default function Settings() {
  const [host, setHost] = useState("");
  const [port, setPort] = useState(22);
  const [user, setUser] = useState("mb");
  const [password, setPassword] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    loadProfile()
      .then(async (p: Profile | null) => {
        if (!p) return;
        setHost(p.host);
        setPort(p.port);
        setUser(p.user);
        setHasPassword(p.hasPassword);
        if (p.hasPassword) {
          const saved = await getPassword(p.user);
          if (saved) setPassword(saved);
        }
      })
      .catch((e) => setStatus({ kind: "err", text: String(e) }));
    getApiKey()
      .then((k) => {
        if (k) setApiKey(k);
      })
      .catch(() => {});
  }, []);

  async function onTest() {
    setStatus({ kind: "busy", text: "Подключаюсь по SSH…" });
    try {
      const out = await testConnection({ host, port, user, password });
      setStatus({ kind: "ok", text: out.replace(/\n/g, "  ·  ") });
    } catch (e) {
      setStatus({ kind: "err", text: String(e) });
    }
  }

  async function onSave() {
    setStatus({ kind: "busy", text: "Сохраняю профиль…" });
    try {
      await saveProfile({ host, port, user, password });
      await saveApiKey(apiKey);
      setHasPassword(password.length > 0);
      setStatus({ kind: "ok", text: "Профиль сохранён (пароль и ключ — в Keychain)" });
    } catch (e) {
      setStatus({ kind: "err", text: String(e) });
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold mb-1">Настройки</h1>
      <p className="text-sm text-neutral-500 mb-5">
        Профиль сервера. Пароль хранится в macOS Keychain, не в файле.
      </p>

      <div className="space-y-3">
        <Field label="Адрес (host / IP)">
          <input
            className={input}
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="например, 192.168.1.10"
          />
        </Field>

        <div className="flex gap-3">
          <Field label="Порт" className="w-28">
            <input
              className={input}
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
            />
          </Field>
          <Field label="Пользователь" className="flex-1">
            <input
              className={input}
              value={user}
              onChange={(e) => setUser(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Пароль">
          <input
            className={input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={hasPassword ? "сохранён в Keychain" : ""}
          />
        </Field>

        <Field label="Ключ LLM API (для чата)">
          <input
            className={input}
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="если пусто — встроенный по умолчанию"
          />
        </Field>
      </div>

      <div className="flex gap-3 mt-5">
        <button className={btnPrimary} onClick={onTest} disabled={status.kind === "busy"}>
          Проверить связь
        </button>
        <button className={btn} onClick={onSave} disabled={status.kind === "busy"}>
          Сохранить
        </button>
      </div>

      <div className="mt-5 min-h-6 text-sm">
        {status.kind === "busy" && <span className="text-amber-600">{status.text}</span>}
        {status.kind === "ok" && <span className="text-emerald-600">✓ {status.text}</span>}
        {status.kind === "err" && <span className="text-red-600">✗ {status.text}</span>}
      </div>
    </div>
  );
}

const input =
  "w-full rounded-md bg-white border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-sky-500";
const btn =
  "rounded-md px-4 py-2 text-sm border border-neutral-300 text-neutral-700 hover:bg-neutral-100 disabled:opacity-50";
const btnPrimary =
  "rounded-md px-4 py-2 text-sm bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50";

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <div className="text-xs text-neutral-500 mb-1">{label}</div>
      {children}
    </label>
  );
}
