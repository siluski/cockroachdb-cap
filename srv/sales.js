const cds = require('@sap/cds');
const Sequelize = require('sequelize-cockroachdb');

module.exports = async srv =>{

    const cockroachdb = connectToDB();
    const sales_orders = defineSalesOrders(cockroachdb);

    srv.on('READ', 'sales_orders', async (req)=>{
        

        if(req._queryOptions != null){
            const orderQuery = req._queryOptions;
            const query = orderQuery.$filter.trim();
            const orderid = query.charAt(query.length -1);
            const salesOrder = await sales_orders.findOne({where: {orderid}, raw: true}).catch(err =>{
                console.error("Error: ", err);
            });
            return salesOrder;


        }else{
            const all_orders = await sales_orders.findAll({raw: true});
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
        //console.log(req);
        const new_order = req.data;

        const created_order = await sales_orders.create({orderid: new_order.orderid, price: new_order.price, productname: new_order.productname, country: new_order.country, buyer: new_order.buyer}).catch(err =>{
            console.error("Error: ", err);
        });

        return created_order;

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
        //console.log(cockroachdb);
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
            cratedAt: false, 
            updatedAt: false});
        return sales_orders_inventory;

    }

}