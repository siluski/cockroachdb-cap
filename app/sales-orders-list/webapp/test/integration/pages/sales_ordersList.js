sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'salesorderslist',
            componentId: 'sales_ordersList',
            contextPath: '/sales_orders'
        },
        CustomPageDefinitions
    );
});