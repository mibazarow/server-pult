use std::sync::Arc;

use russh::client::{self, AuthResult};
use russh::keys::PublicKeyOrCertificate;
use russh::{ChannelMsg, Disconnect};

pub struct SshOutput {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: Option<u32>,
}

struct ClientHandler;

impl client::Handler for ClientHandler {
    type Error = russh::Error;

    async fn check_server_key(&mut self, _server_public_key: &PublicKeyOrCertificate) -> Result<bool, Self::Error> {
        // TOFU: доверяем ключу сервера (локальная сеть, свой сервер).
        Ok(true)
    }
}

/// Подключиться по паролю, выполнить одну команду и вернуть её вывод.
pub async fn exec(
    host: &str,
    port: u16,
    user: &str,
    password: &str,
    command: &str,
) -> Result<SshOutput, String> {
    let config = Arc::new(client::Config::default());
    let mut session = client::connect(config, (host.to_string(), port), ClientHandler)
        .await
        .map_err(|e| format!("не удалось подключиться к {host}:{port}: {e}"))?;

    let auth = session
        .authenticate_password(user, password)
        .await
        .map_err(|e| format!("ошибка аутентификации: {e}"))?;
    if !matches!(auth, AuthResult::Success) {
        return Err("неверный логин или пароль".into());
    }

    let mut channel = session
        .channel_open_session()
        .await
        .map_err(|e| format!("не удалось открыть канал: {e}"))?;
    channel
        .exec(true, command)
        .await
        .map_err(|e| format!("не удалось выполнить команду: {e}"))?;

    let mut stdout = Vec::new();
    let mut stderr = Vec::new();
    let mut exit_code = None;

    while let Some(msg) = channel.wait().await {
        match msg {
            ChannelMsg::Data { data } => stdout.extend_from_slice(&data),
            ChannelMsg::ExtendedData { data, ext } => {
                if ext == 1 {
                    stderr.extend_from_slice(&data);
                }
            }
            ChannelMsg::ExitStatus { exit_status } => exit_code = Some(exit_status),
            _ => {}
        }
    }

    let _ = session
        .disconnect(Disconnect::ByApplication, "", "")
        .await;

    Ok(SshOutput {
        stdout: String::from_utf8_lossy(&stdout).to_string(),
        stderr: String::from_utf8_lossy(&stderr).to_string(),
        exit_code,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    // Живой smoke-тест SSH. Запуск:
    //   SP_HOST=.. SP_USER=.. SP_PASS=.. cargo test -- --ignored --nocapture
    #[tokio::test]
    #[ignore]
    async fn smoke_real_server() {
        let host = std::env::var("SP_HOST").expect("SP_HOST");
        let user = std::env::var("SP_USER").expect("SP_USER");
        let pass = std::env::var("SP_PASS").expect("SP_PASS");
        let out = exec(&host, 22, &user, &pass, "echo ok; uname -sr; nproc; hostname")
            .await
            .expect("ssh exec");
        println!("STDOUT:\n{}", out.stdout);
        assert!(out.stdout.contains("ok"));
    }
}
