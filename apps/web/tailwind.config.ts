// tailwind.config.ts or tailwind.config.js
module.exports = {
  // ...existing config
  theme: {
    extend: {
      keyframes: {
        "ring-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(59,130,246,0.5)" }, // blue-500
          "50%": { boxShadow: "0 0 0 4px rgba(59,130,246,0.2)" },
        },
        "border-pulse": {
          "0%, 100%": { borderColor: "rgba(59,130,246,1)" }, // blue-500
          "50%": { borderColor: "rgba(59,130,246,0.2)" },
        },
      },
      animation: {
        "ring-pulse": "ring-pulse 1s infinite",
        "border-pulse": "border-pulse 1s infinite",
      },
    },
  },
  // ...
};
