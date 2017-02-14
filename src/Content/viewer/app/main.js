define([
    'dojo/parser', 

    'mustache/mustache',
    'app/App'
], 

function (
    parser
    ) {
    // var mapServiceUrl = '/arcgis/rest/services/ACTSStatisticsViewer/MapServer';
    var mapServiceUrl = 'http://mapserv.utah.gov/arcgis/rest/services/ACTSStatisticsViewer/MapServer';
    var projectType = 't';
    var county = 'c';
    var fundingYear = 'y';
    var GUID = 'id';
    var projectName = 'n';
    window.AGRC = {
        // errorLogger: ijit.modules.ErrorLogger
        errorLogger: null,

        // app: app.App
        //      global reference to App
        app: null,

        // version: String
        //      The version number.
        version: '1.6.0',

        // mapServiceUrl: String
        mapServiceUrl: mapServiceUrl,

        // pointsLayerUrl: String
        pointsLayerUrl: mapServiceUrl + '/0',

        // outFields: String[]
        outFields: [
            GUID,
            projectName,
            projectType,
            county,
            fundingYear
        ],

        // apiUrl: String
        apiUrl: 'http://geoedit.utah.gov/ACTS/api/project/',
        // apiUrl: 'http://test.mapserv.utah.gov/ACTS.statistics.API/api/project/',
        // apiUrl: 'http://168.179.247.146/ACTS.Statistics.API/api/project/',

        // salinityProjectType: String
        salinityProjectType: "Basin States Salinity Control Program",

        // gipProjectType: String
        gipProjectType: "Grazing Improvement Program (GIP)",

        // ismProjectType: String
        ismProjectType: 'Invasive Species Mitigation (ISM)',

        // fields: {}
        fields: {
            FundingYear: fundingYear,
            ProjectType: projectType,
            County: county,
            GUID: GUID,
            ProjectName: projectName,
            OBJECTID: 'OBJECTID'
        },

        // topics: Object
        topics: {
            GIPPopup: 'AGRC.app.GIPPopup',
            FilterChange: 'AGRC.app.FilterChange'
        }
    };

    // lights...camera...action!
    parser.parse();
});