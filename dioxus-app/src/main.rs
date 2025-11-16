use dioxus::prelude::*;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize)]
struct VscodeMessage {
    command: String,
    text: String,
}

fn main() {
    dioxus::launch(App);
}

#[component]
fn App() -> Element {
    let mut name = use_signal(|| String::from("World"));
    
    rsx! {
        div {
            style: "padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;",
            
            h1 {
                style: "color: #007acc; margin-bottom: 20px;",
                "Hello VSCode Dioxus Extension"
            }
            
            div {
                style: "margin-bottom: 20px;",
                
                label {
                    style: "display: block; margin-bottom: 8px; font-weight: 600;",
                    "Enter your name:"
                }
                
                input {
                    style: "padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; width: 300px; max-width: 100%;",
                    r#type: "text",
                    value: "{name}",
                    placeholder: "Enter name here...",
                    oninput: move |evt| {
                        name.set(evt.value().clone());
                    }
                }
            }
            
            button {
                style: "padding: 10px 20px; background-color: #007acc; color: white; border: none; border-radius: 4px; font-size: 14px; cursor: pointer; font-weight: 600;",
                onclick: move |_| {
                    let message_text = format!("Hello, {}!", name());
                    send_to_vscode(&message_text);
                },
                "Show Notification"
            }
        }
    }
}

#[wasm_bindgen(inline_js = r#"
export function postMessageToVscode(message) {
    if (typeof acquireVsCodeApi !== 'undefined') {
        const vscode = acquireVsCodeApi();
        vscode.postMessage(message);
    } else {
        console.log('Not running in VSCode:', message);
    }
}
"#)]
extern "C" {
    fn postMessageToVscode(message: JsValue);
}

fn send_to_vscode(text: &str) {
    let message = VscodeMessage {
        command: "showNotification".to_string(),
        text: text.to_string(),
    };
    
    if let Ok(js_message) = serde_wasm_bindgen::to_value(&message) {
        postMessageToVscode(js_message);
    }
}
