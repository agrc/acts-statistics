require([
    'app/Filter',
    'dojo/dom-construct',
    'dojo/_base/window',
    'agrc/modules/EsriLoader!esri/tasks/query',
    'agrc/modules/EsriLoader!https://raw.github.com/stdavis/StubModule/master/StubModule.js',
    'dojo/text!app/resources/data/years.json',
    'dojo/topic'

],

function (
    Filter,
    domConstruct,
    win,
    QueryTask,
    StubModule,
    jsonTxt,
    topic
    ) {
    describe('app/Filter', function () {
        var testWidget;
        var destroy = function (widget) {
            widget.destroyRecursive();
            widget = null;
        };
        var layerIndex;
        var name;
        var fieldName = 'fieldName';
        var setDefinitionExpressionSpy;
        beforeEach(function () {
            setDefinitionExpressionSpy = jasmine.createSpy('setDefinitionExpression');
            layerIndex = 2;
            name = 'testName';
            testWidget = new Filter({
                json: jsonTxt,
                name: name,
                fieldName: fieldName,
                pointLyr: {
                    setDefinitionExpression: setDefinitionExpressionSpy,
                    getDefinitionExpression: function () {
                        return '';
                    }
                }
            }, domConstruct.create('div', {}, win.body()));
            testWidget.startup();
        });
        afterEach(function () {
            destroy(testWidget);
        });
        it('create a valid object', function () {
            expect(testWidget).toEqual(jasmine.any(Filter));
        });
        describe('postCreate', function () {
            it("calls buildFilteringSelect", function () {
                spyOn(testWidget, 'buildFilteringSelect');
                
                testWidget.postCreate();

                expect(testWidget.buildFilteringSelect).toHaveBeenCalled();
            });
        });
        describe('buildFilteringSelect', function () {
            it("sets the filtering select equal to the first value", function () {
                testWidget.buildFilteringSelect();

                expect(testWidget.filteringSelect.get('value')).toEqual('-1');
            });
        });
        describe('onFilterChange', function () {
            it("updates the def query on the pointLyr", function () {
                var value = 'blah';

                testWidget.onFilterChange(value);

                expect(testWidget.pointLyr.setDefinitionExpression).toHaveBeenCalledWith(
                    testWidget.fieldName + ' = ' + value);
            });
            it("doesn't clobber an existing def query", function () {
                testWidget.pointLyr.getDefinitionExpression = function () {
                    return 'blah';
                };

                testWidget.onFilterChange('blah');

                expect(testWidget.pointLyr.setDefinitionExpression).toHaveBeenCalledWith('blah AND fieldName = blah');

                testWidget.pointLyr.getDefinitionExpression = function () {
                    return 'blah AND fieldName = blah';
                };

                testWidget.onFilterChange('-1');

                expect(testWidget.pointLyr.setDefinitionExpression.calls[1].args[0]).toEqual('blah');

                testWidget.pointLyr.getDefinitionExpression = function () {
                    return 'fieldName = blah AND blah';
                };

                testWidget.onFilterChange('-1');

                expect(testWidget.pointLyr.setDefinitionExpression.calls[2].args[0]).toEqual('blah');
            });
            it("clears the def query if 'All' is selected", function () {
                testWidget.onFilterChange('-1');

                expect(testWidget.pointLyr.setDefinitionExpression).toHaveBeenCalledWith('');
            });
            it("handles more than two def queries", function () {
                testWidget.pointLyr.getDefinitionExpression = function () {
                    return 'blah1 AND blah2';
                };

                testWidget.onFilterChange('test');

                expect(testWidget.pointLyr.setDefinitionExpression).toHaveBeenCalledWith('blah1 AND blah2 AND fieldName = test');
            });
            it("published the FilterChange topic", function () {
                var fired = false;
                topic.subscribe(AGRC.topics.FilterChange, function () {
                    fired = true;
                });

                testWidget.onFilterChange('-1');

                expect(fired).toBe(true);
            });
        });
    });
});