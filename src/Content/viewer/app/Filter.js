define([
    'dojo/_base/declare', 
    'dijit/_WidgetBase', 
    'dijit/_TemplatedMixin', 
    'dijit/_WidgetsInTemplateMixin',
    'dojo/text!app/templates/Filter.html',
    'agrc/modules/EsriLoader!esri/tasks/QueryTask',
    'dijit/form/FilteringSelect',
    'dojo/aspect',
    'dojo/_base/lang',
    'agrc/modules/EsriLoader!esri/tasks/query',
    'dojo/store/Memory',
    'dojo/_base/array',
    'dojo/string',
    'dojo/topic'

],

function (
    declare, 
    _WidgetBase, 
    _TemplatedMixin, 
    _WidgetsInTemplateMixin, 
    template,
    QueryTask,
    FilteringSelect,
    aspect,
    lang,
    Query,
    Memory,
    array,
    string,
    topic
    ) {
    // summary:
    //      Controls the filters for this app.
    return declare('app/Filter', 
        [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        widgetsInTemplate: true,
        templateString: template,
        baseClass: 'filter',

        // outFields: String[]
        //      The fields that we want back from the query task
        outFields: ['Code', 'Value'],

        // filteringSelect: dijit/form/FilteringSelect
        filteringSelect: null,

        // queryTemplate: String
        //      The string used to build the def query for this filter
        queryTemplate: '${0} = ${1}',


        // parameters passed in via the constructor

        // json: String
        //      json text of all of the data for the filtering select
        json: null,

        // name: String
        //      The label next to the drop down
        name: null,

        // pointLyr: esri/layers/ArcGISDynamicMapServiceLayer
        pointLyr: null,

        // fieldName: String
        //      The field that the def query will use
        fieldName: null,

        constructor: function () {
            console.log(this.declaredClass + "::constructor", arguments);
        },
        postCreate: function () {
            // summary:
            //      dom is ready
            console.log(this.declaredClass + "::postCreate", arguments);

            this.buildFilteringSelect();

            this.inherited(arguments);
        },
        buildFilteringSelect: function () {
            // summary:
            //      sets up the filtering select
            console.log(this.declaredClass + "::buildFilteringSelect", arguments);
        
            var that = this;    
            this.filteringSelect.set('store', new Memory({data: JSON.parse(this.json)}));

            this.filteringSelect.set('value', '-1');

            // do this after manually setting the value above
            // to prevent an extra call
            // have to do it async to make it work
            window.setTimeout(function () {
                that.own(aspect.after(that.filteringSelect, 'onChange', lang.hitch(that, that.onFilterChange), true));
            }, 0);
        },
        onFilterChange: function (newValue) {
            // summary:
            //      fires when the user changes the filtering select
            // newValue: Number
            //      The id of the object that was selected
            console.log(this.declaredClass + "::onFilterChange", arguments);

            var expression = (newValue !== '-1') ? 
                string.substitute(this.queryTemplate, [this.fieldName, newValue]) : '';
            var currentExpression = this.pointLyr.getDefinitionExpression();
            var and = ' AND ';
            var defs;
            var finalExpression = '';
            var that = this;

            if (currentExpression && currentExpression !== '') {
                if (currentExpression.indexOf(and) !== -1) {
                    defs = currentExpression.split(and);

                    array.forEach(defs, function(d) {
                        if (d.indexOf(that.fieldName) !== -1) {
                            d = expression;
                            if (d === '') {
                                return;
                            }
                        }
                        if (finalExpression === '') {
                            finalExpression = d;
                        } else {
                            finalExpression = finalExpression + and + d;
                        }
                    });

                    if (currentExpression.indexOf(this.fieldName) === -1) {
                        finalExpression = finalExpression + and + expression;
                    }
                } else {
                    if (currentExpression.indexOf(this.fieldName) !== -1) {
                        finalExpression = expression;
                    } else {
                        finalExpression = currentExpression + and + expression;
                    }
                }
            } else {
                finalExpression = expression;
            }
            this.pointLyr.setDefinitionExpression(finalExpression);
            console.log('finalExpression', finalExpression);

            topic.publish(AGRC.topics.FilterChange);
        }
    });
});