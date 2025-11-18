use dioxus::prelude::*;
use std::collections::VecDeque;

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
// bridge JS is served from /assets and loaded via document::Script src

fn main() {
    dioxus::launch(App);
}

#[component]
fn App() -> Element {
    rsx! {
        document::Link { rel: "icon", href: FAVICON }
        document::Link { rel: "stylesheet", href: MAIN_CSS }
        document::Link { rel: "stylesheet", href: TAILWIND_CSS }
        document::Script { src: "/assets/vscode-bridge.js" }
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
    use std::collections::VecDeque;
    use std::time::Duration;

    let mut data = use_signal(|| VecDeque::<(f64, f64)>::new());
    let mut time = use_signal(|| 0.0f64);

    // Generate sin wave data in a background task
    use_effect(move || {
        spawn(async move {
            loop {
                sleep(Duration::from_millis(50)).await;

                let t = time() + 0.1;
                time.set(t);

                let y = (t * 2.0).sin();

                let mut d = data.write();
                d.push_back((t, y));

                // Keep only last 100 points (FIFO)
                if d.len() > 100 {
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
                            "📊 Waveform Graph"
                        }
                        p {
                            class: "text-gray-500 text-sm",
                            "Real-time sin wave with FIFO channel data"
                        }
                    }
                    WaveformCanvas { data: data }
                }
            }
        }
    }
}

#[component]
fn WaveformCanvas(data: Signal<VecDeque<(f64, f64)>>) -> Element {
    use wasm_bindgen::JsCast;

    let mut canvas_ref = use_signal(|| None::<web_sys::HtmlCanvasElement>);

    // Render the canvas whenever data changes
    use_effect(move || {
        let data_vec = data.read();
        if let Some(canvas) = canvas_ref() {
            let context = canvas
                .get_context("2d")
                .unwrap()
                .unwrap()
                .dyn_into::<web_sys::CanvasRenderingContext2d>()
                .unwrap();

            let width = canvas.width() as f64;
            let height = canvas.height() as f64;
            
            // Define margins for axis labels
            let margin_left = 60.0;
            let margin_right = 20.0;
            let margin_top = 20.0;
            let margin_bottom = 50.0;
            
            let plot_width = width - margin_left - margin_right;
            let plot_height = height - margin_top - margin_bottom;

            // Clear canvas
            context.clear_rect(0.0, 0.0, width, height);
            
            // Draw plot area border
            context.set_stroke_style_str("#d1d5db");
            context.set_line_width(2.0);
            context.stroke_rect(margin_left, margin_top, plot_width, plot_height);

            // Draw grid inside plot area
            context.set_stroke_style_str("#e5e7eb");
            context.set_line_width(1.0);

            // Horizontal grid lines
            for i in 0..5 {
                let y = margin_top + (i as f64 / 4.0) * plot_height;
                context.begin_path();
                context.move_to(margin_left, y);
                context.line_to(margin_left + plot_width, y);
                context.stroke();
            }

            // Vertical grid lines
            for i in 0..10 {
                let x = margin_left + (i as f64 / 9.0) * plot_width;
                context.begin_path();
                context.move_to(x, margin_top);
                context.line_to(x, margin_top + plot_height);
                context.stroke();
            }

            // Draw Y-axis labels (outside plot area, on the left)
            context.set_fill_style_str("#374151");
            context.set_font("12px sans-serif");
            context.set_text_align("right");
            context.set_text_baseline("middle");
            
            let y_labels = ["1.0", "0.5", "0.0", "-0.5", "-1.0"];
            for (i, label) in y_labels.iter().enumerate() {
                let y = margin_top + (i as f64 / 4.0) * plot_height;
                context.fill_text(label, margin_left - 10.0, y).ok();
            }

            // Draw X-axis labels (outside plot area, below)
            context.set_text_align("center");
            context.set_text_baseline("top");
            for i in 0..10 {
                let x = margin_left + (i as f64 / 9.0) * plot_width;
                if i % 2 == 0 {
                    let time_label = format!("{:.1}", i as f64 * 1.0);
                    context.fill_text(&time_label, x, margin_top + plot_height + 10.0).ok();
                }
            }

            // Y-axis title (vertical text on the left)
            context.save();
            context.translate(15.0, height / 2.0).ok();
            context.rotate(-std::f64::consts::PI / 2.0).ok();
            context.set_font("14px sans-serif");
            context.set_fill_style_str("#1f2937");
            context.set_text_align("center");
            context.fill_text("振幅 (Amplitude)", 0.0, 0.0).ok();
            context.restore();

            // X-axis title (horizontal text below)
            context.set_font("14px sans-serif");
            context.set_fill_style_str("#1f2937");
            context.set_text_align("center");
            context.set_text_baseline("top");
            context.fill_text("時間 (秒)", margin_left + plot_width / 2.0, height - 15.0).ok();

            // Draw waveform (inside plot area)
            if data_vec.len() > 1 {
                context.set_stroke_style_str("#8b5cf6");
                context.set_line_width(2.0);
                context.begin_path();

                let min_t = data_vec.front().map(|(t, _)| *t).unwrap_or(0.0);
                let max_t = data_vec.back().map(|(t, _)| *t).unwrap_or(1.0);
                let range_t = max_t - min_t;

                for (i, (t, y)) in data_vec.iter().enumerate() {
                    let x = if range_t > 0.0 {
                        margin_left + ((t - min_t) / range_t) * plot_width
                    } else {
                        margin_left + (i as f64 / data_vec.len() as f64) * plot_width
                    };
                    let canvas_y = margin_top + plot_height / 2.0 - (y * plot_height / 4.0);

                    if i == 0 {
                        context.move_to(x, canvas_y);
                    } else {
                        context.line_to(x, canvas_y);
                    }
                }

                context.stroke();
            }
        }
    });

    rsx! {
        canvas {
            onmounted: move |event| {
                if let Some(element) = event.data().downcast::<web_sys::Element>() {
                    if let Ok(canvas) = element.clone().dyn_into::<web_sys::HtmlCanvasElement>() {
                        canvas_ref.set(Some(canvas));
                    }
                }
            },
            width: "800",
            height: "400",
            class: "w-full border-2 border-gray-200 rounded-lg",
            style: "max-width: 800px; max-height: 400px;"
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
