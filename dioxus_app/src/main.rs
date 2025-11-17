use dioxus::prelude::*;

#[derive(Debug, Clone, Routable, PartialEq)]
#[rustfmt::skip]
enum Route {
    #[layout(Navbar)]
    #[route("/")]
    Home {},
}

const FAVICON: Asset = asset!("/assets/favicon.ico");
const MAIN_CSS: Asset = asset!("/assets/main.css");
const TAILWIND_CSS: Asset = asset!("/assets/tailwind.css");
const VSCODE_BRIDGE_JS: &str = include_str!("../assets/vscode-bridge.js");

fn main() {
    dioxus::launch(App);
}

#[component]
fn App() -> Element {
    rsx! {
        document::Link { rel: "icon", href: FAVICON }
        document::Link { rel: "stylesheet", href: MAIN_CSS }
        document::Link { rel: "stylesheet", href: TAILWIND_CSS }
        document::Script { "{VSCODE_BRIDGE_JS}" }
        Router::<Route> {}
    }
}

/// Home page
#[component]
fn Home() -> Element {
    rsx! {
        Hello {}
    }
}

/// Shared navbar component.
#[component]
fn Navbar() -> Element {
    rsx! {
        div {
            class: "bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg",
            div {
                class: "container mx-auto px-4 py-4 flex items-center justify-between",
                h1 {
                    class: "text-2xl font-bold text-white",
                    "🚀 Dioxus App"
                }
                div {
                    class: "flex gap-4",
                    Link {
                        to: Route::Home {},
                        class: "text-white hover:text-purple-200 transition-colors font-medium",
                        "Home"
                    }
                }
            }
        }
        Outlet::<Route> {}
    }
}

#[component]
fn Hello() -> Element {
    rsx! {
        div {
            class: "min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center p-8",
            div {
                class: "w-full max-w-md",
                div {
                    class: "bg-white rounded-2xl shadow-2xl p-8 space-y-6 transform hover:scale-[1.02] transition-transform duration-300",
                    div {
                        class: "text-center space-y-2",
                        h2 {
                            class: "text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent",
                            "👋 Say Hello"
                        }
                        p {
                            class: "text-gray-500 text-sm",
                            "Enter your name and send a greeting to VS Code"
                        }
                    }
                    div {
                        class: "space-y-4",
                        div {
                            class: "relative",
                            input {
                                id: "name-input",
                                r#type: "text",
                                placeholder: "Enter your name...",
                                class: "w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all duration-200 text-gray-800 placeholder-gray-400"
                            }
                        }
                        button {
                            id: "hello-button",
                            class: "w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95",
                            "✨ Say Hello"
                        }
                    }
                    div {
                        class: "pt-4 border-t border-gray-100 text-center text-xs text-gray-400",
                        "Click the button to send a notification to VS Code"
                    }
                }
            }
        }
    }
}
