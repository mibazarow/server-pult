mod chat;
mod control;
mod profile;
mod secrets;
mod ssh;

use profile::Profile;

/// Собрать параметры подключения из сохранённого профиля + Keychain.
pub(crate) fn connection(
    app: &tauri::AppHandle,
) -> Result<(String, u16, String, String), String> {
    let p = profile::load(app)?
        .ok_or_else(|| "профиль не настроен — открой «Настройки»".to_string())?;
    let password = secrets::get_password(&p.user)?
        .ok_or_else(|| "пароль не сохранён — открой «Настройки»".to_string())?;
    Ok((p.host, p.port, p.user, password))
}

#[tauri::command]
async fn test_connection(
    host: String,
    port: Option<u16>,
    user: String,
    password: String,
) -> Result<String, String> {
    let port = port.unwrap_or(22);
    let out = ssh::exec(
        &host,
        port,
        &user,
        &password,
        "echo ok; uname -sr; nproc; hostname",
    )
    .await?;
    if out.exit_code.unwrap_or(0) != 0 {
        return Err(format!(
            "команда завершилась с кодом {:?}: {}",
            out.exit_code, out.stderr
        ));
    }
    Ok(out.stdout.trim().to_string())
}

#[tauri::command]
async fn test_saved_connection(
    host: String,
    port: Option<u16>,
    user: String,
) -> Result<String, String> {
    let password = secrets::get_password(&user)?
        .ok_or_else(|| "пароль не сохранён в Keychain".to_string())?;
    test_connection(host, port, user, password).await
}

#[tauri::command]
fn save_profile(
    app: tauri::AppHandle,
    host: String,
    port: Option<u16>,
    user: String,
    password: String,
) -> Result<(), String> {
    let p = Profile {
        host,
        port: port.unwrap_or(22),
        user: user.clone(),
    };
    profile::save(&app, &p)?;
    if !password.is_empty() {
        secrets::set_password(&user, &password)?;
    }
    Ok(())
}

#[tauri::command]
fn load_profile(app: tauri::AppHandle) -> Result<Option<serde_json::Value>, String> {
    match profile::load(&app)? {
        Some(p) => {
            let has_password = secrets::get_password(&p.user)?.is_some();
            Ok(Some(serde_json::json!({
                "host": p.host,
                "port": p.port,
                "user": p.user,
                "hasPassword": has_password
            })))
        }
        None => Ok(None),
    }
}

#[tauri::command]
fn get_password(user: String) -> Result<Option<String>, String> {
    secrets::get_password(&user)
}

#[tauri::command]
fn save_api_key(key: String) -> Result<(), String> {
    if key.is_empty() {
        return Ok(());
    }
    secrets::set_api_key(&key)
}

#[tauri::command]
fn get_api_key() -> Result<Option<String>, String> {
    secrets::get_api_key()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            test_connection,
            test_saved_connection,
            save_profile,
            load_profile,
            get_password,
            save_api_key,
            get_api_key,
            control::system_status,
            control::llm_status,
            control::llm_list,
            control::llm_start,
            control::llm_stop,
            control::run_image,
            control::run_music,
            control::run_sfx,
            control::job_status,
            control::job_list,
            control::job_cancel,
            control::job_download,
            control::tail_log,
            chat::chat_stream
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
