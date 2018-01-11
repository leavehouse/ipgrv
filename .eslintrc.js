module.exports = {
  env: {
    "browser": true,
    "es6": true,
  },
  extends: "eslint:recommended",
  parser: "babel-eslint",
  parserOptions: {
    "sourceType": "module"
  },
  rules: {
    "linebreak-style": [
      "error",
      "unix"
    ],
  },
};
