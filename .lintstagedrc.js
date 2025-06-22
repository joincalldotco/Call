module.exports = {
  "*.js": (filenames) => {
    const eslintFiles = filenames.filter(
      (file) =>
        !file.includes("packages/eslint-config") &&
        !file.includes(".lintstagedrc.js") &&
        !file.includes(".eslintrc.js") &&
        !file.includes(".prettierrc.js")
    );
    const commands = [];

    if (eslintFiles.length > 0) {
      commands.push(`eslint --fix ${eslintFiles.join(" ")}`);
    }

    commands.push(`prettier --write ${filenames.join(" ")}`);
    return commands;
  },
  "*.{md,json}": (filenames) => `prettier --write ${filenames.join(" ")}`,
};
