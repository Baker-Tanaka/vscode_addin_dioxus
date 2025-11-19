use dioxus::prelude::*;
use std::collections::VecDeque;

mod waveform_canvas;
use waveform_canvas::WaveformCanvas;

#[derive(Debug, Clone, Routable, PartialEq)]
#[rustfmt::skip]
enum Route {
    #[layout(Navbar)]
    #[route("/")]
    Home {},
    #[route("/graph")]
    Graph {},
}

const FAVICON: Asset = asset!("/assets/favicon.ico");
const MAIN_CSS: Asset = asset!("/assets/main.css");
const TAILWIND_CSS: Asset = asset!("/assets/tailwind.css");
const VSCODE_BRIDGE: Asset = asset!("/assets/vscode-bridge.js");

fn main() {
    dioxus::launch(App);
}

#[component]
fn App() -> Element {
    rsx! {
        document::Link { rel: "icon", href: FAVICON }
        document::Link { rel: "stylesheet", href: MAIN_CSS }
        document::Link { rel: "stylesheet", href: TAILWIND_CSS }
        document::Script { src: VSCODE_BRIDGE }
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
            class: "fixed top-0 left-0 w-full z-50 bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg",
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
                    Link {
                        to: Route::Graph {},
                        class: "text-white hover:text-purple-200 transition-colors font-medium",
                        "Graph"
                    }
                }
            }
        }
        // leave space for the fixed navbar
        div { class: "h-16" }
        Outlet::<Route> {}
    }
}

#[component]
fn Graph() -> Element {
    use gloo_timers::future::sleep;
    use std::time::Duration;

    // Data acquisition constants
    const UPDATE_INTERVAL_MS: u64 = 10; // 10ms = 100Hz sampling rate
    const DISPLAY_TIME_WINDOW: f64 = 5.0; // Display last 5 seconds
    const TIME_STEP: f64 = UPDATE_INTERVAL_MS as f64 / 1000.0; // Convert ms to seconds
    const MAX_POINTS: usize = (DISPLAY_TIME_WINDOW / TIME_STEP) as usize; // 5s / 0.01s = 500 points

    let mut data = use_signal(|| VecDeque::<(f64, f64)>::new());
    let mut time = use_signal(|| 0.0f64);
    let mut frequency = use_signal(|| 2.0f64);

    // Generate sin wave data in a background task
    use_effect(move || {
        spawn(async move {
            loop {
                sleep(Duration::from_millis(UPDATE_INTERVAL_MS)).await;

                let t = time() + TIME_STEP;
                time.set(t);

                let freq = frequency();
                let y = (t * freq).sin();

                let mut d = data.write();
                d.push_back((t, y));

                // Keep only last MAX_POINTS (FIFO)
                if d.len() > MAX_POINTS {
                    d.pop_front();
                }
            }
        });
    });

    rsx! {
        div {
            class: "fixed inset-0 pt-16 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center overflow-hidden",
            div {
                class: "w-full max-w-4xl px-8",
                div {
                    class: "bg-white rounded-2xl shadow-2xl p-8 space-y-6",
                    div {
                        class: "text-center space-y-2",
                        h2 {
                            class: "text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent",
                            "🌊 Waveform Graph"
                        }
                        p {
                            class: "text-gray-500 text-sm",
                            "Real-time sin wave with FIFO channel data"
                        }
                    }

                    // Frequency control slider
                    div {
                        class: "space-y-2",
                        label {
                            class: "block text-sm font-medium text-gray-700",
                            "周波数 (Frequency): {frequency():.1} Hz"
                        }
                        input {
                            r#type: "range",
                            min: "0.5",
                            max: "30.0",
                            step: "0.1",
                            value: "{frequency()}",
                            oninput: move |evt| {
                                if let Ok(val) = evt.value().parse::<f64>() {
                                    frequency.set(val);
                                }
                            },
                            class: "w-full h-2 bg-gradient-to-r from-purple-200 to-blue-200 rounded-lg appearance-none cursor-pointer slider"
                        }
                        div {
                            class: "flex justify-between text-xs text-gray-500",
                            span { "0.5 Hz" }
                            span { "30.0 Hz" }
                        }
                    }

                    WaveformCanvas {
                        data: data,
                        width: 1000,
                        height: 400,
                        color: "#8b5cf6".to_string(),
                        x_label: "時間 (秒)".to_string(),
                        y_label: "振幅 (Amplitude)".to_string(),
                        y_min: -1.0,
                        y_max: 1.0
                    }
                }
            }
        }
    }
}

#[component]
fn Hello() -> Element {
    rsx! {
        div {
            class: "fixed inset-0 pt-16 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center overflow-hidden",
            div {
                class: "w-full max-w-md px-8",
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
