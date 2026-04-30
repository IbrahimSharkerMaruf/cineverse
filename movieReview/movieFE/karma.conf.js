module.exports = function (config) {
  config.set({
    browsers: ['Safari'],
    plugins: [
      'karma-jasmine',
      'karma-safari-launcher',
      'karma-jasmine-html-reporter',
      'karma-coverage',
    ],
  });
};
