/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        accent: "#38bdf8",
        muted: "#1e293b",
      },
    },
  },
  plugins: [],
};
