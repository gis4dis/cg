const withTM = require('@weco/next-plugin-transpile-modules')
module.exports = withTM({
  distDir: 'build',
  transpileModules: ['ol'],
  exportPathMap: function () {
    return {
      '/': { page: '/' },
    }
  }
});