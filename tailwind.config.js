/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FFF8F0",
        peach: "#FFE8D6",
        coral: "#FF6B6B",
        amber: "#FFB347",
        sage: "#87BBA2",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.8)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "ring-fill": {
          "0%": { strokeDashoffset: "251.2" },
        },
        bounce: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out forwards",
        "scale-in": "scale-in 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards",
        "ring-fill": "ring-fill 1s ease-out forwards",
        bounce: "bounce 0.6s ease-in-out",
      },
    },
  },
  plugins: [],
}
