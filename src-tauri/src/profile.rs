use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct Profile {
    pub host: String,
    pub port: u16,
    pub user: String,
}

fn path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("не удалось получить каталог конфигурации: {e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("profile.json"))
}

pub fn save(app: &tauri::AppHandle, profile: &Profile) -> Result<(), String> {
    let p = path(app)?;
    let json = serde_json::to_string_pretty(profile).map_err(|e| e.to_string())?;
    std::fs::write(p, json).map_err(|e| e.to_string())
}

pub fn load(app: &tauri::AppHandle) -> Result<Option<Profile>, String> {
    let p = path(app)?;
    if !p.exists() {
        return Ok(None);
    }
    let text = std::fs::read_to_string(p).map_err(|e| e.to_string())?;
    let profile = serde_json::from_str(&text).map_err(|e| e.to_string())?;
    Ok(Some(profile))
}
