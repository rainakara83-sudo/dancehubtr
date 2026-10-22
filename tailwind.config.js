module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./content/**/*.ts"],
  theme: {
    extend: {
      colors: {
        ink: "#0B0B0F",
        gold: "#D4A24C",
        crimson: "#8C1B2E",
        bone: "#F5F1E8"
      },
      fontFamily: {
        display: ['"Trebuchet MS"', 'Helvetica', 'Arial', 'sans-serif']
      }
    }
  },
  plugins: []
}
