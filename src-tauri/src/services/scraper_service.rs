use reqwest::Client;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct MemberDetails {
    pub nombre_completo: String,
    pub status: String,
    pub telefono: String,
    pub correo_electronico: String,
    pub fecha_nacimiento: String,
}

/// Performs login and stores session cookies in the client.
pub async fn login(client: &Client, email: &str, password: &str) -> Result<(), String> {
    // 1. Get the login page to extract the authenticity token
    let resp = client
        .get("https://registro.scouts.org.ve/")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let html_content = resp.text().await.map_err(|e| e.to_string())?;
    let token = {
        let document = Html::parse_document(&html_content);
        let token_selector = Selector::parse("input[name='authenticity_token']").unwrap();
        document
            .select(&token_selector)
            .next()
            .and_then(|el| el.value().attr("value"))
            .ok_or("Failed to find authenticity_token for login")?
            .to_string()
    };

    // 2. Submit the login form
    let params = [
        ("authenticity_token", token.as_str()),
        ("user[email]", email),
        ("user[password]", password),
    ];

    let login_resp = client
        .post("https://registro.scouts.org.ve/users/sign_in")
        .form(&params)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if login_resp.status().is_success() || login_resp.status().is_redirection() {
        Ok(())
    } else {
        Err("Login failed".into())
    }
}

/// Fetches member status by cedula.
/// Assumes the client is already logged in.
pub async fn get_member_status(client: &Client, cedula: &str) -> Result<MemberDetails, String> {
    // Submit the search via GET as discovered by the user
    let result_resp = client
        .get("https://registro.scouts.org.ve/members/status_member_submit")
        .query(&[("cedula", cedula), ("commit", "Buscar")])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let result_html = result_resp.text().await.map_err(|e| e.to_string())?;

    // 3. Parse the results
    let document = Html::parse_document(&result_html);
    let p_selector = Selector::parse("p.mb-1").unwrap();

    let mut member = MemberDetails {
        nombre_completo: String::new(),
        status: String::new(),
        telefono: String::new(),
        correo_electronico: String::new(),
        fecha_nacimiento: String::new(),
    };

    for element in document.select(&p_selector) {
        let text = element.text().collect::<String>();

        if let Some((key, value)) = text.split_once(':') {
            let key = key.trim();
            let value = value.trim().to_string();

            match key {
                "Nombre Completo" => member.nombre_completo = value,
                "Status" => member.status = value,
                "Telefono" => member.telefono = value,
                "Correo Electronico" => member.correo_electronico = value,
                "Fecha de Nacimiento" => member.fecha_nacimiento = value,
                _ => {}
            }
        }
    }

    Ok(member)
}

#[cfg(test)]
mod tests {
    use super::*;
    use dotenvy::dotenv;
    use std::env;

    #[tokio::test]
    #[ignore] // Ignored by default to prevent failure in CI
    async fn test_get_html() {
        dotenv().ok(); // Load .env file

        let email = env::var("SCOUTS_EMAIL").expect("SCOUTS_EMAIL not set");
        let password = env::var("SCOUTS_PASSWORD").expect("SCOUTS_PASSWORD not set");

        let client = reqwest::Client::builder()
            .cookie_store(true)
            .build()
            .unwrap();

        println!("Attempting login...");
        login(&client, &email, &password)
            .await
            .expect("Login failed");

        println!("Fetching member status via service...");
        let member = get_member_status(&client, "30541929").await.unwrap();
        println!("--- PARSED DATA START ---");
        println!("{:#?}", member);
        println!("--- PARSED DATA END ---");
    }
}
