/** @type {import("eslint").Linter.Config} */
module.exports = {
  rules: {
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "no-console": ["warn", { allow: ["warn", "error", "info"] }],
  },
};
