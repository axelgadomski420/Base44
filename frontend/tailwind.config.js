/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  darkMode: ["class", "[data-theme='aura']"],
  theme: {
    extend: {
      colors: {
        aura: { bg: "#050507", panel: "#0D0D12", accent: "#8B5CF6", green: "#2BE39B", text: "#F5F3FF", muted: "#A1A1AA" }
      },
      borderRadius: { xl2: "1.25rem" },
      boxShadow: { glass: "0 8px 32px rgba(139, 92, 246, 0.15)" }
    }
  },
  plugins: []
};