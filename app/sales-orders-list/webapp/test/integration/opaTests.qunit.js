sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'salesorderslist/test/integration/FirstJourney',
		'salesorderslist/test/integration/pages/sales_ordersList',
		'salesorderslist/test/integration/pages/sales_ordersObjectPage'
    ],
    function(JourneyRunner, opaJourney, sales_ordersList, sales_ordersObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('salesorderslist') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onThesales_ordersList: sales_ordersList,
					onThesales_ordersObjectPage: sales_ordersObjectPage
                }
            },
            opaJourney.run
        );
    }
);