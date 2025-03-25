//These below lines will import the necessary packages we installed to our logic file, so we can utilize them.
const cds = require('@sap/cds');
const Sequelize = require('sequelize-cockroachdb');
const odataParse = require('odata-sequelize');
const cfenv = require('cfenv');

module.exports = async srv =>{

    //calls a custom connectToDB function we have defined here, returns a client connection we can use to communicate
    //with our CockroachDB cluster.
    const cockroachdb = connectToDB();
    //Calls a custom function which will define our sales orders object as a manifestation on the sales orders table 
    //in CockroachDB
    const sales_orders = defineSalesOrders(cockroachdb);

    //Event listener function for when we perform a READ request on our sales_orders entity in our 
    //OData service.
    srv.on('READ', 'sales_orders', async (req)=>{

        //If we have filter criteria in our OData request, we want to leverage these criteria in our get request to 
        //our CockroachDB.
        if(req._queryOptions != null){
                //If we have an orderid passed in the OData READ request, but the OData $filter query option isn't available
                //we need to add it.
                if(req.data.orderid != undefined){
                    req._queryOptions.$filter = `orderid eq ${req.data.orderid}`;
                }
                //We call a custom function to generate the OData request url (we don't have access to it in the req object),
                //this will then be translated via the sequelize-odata package into Sequelize query syntax.
                const odataReq = generateODataUrl(req._queryOptions);
                //Ensures that what is returned from the get request is the raw data, i.e. an array of JSON objects.
                odataReq.raw = true;
                const salesOrders = await sales_orders.findAll(odataReq).catch(err =>{
                    console.error("Error: ", err);
                });
                //When we define our Fiori Elements UI, Fiori elements requires the service layer to return a $count field,
                //which contains the number of records in the results of the READ request. If this isn't present,
                //no data will be present in the UI, even if records are returned.
                salesOrders.$count = salesOrders.length;
                return salesOrders;
            }else{
            //Fetch all the records from our sales orders table.
            const all_orders = await sales_orders.findAll({raw: true});
            all_orders.$count = all_orders.length;
            return all_orders;
        }
    });

    //Event listener for when we wish to delete a sales order.
    srv.on('DELETE', 'sales_orders', async (req) =>{
            //Get the id of the sales order we're looking to delete.
            const orderid = req.data.orderid;
            //Destroy is Sequelize's delete function, we call this with the necessary filter criteria.
            const salesOrder = await sales_orders.destroy({where: {orderid}, raw: true}).catch(err =>{
                console.error("Error: ", err);
            });

            return salesOrder;
    });

    //Event listener for when we create a new sales order.
    srv.on('CREATE', 'sales_orders', async (req) =>{
        //Get the fields from the CREATE request which details the elements of the sales order
        //we want to create.
        const new_order = req.data;

        //Create the sales order, and save it to the CockroachDB database.
        const created_order = await sales_orders.create({orderid: new_order.orderid, price: new_order.price, 
            productname: new_order.productname, country: new_order.country, buyer: new_order.buyer}).catch(err =>{
            console.error("Error: ", err);
        });
        return created_order;

    });

    //Event listener for when we want to update a sales order.
    srv.on('PUT', 'sales_orders', async (req) =>{
        //Get the details of the sales order in the request we want to update.
        const orderToUpdate = req.data;

        //Update the sales order with the values from the UPDATE request.
        const updatedOrder = await sales_orders.update({price: req.data.price, productname: orderToUpdate.productname,
            country: orderToUpdate.country, buyer: orderToUpdate.buyer
        },{
            where:{
                orderid: orderToUpdate.orderid
            }
        }).catch(err =>{
            console.error("Error: ", err);
        });

        //If no rows were modified in our update request, we log the error.
        if(updatedOrder === 0){
            console.error("Error: Updated Failed!");
        }
        
    });

    //Our custom function to connect to our CockroachDB cluster.
    function connectToDB(){
        //Use the cfenv library to get the details of our Cloud Foundry environment where our app is running within.
        const appEnv = cfenv.getAppEnv();
        //Get the connection string from our user defined service in the Cloud Foundry.
        const connectionString = appEnv.getServiceCreds('anthony-cockroachdb').host;
        //Create a new connection to our CockroachDB cluster using the connection string.
        const cockroachdb = new Sequelize(connectionString);

        return cockroachdb;
    }

    //Custom function for defining our sales orders object as a projection on our sales orders table in 
    //CockroachDB
    function defineSalesOrders(cockroachdb){
        const sales_orders_inventory = cockroachdb.define("sales_orders",{
            orderid:{
                type:Sequelize.DataTypes.INTEGER,
                primaryKey:true
            },
            price:{
                type:Sequelize.DataTypes.INTEGER
            },
            productname:{
                type:Sequelize.DataTypes.TEXT
            },
            country:{
                type:Sequelize.DataTypes.TEXT
            },
            buyer:{
                type:Sequelize.DataTypes.TEXT
            }
        }, 
        //If these fields aren't specified, will lead to your application expecting columns 'createdAt,' and, 'updatedAt.' 
        //Which we don't have, so we want to set these following paramters to false to avoid errors.
        {timestamps: false, 
            createdAt: false, 
            updatedAt: false});
        return sales_orders_inventory;

    }

    //Custom function for constructing the OData request URL.
    function generateODataUrl(queryOptions){
        let odataQuery = [];

        //We check to see if certain query options exist, and if so, we add them to the odataQuery array.
        //This is a handful of query options, you of course can add more.
        if(queryOptions.$filter != null){
            odataQuery.push(`$filter=${queryOptions.$filter}`);
        }
        if(queryOptions.$top != null){
            odataQuery.push(`$top=${queryOptions.$top}`);
        }
        if(queryOptions.$orderby != null){
            odataQuery.push(`$orderby=${queryOptions.$orderby}`);
        }
        if(queryOptions.$skip != null){
            odataQuery.push(`$skip=${queryOptions.$skip}`);
        }
        if(queryOptions.$count != null){
            odataQuery.push(`$count=${queryOptions.$count}`);
        }

        //convert the array to a string, and replace all comma separation with &.
        let finalOdataQuery = odataQuery.toString();
        finalOdataQuery = finalOdataQuery.replaceAll(",","&");

        //If there is a select query option, add it to the request string.
        if(queryOptions.$select != null){
            if(odataQuery.length > 0){
                finalOdataQuery = `$select=${queryOptions.$select}&`+finalOdataQuery;
            }else{
                finalOdataQuery=`$select=${queryOptions.$select}`;
            }
        }

        //Convert the OData request string into Sequelize query syntax, and return it.
        const sequelizeOdata = odataParse(finalOdataQuery, Sequelize);
        return sequelizeOdata;
    }

}
