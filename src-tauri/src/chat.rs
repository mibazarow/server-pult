use futures_util::StreamExt;
use serde::Deserialize;
use tauri::{Emitter, Manager};

#[derive(Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

fn api_key() -> Result<String, String> {
    crate::secrets::get_api_key()?
        .filter(|k| !k.is_empty())
        .ok_or_else(|| "Ключ LLM API не задан — открой «Настройки» и впиши ключ".to_string())
}

/// Потоковый чат через OpenAI-совместимый API сервера.
/// Шлёт события в окно: "chat://token", "chat://done", "chat://error".
#[tauri::command]
pub async fn chat_stream(
    window: tauri::WebviewWindow,
    messages: Vec<ChatMessage>,
    temperature: Option<f32>,
    max_tokens: Option<u32>,
) -> Result<(), String> {
    let app = window.app_handle().clone();
    let (host, _port, _user, _pass) = crate::connection(&app)?;
    let url = format!("http://{}:8080/v1/chat/completions", host);

    let msgs: Vec<serde_json::Value> = messages
        .iter()
        .map(|m| serde_json::json!({ "role": m.role, "content": m.content }))
        .collect();

    let body = serde_json::json!({
        "model": "local",
        "messages": msgs,
        "stream": true,
        "temperature": temperature.unwrap_or(0.7),
        "max_tokens": max_tokens.unwrap_or(1024)
    });

    let client = reqwest::Client::new();
    let key = api_key()?;
    let resp = client
        .post(&url)
        .header("Authorization", format!("Bearer {key}"))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("запрос не ушёл: {e}"))?;

    if !resp.status().is_success() {
        let code = resp.status();
        let text = resp.text().await.unwrap_or_default();
        let _ = window.emit("chat://error", format!("{code}: {text}"));
        return Ok(());
    }

    let mut stream = resp.bytes_stream();
    let mut buf = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = match chunk {
            Ok(c) => c,
            Err(e) => {
                let _ = window.emit("chat://error", format!("обрыв потока: {e}"));
                return Ok(());
            }
        };
        buf.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(pos) = buf.find('\n') {
            let line = buf[..pos].trim_end().to_string();
            buf.drain(..=pos);
            let Some(rest) = line.strip_prefix("data:") else {
                continue;
            };
            let data = rest.trim();
            if data == "[DONE]" {
                let _ = window.emit("chat://done", ());
                return Ok(());
            }
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(data) {
                if let Some(tok) = v["choices"][0]["delta"]["content"].as_str() {
                    let _ = window.emit("chat://token", tok);
                }
            }
        }
    }

    let _ = window.emit("chat://done", ());
    Ok(())
}
