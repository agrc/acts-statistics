define([
    './config',

    'dgrid/OnDemandGrid',
    'dgrid/Selection',

    'dijit/_TemplatedMixin',
    'dijit/_WidgetBase',
    'dijit/_WidgetsInTemplateMixin',

    'dojo/aspect',
    'dojo/store/Memory',
    'dojo/text!app/resources/data/counties.json',
    'dojo/text!app/resources/data/projectTypes.json',
    'dojo/text!app/resources/data/years.json',
    'dojo/text!app/templates/Grid.html',
    'dojo/_base/array',
    'dojo/_base/declare',
    'dojo/_base/lang'
], function (
    config,

    DGrid,
    Selection,

    _TemplatedMixin,
    _WidgetBase,
    _WidgetsInTemplateMixin,

    aspect,
    Memory,
    countiesJSON,
    projectTypesJSON,
    yearsJSON,
    template,
    array,
    declare,
    lang
) {
    // summary:
    //      Contains a dgrid of all of the projects.
    return declare('app/Grid', [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        widgetsInTemplate: true,
        templateString: template,
        baseClass: 'app-grid',

        // grid: DGrid
        grid: null,

        // pointsLayer: esri/layers/FeatureLayer
        pointsLayer: null,

        // app: app/App
        app: null,

        // used to prevent infinite loop between onPointClicked and onRowSelected
        // pointSelected: Boolean
        pointSelected: false,
        // rowSelected: Boolean
        rowSelected: false,

        // look ups ...
        // counties: {}
        counties: null,
        // projectTypes: {}
        projectTypes: null,
        // years: {}
        years: null,


        constructor: function () {
            console.log('app/Grid::constructor', arguments);

            var makeLookup = function (txt) {
                var arr = JSON.parse(txt);
                var lu = {};
                array.forEach(arr, function (obj) {
                    lu[obj.id] = obj.name;
                });

                return lu;
            };
            this.counties = makeLookup(countiesJSON);
            this.projectTypes = makeLookup(projectTypesJSON);
            this.years = makeLookup(yearsJSON);
        },
        postCreate: function () {
            // summary:
            //      dom is ready
            console.log('app/Grid::postCreate', arguments);

            this.inherited(arguments);
        },
        setPointsLayer: function (layer, app) {
            // summary:
            //      Used to get a reference to the feature layer and app
            // layer: esri/layers/FeatureLayer
            // app: app/App
            console.log('app/Grid::setPointsLayer', arguments);

            this.pointsLayer = layer;
            this.app = app;
            this.own(
                aspect.after(layer, 'onUpdateEnd', lang.hitch(this, this.updateFeatures), true)
            );

            this.buildGrid();
        },
        buildGrid: function () {
            // summary:
            //      builds the dgrid
            console.log('app/Grid::buildGrid', arguments);

            this.grid = new (declare([DGrid, Selection]))({
                columns: {
                    name: 'Project Name',
                    year: 'Fiscal Year of Project',
                    county: 'County',
                    program: 'UDAF Program that Funded the Project'
                },
                selectionMode: 'single',
                bufferRows: Infinity
            }, this.gridDiv);

            this.own(this.grid.on('dgrid-select', lang.hitch(this, this.onRowSelected), true));
        },
        updateFeatures: function () {
            // summary:
            //      queries for new features and populates the grid
            console.log('app/Grid::updateFeatures', arguments);

            this.grid.set('store', (this.formatDataForGrid(this.pointsLayer.graphics)));
            this.grid.set('sort', 'name');
        },
        formatDataForGrid: function (graphics) {
            // summary:
            //      reformats the FeatureSet to an array suitable for DGrid
            // graphics: esri/Graphic[]
            console.log('app/Grid::formatDataForGrid', arguments);

            var that = this;
            var countyDelimiter = ', ';

            var data = array.map(graphics, function (f) {
                var atts = f.attributes;

                return {
                    id: atts[config.fields.OBJECTID],
                    name: atts[config.fields.ProjectName],
                    year: that.years[atts[config.fields.FundingYear]],
                    county: array.map(atts[config.fields.County].split(countyDelimiter), function (county) {
                        return that.counties[county];
                    }).join(countyDelimiter),
                    program: that.projectTypes[atts[config.fields.ProjectType]],
                    graphic: f
                };
            });

            return new Memory({ data: data });
        },
        onRowSelected: function (evt) {
            // summary:
            //      fires when a row is selected
            // evt: Event
            console.log('app/Grid::onRowSelected', arguments);

            var graphic = evt.rows[0].data.graphic;
            var geometry = evt.rows[0].data.graphic.geometry;

            if (this.pointSelected) {
                this.pointSelected = false;
            } else {
                this.rowSelected = true;
                this.app.onPointClick({ graphic: graphic });
                if (!this.app.map.extent.contains(geometry)) {
                    this.app.map.centerAt(geometry);
                }
            }
        },
        onPointClicked: function (evt) {
            // summary:
            //      wired to app/App::onPointClick
            // evt: Event
            console.log('app/Grid::onPointClicked', arguments);

            var oid = evt.graphic.attributes[config.fields.OBJECTID];
            if (this.rowSelected) {
                this.rowSelected = false;
            } else {
                this.pointSelected = true;
                this.grid.clearSelection();
                this.grid.select(oid);
                this.grid.row(oid).element.scrollIntoView();
            }
        }
    });
});
