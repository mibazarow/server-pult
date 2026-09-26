use base64::{engine::general_purpose::STANDARD, Engine};

use crate::{connection, ssh};

fn parse(out: &ssh::SshOutput) -> Result<serde_json::Value, String> {
    if out.exit_code.unwrap_or(0) != 0 {
        return Err(format!(
            "control вернул код {:?}: {}",
            out.exit_code,
            out.stderr.trim()
        ));
    }
    serde_json::from_str(out.stdout.trim())
        .map_err(|e| format!("некорректный JSON от сервера: {e}; вывод: {}", out.stdout.trim()))
}

async fn run(app: &tauri::AppHandle, remote: &str) -> Result<ssh::SshOutput, String> {
    let (host, port, user, password) = connection(app)?;
    ssh::exec(&host, port, &user, &password, remote).await
}

fn shq(s: &str) -> String {
    format!("'{}'", s.replace('\'', "'\\''"))
}

// --- LLM ---

#[tauri::command]
pub async fn system_status(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let out = run(&app, "bash /opt/kilo-tools/control/system.sh").await?;
    parse(&out)
}

#[tauri::command]
pub async fn llm_status(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let out = run(&app, "bash /opt/kilo-tools/control/llm.sh status").await?;
    parse(&out)
}

#[tauri::command]
pub async fn llm_list(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let out = run(&app, "bash /opt/kilo-tools/control/llm.sh list").await?;
    parse(&out)
}

#[tauri::command]
pub async fn llm_start(app: tauri::AppHandle, id: String) -> Result<serde_json::Value, String> {
    let cmd = format!("bash /opt/kilo-tools/control/llm.sh start {}", shq(&id));
    let out = run(&app, &cmd).await?;
    parse(&out)
}

#[tauri::command]
pub async fn llm_stop(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let out = run(&app, "bash /opt/kilo-tools/control/llm.sh stop").await?;
    parse(&out)
}

// --- задания генерации ---

#[tauri::command]
pub async fn run_image(
    app: tauri::AppHandle,
    prompt: String,
    negative: Option<String>,
    width: Option<u32>,
    height: Option<u32>,
    steps: Option<u32>,
    cfg: Option<f32>,
    upscale: Option<bool>,
) -> Result<serde_json::Value, String> {
    let pb = STANDARD.encode(prompt.as_bytes());
    let nb = STANDARD.encode(negative.unwrap_or_default().as_bytes());
    let cmd = format!(
        "bash /opt/kilo-tools/control/image.sh {} {} {} {} {} {} {}",
        shq(&pb),
        shq(&nb),
        width.unwrap_or(1024),
        height.unwrap_or(1024),
        steps.unwrap_or(50),
        cfg.unwrap_or(4.0),
        if upscale.unwrap_or(false) { 1 } else { 0 }
    );
    let out = run(&app, &cmd).await?;
    parse(&out)
}

#[tauri::command]
pub async fn run_music(
    app: tauri::AppHandle,
    caption: String,
    lyrics: Option<String>,
    duration: Option<f32>,
    steps: Option<u32>,
    guidance: Option<f32>,
) -> Result<serde_json::Value, String> {
    let cb = STANDARD.encode(caption.as_bytes());
    let lb = STANDARD.encode(lyrics.unwrap_or_default().as_bytes());
    let cmd = format!(
        "bash /opt/kilo-tools/control/audio.sh music {} {} {} {} {}",
        shq(&cb),
        shq(&lb),
        duration.unwrap_or(60.0),
        steps.unwrap_or(8),
        guidance.unwrap_or(7.0)
    );
    let out = run(&app, &cmd).await?;
    parse(&out)
}

#[tauri::command]
pub async fn run_sfx(
    app: tauri::AppHandle,
    prompt: String,
    seconds: Option<f32>,
    steps: Option<u32>,
    cfg: Option<f32>,
    seed: Option<i64>,
) -> Result<serde_json::Value, String> {
    let pb = STANDARD.encode(prompt.as_bytes());
    let cmd = format!(
        "bash /opt/kilo-tools/control/audio.sh sfx {} {} {} {} {}",
        shq(&pb),
        seconds.unwrap_or(5.0),
        steps.unwrap_or(100),
        cfg.unwrap_or(4.0),
        seed.unwrap_or(0)
    );
    let out = run(&app, &cmd).await?;
    parse(&out)
}

#[tauri::command]
pub async fn job_status(app: tauri::AppHandle, id: String) -> Result<serde_json::Value, String> {
    let out = run(
        &app,
        &format!("bash /opt/kilo-tools/control/job.sh status {}", shq(&id)),
    )
    .await?;
    parse(&out)
}

#[tauri::command]
pub async fn job_list(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let out = run(&app, "bash /opt/kilo-tools/control/job.sh list").await?;
    parse(&out)
}

#[tauri::command]
pub async fn tail_log(
    app: tauri::AppHandle,
    source: String,
    id: Option<String>,
    lines: Option<u32>,
) -> Result<String, String> {
    let n = lines.unwrap_or(200);
    let remote = match source.as_str() {
        "llm" => format!("bash /opt/kilo-tools/control/log.sh llm {n}"),
        "temps" => format!("bash /opt/kilo-tools/control/log.sh temps {n}"),
        "job" => format!(
            "bash /opt/kilo-tools/control/log.sh job {} {n}",
            shq(id.as_deref().unwrap_or(""))
        ),
        other => return Err(format!("неизвестный источник лога: {other}")),
    };
    let out = run(&app, &remote).await?;
    Ok(out.stdout)
}

#[tauri::command]
pub async fn job_cancel(app: tauri::AppHandle, id: String) -> Result<serde_json::Value, String> {
    let out = run(
        &app,
        &format!("bash /opt/kilo-tools/control/job.sh cancel {}", shq(&id)),
    )
    .await?;
    parse(&out)
}

/// Скачать результат задания на мак в ~/Downloads/generated и удалить его на сервере.
#[tauri::command]
pub async fn job_download(app: tauri::AppHandle, id: String) -> Result<serde_json::Value, String> {
    let st_out = run(
        &app,
        &format!("bash /opt/kilo-tools/control/job.sh status {}", shq(&id)),
    )
    .await?;
    let st: serde_json::Value = serde_json::from_str(st_out.stdout.trim())
        .map_err(|e| format!("статус задания: {e}"))?;
    if st.get("state").and_then(|v| v.as_str()) != Some("done") {
        return Err("задание ещё не завершено".into());
    }
    let result = st
        .get("result")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "у задания нет результата".to_string())?;
    let filename = result.rsplit('/').next().unwrap_or("result.bin").to_string();

    let out = run(&app, &format!("base64 -w0 {}", shq(result))).await?;
    if out.exit_code.unwrap_or(0) != 0 {
        return Err(format!("не удалось прочитать файл: {}", out.stderr.trim()));
    }
    let bytes = STANDARD
        .decode(out.stdout.trim())
        .map_err(|e| format!("ошибка декодирования: {e}"))?;

    let home = std::env::var("HOME").map_err(|_| "нет HOME".to_string())?;
    let dir = std::path::Path::new(&home).join("Downloads").join("generated");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(&filename);
    std::fs::write(&path, &bytes).map_err(|e| e.to_string())?;

    let _ = run(
        &app,
        &format!("bash /opt/kilo-tools/control/job.sh cleanup {}", shq(&id)),
    )
    .await;

    Ok(serde_json::json!({
        "path": path.to_string_lossy(),
        "filename": filename,
        "bytes": bytes.len()
    }))
}
