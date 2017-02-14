(function () {
    var projectUrl;
    if (typeof location === 'object') {
        // running in browser
        projectUrl = location.pathname.replace(/\/[^\/]+$/, "") + '/';

        // running in unit tests
        if (window.jasmine) {
            projectUrl = '/src/';
        }
    } else {
        // running in build system
        projectUrl = '';
    }
    require({
        packages: [
            {
                name: 'app',
                location: projectUrl + 'Content/viewer/app'
            },{
                name: 'agrc',
                location: projectUrl + 'Content/viewer/agrc'
            },{
                name: 'ijit',
                location: projectUrl + 'Content/viewer/ijit'
            },{
                name: 'mustache',
                location: projectUrl + 'Content/viewer/mustache'
            },{
                name: 'dgrid',
                location: projectUrl + 'Content/viewer/dgrid'
            },{
                name: 'put-selector',
                location: projectUrl + 'Content/viewer/put-selector'
            },{
                name: 'xstyle',
                location: projectUrl + 'Content/viewer/xstyle'
            }
        ]
    }, ['app']);
})();