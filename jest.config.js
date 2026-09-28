module.exports = {
    "transform": {
      "^.+\\.tsx?$": "ts-jest"
    },
    "testRegex": "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
    "moduleFileExtensions": [
      "ts",
      "tsx",
      "js",
      "jsx",
      "json",
      "node"
    ],
    coverageDirectory: "coverage",
    collectCoverageFrom: ["src/**/*.ts"],
    coverageThreshold: {
      global: { statements: 100, branches: 100, functions: 100, lines: 100 }
    },
    coverageReporters: [
      "json-summary", 
      "text",
      "lcov"
    ]
};
