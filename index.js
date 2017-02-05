var express = require('express');
var app = express();
global.mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/shoprite');
var request = require('request');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log('connected to db');
});


Store = require('./storeSchema');
Category = require('./categorySchema');
Product = require('./productSchema');

app.get('/', function (req, res) {
    Store.findOne({name: 'Hoboken'}, function(err, store) {
        if(err) console.log(err);
        if(!store) {
            Store.create({ name: 'Hoboken', shoprite_id: '7EF2370'}, function (err, store) {
                console.log('created store');
                findCategory(store.shoprite_id, null, store.name +  ' Store');
            });
            return;
        }
        findCategory(store.shoprite_id, null, store.name + ' Store');
    });
    res.send('parsing');
});

function findCategory(store, category_id, name) {
    Category.findOne({store: store, category_id: category_id}, function(err, category) {
        if(err) console.log(err);
        if(!category) {
            var options = {
                url: '',
                headers: {
                    'Authorization': '8e481e62-efea-e611-8708-d89d6763b1d9'
                }
            };
            if(!category_id) options.url = 'https://shop.shoprite.com/api/product/v5/categories/store/' + store;
            else options.url = 'https://shop.shoprite.com/api/product/v5/category/' + category_id + '/store/' + store + '/categories';
            
            request(options, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var categories = JSON.parse(body);
                    var cat = {store: store, category_id: category_id, name: name, categories: []};
                    categories.forEach(function(category) {
                        child_cat = {category_id: category.Id, name: category.Name};
                        category.Links.forEach(function(link) {
                            if(link.Rel == 'subcategories') child_cat.has_subcategories = true;
                            else if(link.Rel == 'products') child_cat.has_products = true;
                        });
                        cat.categories.push(child_cat);
                    });
                    Category.create(cat, function (err, category) {
                        if(err) return;
                        console.log('created category');
                        findCategoryTree(category);
                    });
                }
            });
            
            return;
        }
        findCategoryTree(category);
    });
}

function findCategoryTree(category) {
    category.categories.forEach(function(cat) {
        if(cat.has_subcategories) findCategory(category.store, cat.category_id, cat.name);
        if(cat.has_products) findProduct(category.store, cat.category_id, cat.name, 0);
    });
}

function findProduct(store, category_id, category_name, skip) {
    Product.findOne({store: store, category_id: category_id, skip: skip}, function(err, product) {
        if(err) console.log(err);
        if(!product) {
            var options = {
                url: 'https://shop.shoprite.com/api/product/v5/products/category/' + category_id + '/store/' + store + '?take=20&skip=' + skip,
                headers: {
                    'Authorization': '8e481e62-efea-e611-8708-d89d6763b1d9'
                }
            };
            
            request(options, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var product = JSON.parse(body);
                    var prod = {store: store, category_id: category_id, category_name: category_name, item_count: product.ItemCount, skip_count: skip, items: []};
                    
                    product.Items.forEach(function(item) {
                        item = {
                            aisle: item.Aisle,
                            brand: item.Brand,
                            current_price: item.CurrentPrice,
                            current_unit_price: item.CurrentUnitPrice,
                            description: item.Description,
                            id: item.Id,
                            item_type: item.ItemType,
                            name: item.Name,
                            regular_price: item.RegularPrice,
                            size: item.Size,
                            sku: item.Sku
                        };
                        prod.items.push(item);
                    });
                    Product.create(prod, function (err, prod) {
                        if(err) return;
                        if(err) exit();
                        console.log('created product');
                    });
                    if(prod.item_count > skip + 20) {
                        findProduct(store, category_id, category_name, skip + 20);
                    }
                }
            });
            
            return;
        }
    });
}

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});
