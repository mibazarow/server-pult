import { useState } from "react";

import Dashboard from "./screens/Dashboard";
import Llm from "./screens/Llm";
import Chat from "./screens/Chat";
import Images from "./screens/Images";
import Audio from "./screens/Audio";
import Logs from "./screens/Logs";
import Settings from "./screens/Settings";

const NAV: { id: string; label: string }[] = [
  { id: "dashboard", label: "Дашборд" },
  { id: "llm", label: "LLM" },
  { id: "chat", label: "Чат" },
  { id: "images", label: "Картинки" },
  { id: "audio", label: "Аудио" },
  { id: "logs", label: "Логи" },
  { id: "settings", label: "Настройки" },
];

export default function App() {
  const [screen, setScreen] = useState("settings");

  return (
    <div className="flex h-full">
      <aside className="w-52 shrink-0 border-r border-neutral-200 bg-neutral-50 flex flex-col">
        <div className="px-4 py-4 text-lg font-semibold tracking-tight text-neutral-900">
          ServerPult
        </div>
        <nav className="flex-1 px-2 space-y-1">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={
                "w-full text-left rounded-md px-3 py-2 text-sm transition-colors " +
                (screen === item.id
                  ? "bg-sky-100 text-sky-700"
                  : "text-neutral-600 hover:bg-neutral-200/70")
              }
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="px-4 py-3 text-[11px] text-neutral-400">только LAN · v0.1</div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 bg-white text-neutral-900">
        {screen === "settings" && <Settings />}
        {screen === "dashboard" && <Dashboard />}
        {screen === "llm" && <Llm />}
        {screen === "chat" && <Chat />}
        {screen === "images" && <Images />}
        {screen === "audio" && <Audio />}
        {screen === "logs" && <Logs />}
      </main>
    </div>
  );
}
