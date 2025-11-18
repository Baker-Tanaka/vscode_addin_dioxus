use dioxus::prelude::*;
use std::collections::VecDeque;
use wasm_bindgen::JsCast;

/// Waveform canvas component properties
#[derive(Props, Clone, PartialEq)]
pub struct WaveformCanvasProps {
    /// Data points to plot: (time, amplitude)
    pub data: Signal<VecDeque<(f64, f64)>>,
    /// Canvas width in pixels
    #[props(default = 800)]
    pub width: u32,
    /// Canvas height in pixels
    #[props(default = 400)]
    pub height: u32,
    /// Waveform color (CSS color string)
    #[props(default = String::from("#8b5cf6"))]
    pub color: String,
    /// X-axis label
    #[props(default = String::from("時間 (秒)"))]
    pub x_label: String,
    /// Y-axis label
    #[props(default = String::from("振幅 (Amplitude)"))]
    pub y_label: String,
    /// Y-axis minimum value
    #[props(default = -1.0)]
    pub y_min: f64,
    /// Y-axis maximum value
    #[props(default = 1.0)]
    pub y_max: f64,
}

/// Waveform canvas component for real-time data visualization
#[component]
pub fn WaveformCanvas(props: WaveformCanvasProps) -> Element {
    let mut canvas_ref = use_signal(|| None::<web_sys::HtmlCanvasElement>);

    // Render the canvas whenever data changes
    use_effect(move || {
        let data_vec = props.data.read();
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

            let y_range = props.y_max - props.y_min;
            for i in 0..5 {
                let y = margin_top + (i as f64 / 4.0) * plot_height;
                let value = props.y_max - (i as f64 / 4.0) * y_range;
                let label = format!("{:.1}", value);
                context.fill_text(&label, margin_left - 10.0, y).ok();
            }

            // Draw X-axis labels (outside plot area, below)
            context.set_text_align("center");
            context.set_text_baseline("top");
            for i in 0..10 {
                let x = margin_left + (i as f64 / 9.0) * plot_width;
                if i % 2 == 0 {
                    let time_label = format!("{:.1}", i as f64 * 1.0);
                    context
                        .fill_text(&time_label, x, margin_top + plot_height + 10.0)
                        .ok();
                }
            }

            // Y-axis title (vertical text on the left)
            context.save();
            context.translate(15.0, height / 2.0).ok();
            context.rotate(-std::f64::consts::PI / 2.0).ok();
            context.set_font("14px sans-serif");
            context.set_fill_style_str("#1f2937");
            context.set_text_align("center");
            context.fill_text(&props.y_label, 0.0, 0.0).ok();
            context.restore();

            // X-axis title (horizontal text below)
            context.set_font("14px sans-serif");
            context.set_fill_style_str("#1f2937");
            context.set_text_align("center");
            context.set_text_baseline("top");
            context
                .fill_text(
                    &props.x_label,
                    margin_left + plot_width / 2.0,
                    height - 15.0,
                )
                .ok();

            // Draw waveform (inside plot area)
            if data_vec.len() > 1 {
                context.set_stroke_style_str(&props.color);
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

                    // Map y value to canvas coordinates based on y_min and y_max
                    let normalized_y = (y - props.y_min) / y_range;
                    let canvas_y = margin_top + plot_height * (1.0 - normalized_y);

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
            width: "{props.width}",
            height: "{props.height}",
            class: "w-full border-2 border-gray-200 rounded-lg",
            style: "max-width: {props.width}px; max-height: {props.height}px;"
        }
    }
}
