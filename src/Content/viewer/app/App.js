define([
    './config',
    './Filter',

    'agrc/widgets/map/BaseMap',

    'dijit/registry',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetBase',
    'dijit/_WidgetsInTemplateMixin',

    'dojo/aspect',
    'dojo/currency',
    'dojo/Deferred',
    'dojo/dom',
    'dojo/dom-style',
    'dojo/request/xhr',
    'dojo/text!app/resources/data/counties.json',
    'dojo/text!app/resources/data/projectTypes.json',
    'dojo/text!app/resources/data/years.json',
    'dojo/text!app/templates/App.html',
    'dojo/text!app/templates/GIPPopupTemplate.html',
    'dojo/text!app/templates/ISMPopupTemplate.html',
    'dojo/text!app/templates/OtherPopupTemplate.html',
    'dojo/text!app/templates/SalinityPopupTemplate.html',
    'dojo/topic',
    'dojo/_base/declare',
    'dojo/_base/event',
    'dojo/_base/lang',

    'esri/geometry/Extent',
    'esri/graphic',
    'esri/layers/FeatureLayer',
    'esri/symbols/PictureMarkerSymbol',

    'layer-selector',

    'mustache/mustache',

    './Grid',
    'dijit/layout/BorderContainer',
    'dijit/layout/ContentPane'
], function (
    config,
    Filter,

    BaseMap,

    registry,
    _TemplatedMixin,
    _WidgetBase,
    _WidgetsInTemplateMixin,

    aspect,
    currency,
    Deferred,
    dom,
    domStyle,
    xhr,
    jsonCounties,
    jsonProjectTypes,
    jsonYears,
    template,
    gipTemplate,
    ismTemplate,
    otherTemplate,
    salinityTemplate,
    topic,
    declare,
    dojoEvent,
    lang,

    Extent,
    Graphic,
    FeatureLayer,
    PictureMarkerSymbol,

    LayerSelector,

    mustache
) {
    return declare('app.App', [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        // summary:
        //      The main widget for the app
        widgetsInTemplate: true,
        templateString: template,
        baseClass: 'app',

        // map: agrc.widgets.map.Basemap
        map: null,

        // pointLyr: esri/layers/FeatureLayer
        pointLyr: null,

        // salinityTemplate: Function
        salinityTemplate: null,

        // otherTemplate: Function
        otherTemplate: null,

        // gipTemplate: Function
        gipTemplate: null,

        // ismTemplate: Function
        ismTemplate: null,

        // selectedGraphic: esri/Graphic
        //      The graphic overlaying the selected project
        selectedGraphic: null,


        constructor: function () {
            // summary:
            //      first function to fire after page loads
            console.info('app/App::ctor', arguments);

            config.app = this;
            this.childWidgets = [];

            this.inherited(arguments);

            var size = 40;
            var x = 0;
            var y = 17;
            var symbol = new PictureMarkerSymbol('Content/viewer/app/resources/images/push_pin.png', size, size)
                        .setOffset(x, y);
            this.selectedGraphic = new Graphic(null, symbol);
            this.selectedGraphic.hide();
        },
        postCreate: function () {
            // summary:
            //      Fires when
            console.log('app/App::postCreate', arguments);

            // set version number
            this.version.innerHTML = config.version;

            this.inherited(arguments);
        },
        startup: function () {
            // summary:
            //      Fires after postCreate when all of the child widgets are finished laying out.
            console.log('app/App::startup', arguments);

            // call this before creating the map to make sure that the map container is
            // the correct size
            this.inherited(arguments);

            this.initMap();

            this.grid.setPointsLayer(this.pointLyr, this);

            this.own(
                topic.subscribe(config.topics.GIPPopup, function () {
                    registry.byId('gipPopupDialog').show();
                }),
                topic.subscribe(config.topics.FilterChange, lang.hitch(this, this.clearSelectedProject))
            );
        },
        initMap: function () {
            // summary:
            //      Sets up the map
            console.info('app/App::initMap', arguments);

            var that = this;

            this.map = new BaseMap(this.mapDiv, {
                useDefaultBaseMap: false,
                showAttribution: false,
                extent: new Extent({
                    xmax: -12010849.397533866,
                    xmin: -12898741.918094235,
                    ymax: 5224652.298632992,
                    ymin: 4422369.249751998,
                    spatialReference: {
                        wkid: 3857
                    }
                })
            });

            this.childWidgets.push(
                new LayerSelector({
                    map: this.map,
                    quadWord: config.quadWord,
                    baseLayers: ['Hybrid', 'Lite', 'Terrain', 'Topo', 'Color IR']
                })
            );

            this.pointLyr = new FeatureLayer(config.urls.points, {
                mode: FeatureLayer.MODE_SNAPSHOT,
                outFields: config.outFields
            });

            this.map.addLayer(this.pointLyr);
            this.map.addLoaderToLayer(this.pointLyr);
            this.own(
                aspect.after(this.pointLyr, 'onClick', function (evt) {
                    dojoEvent.stop(evt);
                    that.onPointClick(evt);
                }, true),
                aspect.after(this.map, 'onLoad', function () {
                    that.map.graphics.add(that.selectedGraphic);
                }),
                aspect.after(this.map, 'onClick', lang.hitch(this, this.clearSelectedProject))
            );

            this.childWidgets.push(
                new Filter({
                    name: 'Year',
                    json: jsonYears,
                    pointLyr: this.pointLyr,
                    fieldName: config.fields.FundingYear
                }, this.yearFilter),
                new Filter({
                    name: 'Project Type',
                    json: jsonProjectTypes,
                    pointLyr: this.pointLyr,
                    fieldName: config.fields.ProjectType
                }, this.typeFilter),
                new Filter({
                    name: 'County',
                    json: jsonCounties,
                    pointLyr: this.pointLyr,
                    fieldName: config.fields.County,
                    queryTemplate: '${0} LIKE \'%${1}%\''
                }, this.countyFilter)
            );
        },
        onPointClick: function (evt) {
            // summary:
            //      callback for clicking on point
            // evt: evt.Graphic
            console.log('app/App::onPointClick', arguments);

            var that = this;

            this.projectInfo.innerHTML = '';
            this.getPopupContent(evt.graphic).then(function (content) {
                domStyle.set(that.clickTxt, 'display', 'none');
                that.projectInfo.innerHTML = content;
            });

            this.selectedGraphic.setGeometry(evt.graphic.geometry);
            this.selectedGraphic.show();

            this.grid.onPointClicked(evt);
        },
        getPopupContent: function (graphic) {
            // summary:
            //      fires when a graphic is clicked
            // graphic: esri/Graphic
            // returns: Deferred
            console.log('app/App::getPopupContent', arguments);

            this.map.showLoader();

            this.xhrDeferred = new Deferred();

            xhr(config.urls.api + graphic.attributes[config.outFields[0]].replace(/{|}/g, ''),
                {
                    handleAs: 'json',
                    headers: {
                        'X-Requested-With': null
                    }
                }).then(lang.hitch(this, this.onRequestComplete),
                lang.hitch(this, this.onRequestFail));

            return this.xhrDeferred;
        },
        onRequestComplete: function (json) {
            // summary:
            //      callback for request
            // json: Object
            console.log('app/App::onRequestComplete', arguments);

            var templateString;
            switch (json.projectType) {
                case config.salinityProjectType:
                    var options = { currency: 'USD' };
                    json.producersCosts = currency.format(currency.parse(json.totalCost, options) -
                                          currency.parse(json.amountOfContractPaid, options));
                    templateString = salinityTemplate;
                    break;
                case config.gipProjectType:
                    templateString = gipTemplate;
                    break;
                case config.ismProjectType:
                    templateString = ismTemplate;
                    break;
                default:
                    templateString = otherTemplate;
            }
            this.xhrDeferred.resolve(mustache.render(templateString, json));

            this.map.hideLoader();
        },
        onRequestFail: function () {
            // summary:
            //      fail callback for ajax request
            // err: Error
            console.log('app/App::onRequestFail', arguments);

            window.alert('There was an error getting the project information'); // eslint-disable-line no-alert

            this.map.hideLoader();
        },
        clearSelectedProject: function () {
            // summary:
            //      fires when the filters change
            console.log('app/App::clearSelectedProject', arguments);

            this.selectedGraphic.hide();

            domStyle.set(this.clickTxt, 'display', 'inline');
            this.projectInfo.innerHTML = '';
        }
    });
});
