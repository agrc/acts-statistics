module.exports = function(grunt) {
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jasmine: {
      app: {
        src: ['src/Content/viewer/app/tests/jasmineTestBootstrap.js',
          'src/Content/viewer/app/run.js'],
        options: {
          specs: ['src/Content/viewer/app/tests/spec/*.js']
        }
      }
    },
    jshint: {
      files: ['src/Content/viewer/app/**/*.js'],
      options: {jshintrc: '.jshintrc'}
    },
    watch: {
      files: ['src/Content/viewer/app/**/*.js'],
      tasks: ['jasmine:app:build', 'jshint']
    },
    connect: {
      uses_defaults: {}
    }
  });

  // Register tasks.
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-connect');

  // Default task.
  grunt.registerTask('default', ['jasmine:app:build', 'jshint', 'connect', 'watch']);
};