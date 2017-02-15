define([
    'dojo/has',
    'dojo/request/xhr',

    'esri/config'
], function (
    has,
    xhr,

    esriConfig
) {
    // force api to use CORS on mapserv thus removing the test request on app load
    // e.g. http://mapserv.utah.gov/ArcGIS/rest/info?f=json
    esriConfig.defaults.io.corsEnabledServers.push('mapserv.utah.gov');
    esriConfig.defaults.io.corsEnabledServers.push('geoedit.utah.gov');
    esriConfig.defaults.io.corsEnabledServers.push('api.mapserv.utah.gov');
    esriConfig.defaults.io.corsEnabledServers.push('discover.agrc.utah.gov');

    var projectType = 't';
    var county = 'c';
    var fundingYear = 'y';
    var GUID = 'id';
    var projectName = 'n';
    window.AGRC = {
        // app: app.App
        //      global reference to App
        app: null,

        // version.: String
        //      The version number.
        version: '2.0.0',

        // apiKey: String
        //      The api key used for services on api.mapserv.utah.gov
        // acquire at developer.mapserv.utah.gov
        apiKey: '',

        // exportWebMapUrl: String
        //      print task url
        exportWebMapUrl: 'https://mapserv.utah.gov/arcgis/rest/services/PrintProxy/GPServer/PrintProxy',

        // salinityProjectType: String
        salinityProjectType: 'Basin States Salinity Control Program',

        // gipProjectType: String
        gipProjectType: 'Grazing Improvement Program (GIP)',

        // ismProjectType: String
        ismProjectType: 'Invasive Species Mitigation (ISM)',

        urls: {
            api: 'http://geoedit.utah.gov/ACTS/api/project/',
            map: 'http://mapserv.utah.gov/arcgis/rest/services/ACTSStatisticsViewer/MapServer',
            points: 'http://mapserv.utah.gov/arcgis/rest/services/ACTSStatisticsViewer/MapServer/0'
        },

        outFields: [
            GUID,
            projectName,
            projectType,
            county,
            fundingYear
        ],

        fields: {
            FundingYear: fundingYear,
            ProjectType: projectType,
            County: county,
            GUID: GUID,
            ProjectName: projectName,
            OBJECTID: 'OBJECTID'
        },

        topics: {
            GIPPopup: 'AGRC.app.GIPPopup',
            FilterChange: 'AGRC.app.FilterChange'
        }
    };

    if (has('agrc-build') === 'prod') {
        // atlas.utah.gov
        window.AGRC.apiKey = 'AGRC-A94B063C533889';
        window.AGRC.quadWord = 'career-exhibit-panel-stadium';
    } else if (has('agrc-build') === 'stage') {
        // test.mapserv.utah.gov
        window.AGRC.quadWord = '';
        window.AGRC.apiKey = 'AGRC-AC122FA9671436';
    } else {
        // localhost
        xhr(require.baseUrl + 'secrets.json', {
            handleAs: 'json',
            sync: true
        }).then(function (secrets) {
            window.AGRC.quadWord = secrets.quadWord;
            window.AGRC.apiKey = secrets.apiKey;
        }, function () {
            throw 'Error getting secrets!';
        });
    }

    return window.AGRC;
});
