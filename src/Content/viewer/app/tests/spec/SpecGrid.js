require([
    'app/Grid',

    'dgrid/Grid',

    'dojo/dom-construct',
    'dojo/text!app/tests/data/queryResponse.json',
    'dojo/_base/window'
], function (
    Grid,

    DGrid,

    domConstruct,
    queryResponse,
    win
) {
    describe('app/Grid', function () {
        var value = 'blah';
        var testWidget;
        var destroy = function (widget) {
            widget.destroyRecursive();
            widget = null;
        };
        beforeEach(function () {
            testWidget = new Grid({}, domConstruct.create('div', {}, win.body()));
            testWidget.startup();
        });
        afterEach(function () {
            destroy(testWidget);
        });
        describe('constructor', function () {
            it('create a valid object', function () {
                expect(testWidget).toEqual(jasmine.any(Grid));
            });
        });
        describe('setPointsLayer', function () {
            var pointsLayer;
            var app;
            beforeEach(function () {
                spyOn(testWidget, 'updateFeatures');
                spyOn(testWidget, 'onPointClicked');
                pointsLayer = {
                    onUpdateEnd: function () {}
                };
                app = {
                    onPointClick: function () {}
                };
                testWidget.setPointsLayer(pointsLayer, app);
            });
            it('sets the pointsLayer property and app property', function () {
                testWidget.setPointsLayer(value, app);

                expect(testWidget.pointsLayer).toEqual(value);
                expect(testWidget.app).toEqual(app);
            });
            it('wires the updateFeatures method', function () {
                pointsLayer.onUpdateEnd();

                expect(testWidget.updateFeatures).toHaveBeenCalled();
            });
            it('calls buildGrid', function () {
                spyOn(testWidget, 'buildGrid');

                testWidget.setPointsLayer(value, app);

                expect(testWidget.buildGrid).toHaveBeenCalled();
            });
        });
        describe('buildGrid', function () {
            it('create a dgrid', function () {
                testWidget.buildGrid();

                expect(testWidget.grid).toEqual(jasmine.any(DGrid));
            });
            xit('wires the onRowSelected method', function () {
                // couldn't get this one to work :(
                var data = [{
                    guid: 'blah',
                    name: 'hello',
                    year: 'asdf',
                    county: 'asdf',
                    program: 'asfa'
                }];
                testWidget.buildGrid();
                spyOn(testWidget, 'onRowSelected').andCallThrough();
                testWidget.grid.renderArray(data);

                testWidget.grid.select(0);

                expect(testWidget.onRowSelected).toHaveBeenCalled();
            });
        });
        describe('updateFeatures', function () {
            beforeEach(function () {
                testWidget.pointsLayer = {
                    graphics: []
                };
                testWidget.grid = {
                    refresh: function () {},
                    renderArray: function () {},
                    set: function () {}
                };
            });
            it('query the feature layer for new features', function () {
                spyOn(testWidget, 'formatDataForGrid').andReturn([]);

                testWidget.updateFeatures();

                expect(testWidget.formatDataForGrid).toHaveBeenCalledWith(testWidget.pointsLayer.graphics);
            });
        });
        describe('formatDataForGrid', function () {
            var response = JSON.parse(queryResponse);
            it('format the FeatureSet object to an array', function () {
                var results = testWidget.formatDataForGrid(response);

                var gridItems = 6;
                expect(results.data.length).toBe(gridItems);
                expect(results.data[0]).toEqual({
                    id: 1117,
                    name: 'Casey Allred Salinity FY10',
                    year: '2010',
                    county: 'Emery, Garfield, Grand',
                    program: 'Basin States Salinity Control Program',
                    graphic: response[0]
                });
            });
        });
        describe('onRowSelected', function () {
            var data;
            var evt;
            var app;
            beforeEach(function () {
                data = {
                    graphic: { geometry: {} }
                };
                evt = {
                    rows: [{
                        data: data
                    }]
                };
                app = {
                    onPointClick: jasmine.createSpy('onPointClick'),
                    map: {
                        centerAt: jasmine.createSpy('centerAt'),
                        extent: {
                            contains: function () {}
                        }
                    }
                };
                testWidget.app = app;
            });
            it('call onPointClick', function () {
                testWidget.onRowSelected(evt);

                expect(app.onPointClick).toHaveBeenCalledWith(data);
            });
            it('only call onPointClick when pointSelected is false', function () {
                testWidget.pointSelected = true;

                testWidget.onRowSelected(evt);

                expect(app.onPointClick).not.toHaveBeenCalled();

                expect(testWidget.pointSelected).toBe(false);
            });
            it('sets rowSelected', function () {
                testWidget.onRowSelected(evt);

                expect(testWidget.rowSelected).toBe(true);
            });
            it("pans to the point if it's not in the map extent", function () {
                spyOn(testWidget.app.map.extent, 'contains').andReturn(false);

                testWidget.onRowSelected(evt);

                expect(testWidget.app.map.centerAt).toHaveBeenCalled();
            });
            it("doesn't pan to the point if it is in the map extent", function () {
                spyOn(testWidget.app.map.extent, 'contains').andReturn(true);

                testWidget.onRowSelected(evt);

                expect(testWidget.app.map.centerAt).not.toHaveBeenCalled();
            });
        });
        describe('onPointClicked', function () {
            var evt = {
                graphic: {
                    attributes: {
                        OBJECTID: value
                    }
                }
            };
            beforeEach(function () {
                testWidget.buildGrid();
                spyOn(testWidget.grid, 'select');
                spyOn(testWidget.grid, 'clearSelection');
                spyOn(testWidget.grid, 'row').andReturn({
                    element: {
                        scrollIntoView: function () {}
                    }
                });
            });
            it('selects the associated grid row', function () {
                testWidget.onPointClicked(evt);

                expect(testWidget.grid.select).toHaveBeenCalledWith(value);
                expect(testWidget.grid.clearSelection).toHaveBeenCalled();
            });
            it('sets pointSelected', function () {
                testWidget.onPointClicked(evt);

                expect(testWidget.pointSelected).toBe(true);
            });
            it("doesn't select row if rowSelected is true", function () {
                testWidget.rowSelected = true;

                testWidget.onPointClicked(evt);

                expect(testWidget.grid.select).not.toHaveBeenCalled();
                expect(testWidget.rowSelected).toBe(false);
            });
        });
    });
});
