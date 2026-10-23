module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./content/**/*.ts"
  ],
  theme: {
    extend: {
      colors: {
        // Ana tema — beyaz zemin, turuncu/sarı/lacivert
        paper: "#FFFFFF",
        cream: "#FFF7EA",
        orange: {
          DEFAULT: "#F58220",
          dark: "#DC6D12",
          light: "#FF9E4D",
        },
        sun: {
          DEFAULT: "#FFC845",
          dark: "#F2B01E",
          light: "#FFDD8A",
        },
        navy: {
          DEFAULT: "#0E2A56",
          deep: "#081C3C",
          soft: "#1C4390",
        },
        ink: "#14161C",
        muted: "#5A6172"
      },
      fontFamily: {
        display: ['var(--font-display)', 'Impact', 'Haettenschweiler', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif']
      },
      boxShadow: {
        card: "0 1px 2px rgba(14,42,86,0.04), 0 12px 32px -12px rgba(14,42,86,0.18)",
        lift: "0 24px 60px -24px rgba(245,130,32,0.45)",
        block: "10px 10px 0 0 #0E2A56"
      },
      borderRadius: {
        xl2: "1.25rem",
        xl3: "1.75rem"
      },
      maxWidth: {
        shell: "78rem"
      }
    }
  },
  plugins: []
}
