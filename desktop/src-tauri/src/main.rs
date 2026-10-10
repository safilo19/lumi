// Lumi desktop shell. The window simply loads the deployed Lumi site (a remote
// HTTPS URL baked in at build time via APP_URL_PLACEHOLDER in tauri.conf.json),
// so the desktop app always runs the same code as the web/PWA — no bundled
// secrets, no separate build. Thin wrapper only.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Lumi");
}
