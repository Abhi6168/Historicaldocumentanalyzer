export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        cinzel: ["Cinzel", "serif"],
        inter: ["Inter", "sans-serif"]
      },
      colors: {
        midnight: "#0B1220",
        slatepanel: "#1E293B",
        gold: "#D4AF37",
        paper: "#F8F5EC",
        bronze: "#8B5E3C",
        success: "#22C55E",
        danger: "#EF4444"
      },
      boxShadow: {
        glow: "0 0 44px rgba(212, 175, 55, 0.22)"
      }
    }
  },
  plugins: []
};
