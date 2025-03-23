const cds = require('@sap/cds');
const Sequelize = require('sequelize-cockroachdb');
const odataParse = require('odata-sequelize');

module.exports = async srv =>{

    const cockroachdb = connectToDB();
    const sales_orders = defineSalesOrders(cockroachdb);

    srv.on('READ', 'sales_orders', async (req)=>{


        if(req._queryOptions != null){
                const odataReq = generateODataUrl(req._queryOptions);
                odataReq.raw = true;
                const salesOrders = await sales_orders.findAll(odataReq).catch(err =>{
                    console.error("Error: ", err);
                });
                salesOrders.$count = salesOrders.length;
                return salesOrders;
            }else{
            const all_orders = await sales_orders.findAll({raw: true});
            all_orders.$count = all_orders.length;
            return all_orders;
        }
    });


    srv.on('DELETE', 'sales_orders', async (req) =>{

            const orderid = req.data.orderid;
            const salesOrder = await sales_orders.destroy({where: {orderid}, raw: true}).catch(err =>{
                console.error("Error: ", err);
            });

            return salesOrder;
    });


    srv.on('CREATE', 'sales_orders', async (req) =>{
        const new_order = req.data;

        const created_order = await sales_orders.create({orderid: new_order.orderid, price: new_order.price, 
            productname: new_order.productname, country: new_order.country, buyer: new_order.buyer}).catch(err =>{
            console.error("Error: ", err);
        });

        return created_order;

    });

    srv.on('PUT', 'sales_orders', async (req) =>{
        const orderToUpdate = req.data;

        const updatedOrder = await sales_orders.update({price: req.data.price, productname: orderToUpdate.productname,
            country: orderToUpdate.country, buyer: orderToUpdate.buyer
        },{
            where:{
                orderid: orderToUpdate.orderid
            }
        }).catch(err =>{
            console.error("Error: ", err);
        });
        
        if(updatedOrder === 0){
            console.error("Error: Updated Failed!");
        }
        
    });

    function connectToDB(){
        const connectionString = "";

        const cockroachdb = new Sequelize(connectionString);
        // await cockroachdb.authenticate().then(()=>{
        //     console.log('Connected');
        // }).catch(err =>{
        //     console.error('Unable to connect:', err);
        // });

        return cockroachdb;
    }

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
        {timestamps: false, 
            createdAt: false, 
            updatedAt: false});
        return sales_orders_inventory;

    }

    function generateODataUrl(queryOptions){
        let odataQuery = [];
        console.log(queryOptions);

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

        let finalOdataQuery = odataQuery.toString();
        finalOdataQuery = finalOdataQuery.replaceAll(",","&");
        if(queryOptions.$select != null){
            if(odataQuery.len > 0){
                finalOdataQuery = `$select=${queryOptions.$select}&`+finalOdataQuery;
            }else{
                finalOdataQuery=`$select=${queryOptions.$select}`;
            }
        }
        console.log(finalOdataQuery);
        const sequelizeOdata = odataParse(finalOdataQuery, Sequelize);
        return sequelizeOdata;
    }

}
