module.exports = function configure(grunt) {
    require('load-grunt-tasks')(grunt);

    var jsAppFiles = 'src/Content/viewer/app/**/*.js';
    var otherFiles = [
        'src/Content/viewer/app/**/*.html',
        'src/Content/viewer/app/**/*.css',
        'src/Content/viewer/index.html',
        'src/Content/viewer/ChangeLog.html'
    ];
    var gruntFile = 'GruntFile.js';
    var internFile = 'tests/intern.js';
    var jsFiles = [
        jsAppFiles,
        gruntFile,
        internFile,
        'profiles/**/*.js'
    ];
    var bumpFiles = [
        'package.json',
        'bower.json',
        'src/Content/viewer/app/package.json',
        'src/Content/viewer/app/config.js'
    ];
    var deployFiles = [
        '**',
        '!**/*.uncompressed.js',
        '!**/*consoleStripped.js',
        '!**/bootstrap/less/**',
        '!**/bootstrap/test-infra/**',
        '!**/tests/**',
        '!build-report.txt',
        '!components-jasmine/**',
        '!favico.js/**',
        '!jasmine-favicon-reporter/**',
        '!jasmine-jsreporter/**',
        '!stubmodule/**',
        '!util/**'
    ];
    var deployDir = 'SGID';
    var secrets;
    try {
        secrets = grunt.file.readJSON('secrets.json');
    } catch (e) {
        // swallow for build server

        // still print a message so you can catch bad syntax in the secrets file.
        grunt.log.write(e);

        secrets = {
            stage: {
                host: '',
                username: '',
                password: ''
            },
            prod: {
                host: '',
                username: '',
                password: ''
            }
        };
    }

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        bump: {
            options: {
                files: bumpFiles,
                commitFiles: bumpFiles.concat('src/ChangeLog.html'),
                push: false
            }
        },
        clean: {
            build: ['dist'],
            deploy: ['deploy']
        },
        compress: {
            main: {
                options: {
                    archive: 'deploy/deploy.zip'
                },
                files: [{
                    src: deployFiles,
                    dest: './',
                    cwd: 'dist/',
                    expand: true
                }]
            }
        },
        connect: {
            uses_defaults: { // eslint-disable-line camelcase
            }
        },
        copy: {
            main: {
                files: [{
                    expand: true,
                    cwd: 'src/',
                    src: ['*.html'],
                    dest: 'dist/'
                }]
            }
        },
        dojo: {
            prod: {
                options: {
                    // You can also specify options to be used in all your tasks
                    profiles: ['profiles/prod.build.profile.js', 'profiles/build.profile.js']
                }
            },
            stage: {
                options: {
                    // You can also specify options to be used in all your tasks
                    profiles: ['profiles/stage.build.profile.js', 'profiles/build.profile.js']
                }
            },
            options: {
                // You can also specify options to be used in all your tasks
                // Path to dojo.js file in dojo source
                dojo: 'src/Content/viewer/dojo/dojo.js',
                // Optional: Utility to bootstrap (Default: 'build')
                load: 'build',
                releaseDir: '../dist/Content/viewer',
                // Optional: Module to require for the build (Default: nothing)
                requires: ['src/Content/viewer/app/packages.js', 'src/Content/viewer/app/run.js'],
                basePath: './src'
            }
        },
        eslint: {
            options: {
                configFile: '.eslintrc'
            },
            main: {
                src: jsFiles
            }
        },
        imagemin: {
            main: {
                options: {
                    optimizationLevel: 3
                },
                files: [{
                    expand: true,
                    cwd: 'src/',
                    // exclude tests because some images in dojox throw errors
                    src: ['**/*.{png,jpg,gif}', '!**/tests/**/*.*'],
                    dest: 'src/'
                }]
            }
        },
        jasmine: {
            main: {
                options: {
                    specs: ['src/Content/viewer/app/**/Spec*.js'],
                    vendor: [
                        'src/Content/viewer/jasmine-favicon-reporter/vendor/favico.js',
                        'src/Content/viewer/jasmine-favicon-reporter/jasmine-favicon-reporter.js',
                        'src/Content/viewer/jasmine-jsreporter/jasmine-jsreporter.js',
                        'src/Content/viewer/app/tests/jasmineTestBootstrap.js',
                        'src/Content/viewer/dojo/dojo.js',
                        'src/Content/viewer/app/packages.js',
                        'src/Content/viewer/app/tests/jsReporterSanitizer.js',
                        'src/Content/viewer/app/tests/jasmineAMDErrorChecking.js',
                        'src/Content/viewer/jquery/dist/jquery.js'
                    ],
                    host: 'http://localhost:8000'
                }
            }
        },
        parallel: {
            options: {
                grunt: true
            },
            assets: {
                tasks: ['eslint:main', 'stylus', 'jasmine:main:build']
            },
            buildAssets: {
                tasks: ['eslint:main', 'clean:build', 'newer:imagemin:main', 'stylus']
            }
        },
        processhtml: {
            options: {},
            main: {
                files: {
                    'dist/Content/viewer/index.html': ['src/Content/viewer/index.html']
                }
            }
        },
        secrets: secrets,
        sftp: {
            stage: {
                files: {
                    './': 'deploy/deploy.zip'
                },
                options: {
                    host: '<%= secrets.stage.host %>',
                    username: '<%= secrets.stage.username %>',
                    password: '<%= secrets.stage.password %>'
                }
            },
            prod: {
                files: {
                    './': 'deploy/deploy.zip'
                },
                options: {
                    host: '<%= secrets.prod.host %>',
                    username: '<%= secrets.prod.username %>',
                    password: '<%= secrets.prod.password %>',
                    path: './upload/' + deployDir
                }
            },
            options: {
                createDirectories: true,
                path: './wwwroot/' + deployDir + '/',
                srcBasePath: 'deploy/',
                showProgress: true
            }
        },
        sshexec: {
            options: {

            },
            stage: {
                command: ['cd wwwroot/' + deployDir, 'unzip -oq deploy.zip', 'rm deploy.zip'].join(';'),
                options: {
                    host: '<%= secrets.stage.host %>',
                    username: '<%= secrets.stage.username %>',
                    password: '<%= secrets.stage.password %>'
                }
            },
            prod: {
                command: ['cd wwwroot/' + deployDir, 'unzip -oq deploy.zip', 'rm deploy.zip'].join(';'),
                options: {
                    host: '<%= secrets.prod.host %>',
                    username: '<%= secrets.prod.username %>',
                    password: '<%= secrets.prod.password %>'
                }
            }
        },
        stylus: {
            main: {
                options: {
                    compress: false,
                    'resolve url': true
                },
                files: [{
                    expand: true,
                    cwd: 'src/Content/viewer/',
                    src: ['app/**/*.styl'],
                    dest: 'src/Content/viewer/',
                    ext: '.css'
                }]
            }
        },
        uglify: {
            options: {
                preserveComments: false,
                sourceMap: true,
                compress: {
                    drop_console: true, // eslint-disable-line camelcase
                    passes: 2,
                    dead_code: true // eslint-disable-line camelcase
                }
            },
            stage: {
                options: {
                    compress: {
                        drop_console: false // eslint-disable-line camelcase
                    }
                },
                src: ['dist/Content/viewer/dojo/dojo.js'],
                dest: 'dist/Content/viewer/dojo/dojo.js'
            },
            prod: {
                options: {
                    sourceMap: false
                },
                files: [{
                    expand: true,
                    cwd: 'dist',
                    src: '**/*.js',
                    dest: 'dist'
                }]
            }
        },
        watch: {
            eslint: {
                files: jsFiles,
                tasks: ['newer:eslint:main', 'jasmine:main:build']
            },
            src: {
                files: jsFiles.concat(otherFiles),
                options: { livereload: true }
            },
            stylus: {
                files: 'src/Content/viewer/app/**/*.styl',
                tasks: ['newer:stylus']
            }
        }
    });

    grunt.registerTask('default', [
        'parallel:assets',
        'connect',
        'watch'
    ]);
    grunt.registerTask('build-prod', [
        'parallel:buildAssets',
        'dojo:prod',
        'uglify:prod',
        'copy:main',
        'processhtml:main'
    ]);
    grunt.registerTask('deploy-prod', [
        'clean:deploy',
        'compress:main',
        'sftp:prod'
    ]);
    grunt.registerTask('build-stage', [
        'parallel:buildAssets',
        'dojo:stage',
        'uglify:stage',
        'copy:main',
        'processhtml:main'
    ]);
    grunt.registerTask('deploy-stage', [
        'clean:deploy',
        'compress:main',
        'sftp:stage',
        'sshexec:stage'
    ]);
    grunt.registerTask('travis', [
        'verbosity:main',
        'eslint:main',
        'jasmine:main:build',
        'connect',
        'build-stage'
    ]);
};
