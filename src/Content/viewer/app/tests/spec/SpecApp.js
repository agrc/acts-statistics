require([
    'app/App',
    'app/config',

    'dijit/Dialog',
    'dijit/registry',

    'dojo/Deferred',
    'dojo/dom-construct',
    'dojo/dom-style',
    'dojo/text!app/tests/data/Salinity_Response.json',
    'dojo/topic',
    'dojo/_base/array',
    'dojo/_base/window'
], function (
    App,
    config,

    Dialog,
    registry,

    Deferred,
    domConstruct,
    domStyle,
    salinityJSON,
    topic,
    array,
    win
) {
    describe('app/App', function () {
        var testWidget;
        var destroy = function (widget) {
            widget.destroyRecursive();
            widget = null;
        };
        var projectName = 'Project Name';
        var graphic = {
            attributes: {
                'SALINITY.SALINITYADMIN.PROJECTINFORMATION.ProjectName': projectName,
                'SALINITY.SALINITYADMIN.PROJECTINFORMATION.ProjectType': 1
            },
            symbol: {
                setSize: function () {}
            },
            geometry: 'blah'
        };
        var widgetsToDestroy;
        var testDiv = domConstruct.create('div', { style: 'width: 0; height: 0' }, win.body());
        beforeEach(function () {
            widgetsToDestroy = [];
            testWidget = new App({}, domConstruct.create('div', {}, testDiv));
            testWidget.startup();
            widgetsToDestroy.push(testWidget);

            waitsFor(function () {
                return testWidget.map.loaded;
            });
        });
        afterEach(function () {
            array.forEach(widgetsToDestroy, destroy);
        });

        it('creates a valid object', function () {
            expect(testWidget).toEqual(jasmine.any(App));
        });
        describe('startup', function () {
            beforeEach(function () {
                spyOn(testWidget.grid, 'setPointsLayer');
            });
            it('calls initMap', function () {
                var testWidget2 = new App({}, domConstruct.create('div', {}, testDiv));
                widgetsToDestroy.push(testWidget2);
                spyOn(testWidget2, 'initMap');
                spyOn(testWidget2.grid, 'setPointsLayer');

                testWidget2.startup();

                expect(testWidget2.initMap).toHaveBeenCalled();
            });
            it('builds the mustacheTemplate', function () {
                expect(testWidget.mustacheTemplate).not.toBeNull();
            });
            it('calls setPointsLayer on grid', function () {
                testWidget.startup();

                expect(testWidget.grid.setPointsLayer).toHaveBeenCalledWith(testWidget.pointLyr, testWidget);
            });
            it('wires the GIP popup', function () {
                var dialog;
                runs(function () {
                    dialog = new Dialog({
                        id: 'gipPopupDialog'
                    });
                    topic.publish(config.topics.GIPPopup);
                });

                waitsFor(function () {
                    var node = registry.byId('gipPopupDialog').domNode;

                    return (domStyle.get(node, 'display') !== 'none') &&
                        (domStyle.get(node, 'visibility') !== 'hidden');
                }, 'GIP Popup to be visible');

                runs(function () {
                    dialog.destroy();
                });
            });
            xit('wires clearSelectedProject', function () {
                spyOn(testWidget, 'clearSelectedProject');
                testWidget.startup();

                topic.publish(config.topics.FilterChange);

                expect(testWidget.clearSelectedProject).toHaveBeenCalled();
            });
        });
        describe('initMap', function () {
            it('adds the map service', function () {
                expect(testWidget.pointLyr).not.toBeNull();

                // expect(testWidget.map.layers.length).toBe(2);
            });
            xit('wires clearSelectedProject to map onClick', function () {
                spyOn(testWidget, 'clearSelectedProject');
                testWidget.initMap();

                testWidget.map.emit('onClick');

                expect(testWidget.clearSelectedProject).toHaveBeenCalled();
            });
        });
        describe('onPointClick', function () {
            var def;
            var value2;
            beforeEach(function () {
                def = new Deferred();
                value2 = 'content stuff';
                spyOn(testWidget, 'getPopupContent').andReturn(def);
                spyOn(testWidget.selectedGraphic, 'setGeometry');
                spyOn(testWidget.grid.grid, 'select');
                spyOn(testWidget.grid.grid, 'row').andReturn({
                    element: {
                        scrollIntoView: function () {}
                    }
                });
            });
            it('populates the content pane', function () {
                testWidget.onPointClick({ graphic: graphic });

                expect(testWidget.getPopupContent).toHaveBeenCalledWith(graphic);

                def.resolve(value2);

                expect(testWidget.projectInfo.innerHTML).toEqual(value2);
                expect(domStyle.get(testWidget.clickTxt, 'display')).toEqual('none');
            });
            it('updates the geometry of the selected symbol', function () {
                testWidget.onPointClick({ graphic: graphic });

                expect(testWidget.selectedGraphic.setGeometry).toHaveBeenCalledWith(graphic.geometry);
            });
        });
        describe('getPopupContent', function () {
            it('starts the map loader', function () {
                spyOn(testWidget.map, 'showLoader');

                testWidget.getPopupContent(graphic);

                expect(testWidget.map.showLoader).toHaveBeenCalled();
            });
            it('returns a deferred', function () {
                expect(testWidget.getPopupContent(graphic)).toEqual(testWidget.xhrDeferred);
                expect(testWidget.xhrDeferred).not.toBeNull();
            });
        });
        describe('onRequestComplete', function () {
            beforeEach(function () {
                testWidget.xhrDeferred = new Deferred();
            });
            it('hides the map loader', function () {
                spyOn(testWidget.map, 'hideLoader');

                testWidget.onRequestComplete(JSON.parse(salinityJSON));

                expect(testWidget.map.hideLoader).toHaveBeenCalled();
            });
            it('resolves the deferred with a string', function () {
                spyOn(testWidget.xhrDeferred, 'resolve');

                testWidget.onRequestComplete(JSON.parse(salinityJSON));

                expect(testWidget.xhrDeferred.resolve).toHaveBeenCalled();
            });
            it('chooses appropriate template', function () {
                spyOn(testWidget, 'salinityTemplate');
                spyOn(testWidget, 'gipTemplate');
                spyOn(testWidget, 'otherTemplate');

                testWidget.onRequestComplete({
                    projectType: config.salinityProjectType
                });

                expect(testWidget.salinityTemplate).toHaveBeenCalled();
                expect(testWidget.otherTemplate).not.toHaveBeenCalled();
                expect(testWidget.gipTemplate).not.toHaveBeenCalled();

                testWidget.onRequestComplete({
                    projectType: config.gipProjectType
                });

                expect(testWidget.salinityTemplate.callCount).toBe(1);
                expect(testWidget.otherTemplate).not.toHaveBeenCalled();
                expect(testWidget.gipTemplate.callCount).toBe(1);

                testWidget.onRequestComplete({
                    projectType: 'anything else'
                });

                expect(testWidget.salinityTemplate.callCount).toBe(1);
                expect(testWidget.otherTemplate.callCount).toBe(1);
                expect(testWidget.gipTemplate.callCount).toBe(1);
            });
        });
        describe('onRequestFail', function () {
            it('hides the map loader', function () {
                spyOn(testWidget.map, 'hideLoader');

                testWidget.onRequestFail('blah');

                expect(testWidget.map.hideLoader).toHaveBeenCalled();
            });
        });
        describe('clearSelectedProject', function () {
            it('hides the selected graphic', function () {
                testWidget.selectedGraphic.visible = true;

                testWidget.clearSelectedProject();

                expect(testWidget.selectedGraphic.visible).toBe(false);
            });
            it('clears the side bar', function () {
                domStyle.set(testWidget.clickTxt, 'display', 'none');
                testWidget.projectInfo.innerHTML = 'blah';

                testWidget.clearSelectedProject();

                expect(testWidget.projectInfo.innerHTML).toEqual('');
                expect(domStyle.get(testWidget.clickTxt, 'display')).toEqual('inline');
            });
        });
    });
});
