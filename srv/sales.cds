service sales_service{
    entity sales_orders{
        key orderid: Integer;
        price: Integer;
        productname: String;
        country: String;
        buyer: String;
        // createdAt: Date;
        // updatedAt: Date;
    };

    //annotate sales_orders with @odata.draft.enabled;
};