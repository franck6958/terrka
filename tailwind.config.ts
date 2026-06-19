import type { Config } from "tailwindcss";

/**
 * Tokens issus de la Charte graphique TREKKA.
 * Toute couleur d'état doit toujours être accompagnée d'un libellé ou d'une icône
 * (accessibilité : ne jamais coder une information par la couleur seule).
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 3.1 Couleurs de marque
        brand: {
          DEFAULT: "#1B3A6B", // Bleu TREKKA
          interactive: "#2E6FB7", // Bleu interactif
          amber: "#F2A20C", // Ambre chantier
        },
        // 3.2 Neutres — béton & acier
        surface: "#F7F8FA", // Fond
        line: "#E4E7EC", // Ligne
        muted: "#98A2B3", // Gris discret
        slate: "#475467", // Gris ardoise
        ink: "#1D2433", // Encre
        // 3.3 Couleurs d'état — le cœur du monitoring
        state: {
          ontime: "#2E9E5B", // Dans les délais
          risk: "#E8A317", // À risque
          late: "#D64550", // En retard / critique
          info: "#2E6FB7", // Information
        },
        accentText: "#412402", // Texte sur bouton ambre
      },
      fontFamily: {
        // 4. Typographie
        heading: ["var(--font-poppins)", "system-ui", "sans-serif"], // Poppins — titres & logo
        sans: ["var(--font-inter)", "system-ui", "sans-serif"], // Inter — texte courant
      },
      borderRadius: {
        // 6. Surfaces : angles arrondis de 8 à 12 px
        card: "12px",
        control: "8px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(29, 36, 51, 0.06), 0 1px 3px rgba(29, 36, 51, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
