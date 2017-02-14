define([
    'dijit/registry', 
    'dojo/dom', 
    'dojo/_base/declare',
    'dijit/_WidgetBase', 
    'dijit/_TemplatedMixin', 
    'dijit/_WidgetsInTemplateMixin',
    'dojo/text!app/templates/App.html',
    'agrc/widgets/map/BaseMap',
    'ijit/modules/ErrorLogger',
    'agrc/modules/EsriLoader!esri/layers/FeatureLayer',
    'dojo/aspect',
    'dojo/_base/lang',
    'app/Request', // because of http://bugs.dojotoolkit.org/ticket/16408
    'dojo/Deferred',
    'mustache/mustache',
    'dojo/text!app/templates/SalinityPopupTemplate.html',
    'dojo/text!app/templates/GIPPopupTemplate.html',
    'dojo/text!app/templates/OtherPopupTemplate.html',
    'dojo/text!app/templates/ISMPopupTemplate.html',
    'app/Filter',
    'agrc/modules/EsriLoader!esri/symbols/PictureMarkerSymbol',
    'agrc/modules/EsriLoader!esri/graphic',
    'dojo/text!app/resources/data/projectTypes.json',
    'dojo/text!app/resources/data/years.json',
    'dojo/text!app/resources/data/counties.json',
    'dojo/topic',
    'dojo/dom-style',
    'dojo/_base/event',
    'dojo/currency',

    'dijit/layout/BorderContainer',
    'dijit/layout/ContentPane',
    'app/Grid'
], 

function (
    registry, 
    dom, 
    declare, 
    _WidgetBase, 
    _TemplatedMixin, 
    _WidgetsInTemplateMixin, 
    template, 
    BaseMap, 
    ErrorLogger, 
    FeatureLayer,
    aspect,
    lang,
    request,
    Deferred,
    mustache,
    salinityPopupTemplate,
    gipPopupTemplate,
    otherPopupTemplate,
    ismPopupTemplate,
    Filter,
    PictureMarkerSymbol,
    Graphic,
    jsonProjectTypes,
    jsonYears,
    jsonCounties,
    topic,
    domStyle,
    dojoEvent,
    currency
    ) {
    return declare("app.App", 
        [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], 
        {
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


        constructor: function(){
            // summary:
            //      first function to fire after page loads
            console.info(this.declaredClass + "::" + arguments.callee.nom, arguments);

            AGRC.errorLogger = new ErrorLogger({appName: 'ACTSStatisticsViewer'});
            
            AGRC.app = this;

            this.inherited(arguments);

            // var symbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 16,
            //    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
            //    new dojo.Color([0, 255, 255]), 1),
            //    new dojo.Color([0, 255, 255, 0.70]));
            var symbol = new PictureMarkerSymbol('Content/viewer/app/resources/images/push_pin.png', 40, 40).setOffset(0, 17);
            this.selectedGraphic = new Graphic(null, symbol);
            this.selectedGraphic.hide();
        },
        postCreate: function () {
            // summary:
            //      Fires when 
            console.log(this.declaredClass + "::" + arguments.callee.nom, arguments);
        
            // set version number
            this.version.innerHTML = AGRC.version;

            this.inherited(arguments);
        },
        startup: function () {
            // summary:
            //      Fires after postCreate when all of the child widgets are finished laying out.
            console.log(this.declaredClass + "::" + arguments.callee.nom, arguments);

            // call this before creating the map to make sure that the map container is 
            // the correct size
            this.inherited(arguments);
            
            this.initMap();

            this.salinityTemplate = mustache.compile(salinityPopupTemplate);
            this.gipTemplate = mustache.compile(gipPopupTemplate);
            this.otherTemplate = mustache.compile(otherPopupTemplate);
            this.ismTemplate = mustache.compile(ismPopupTemplate);

            this.grid.setPointsLayer(this.pointLyr, this);

            this.own(
                topic.subscribe(AGRC.topics.GIPPopup, function () {
                    registry.byId('gipPopupDialog').show();
                }),
                topic.subscribe(AGRC.topics.FilterChange, lang.hitch(this, this.clearSelectedProject))
            );
        },
        initMap: function() {
            // summary:
            //      Sets up the map
            console.info(this.declaredClass + "::" + arguments.callee.nom, arguments);

            var that = this;
            
            this.map = new BaseMap(this.mapDiv, {defaultBaseMap: 'Hybrid'});

            this.pointLyr = new FeatureLayer(AGRC.pointsLayerUrl, {
                mode: FeatureLayer.MODE_SNAPSHOT,
                outFields: AGRC.outFields
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

            new Filter({
                name: 'Year',
                json: jsonYears,
                pointLyr: this.pointLyr,
                fieldName: AGRC.fields.FundingYear
            }, this.yearFilter);
            new Filter({
                name: 'Project Type',
                json: jsonProjectTypes,
                pointLyr: this.pointLyr,
                fieldName: AGRC.fields.ProjectType
            }, this.typeFilter);
            new Filter({
                name: 'County',
                json: jsonCounties,
                pointLyr: this.pointLyr,
                fieldName: AGRC.fields.County,
                queryTemplate: '${0} LIKE \'%${1}%\''
            }, this.countyFilter);
        },
        onPointClick: function (evt) {
            // summary:
            //      callback for clicking on point
            // evt: evt.Graphic
            console.log(this.declaredClass + "::onPointClick", arguments);

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
            console.log(this.declaredClass + "::getPopupContent", arguments);
        
            this.map.showLoader();

            this.xhrDeferred = new dojo.Deferred();
            console.log('graphic.attributes[AGRC.outFields[0]]', graphic.attributes[AGRC.outFields[0]]);

            request(AGRC.apiUrl + graphic.attributes[AGRC.outFields[0]],
            {
                jsonp: 'callback'
            }).then(lang.hitch(this, this.onRequestComplete), lang.hitch(this, this.onRequestFail));

            return this.xhrDeferred;
        },
        onRequestComplete: function (json) {
            // summary:
            //      callback for request
            // json: Object
            console.log(this.declaredClass + "::onRequestComplete", arguments);

            var template;
            switch(json.projectType) {
                case AGRC.salinityProjectType:
                    var options = {currency: 'USD'};
                    json.producersCosts = currency.format(currency.parse(json.totalCost, options) - 
                        currency.parse(json.amountOfContractPaid, options));
                    template = this.salinityTemplate;
                    break;
                case AGRC.gipProjectType:
                    template = this.gipTemplate;
                    break;
                case AGRC.ismProjectType:
                    template = this.ismTemplate;
                    break;
                default:
                    template = this.otherTemplate;
            }
            this.xhrDeferred.resolve(template(json));

            this.map.hideLoader();
        },
        onRequestFail: function (err) {
            // summary:
            //      fail callback for ajax request
            // err: Error
            console.log(this.declaredClass + "::onRequestFail", arguments);

            window.alert('There was an error getting the project information');

            AGRC.errorLogger.log(err);
        
            this.map.hideLoader();
        },
        clearSelectedProject: function () {
            // summary:
            //      fires when the filters change
            console.log(this.declaredClass + "::clearSelectedProject", arguments);

            this.selectedGraphic.hide();
        
            domStyle.set(this.clickTxt, 'display', 'inline');
            this.projectInfo.innerHTML = '';
        }
    });
});