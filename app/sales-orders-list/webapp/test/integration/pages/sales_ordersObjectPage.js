sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'salesorderslist',
            componentId: 'sales_ordersObjectPage',
            contextPath: '/sales_orders'
        },
        CustomPageDefinitions
    );
});