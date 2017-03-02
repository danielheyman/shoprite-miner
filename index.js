const auth = 'a0642d37-61fd-e611-8708-d89d6763b1d9';


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


Store = require('./models/Store');
Category = require('./models/Category');
Nutrition = require('./models/Nutrition');
Product = require('./models/Product');

app.get('/', function(req, res) {
    Product.find({}).select('brand name current_price sku').populate('nutrition', 'protein calories serving_count').exec(function(err, prods) {
        if(err) return console.log(err);
        
        prods = prods.map(function(prod) {
            prod = prod.toJSON();
            prod.current_price = Number(prod.current_price.replace(/[^0-9\.]+/g,""));
            if(prod.nutriton && !prod.nutriton.serving_count) prod.nutriton.serving_count = 1;
            return prod;
        });
        
        exists = {};
        
        prods = prods.filter(function(prod) { 
            if(exists[prod.sku]) return false;
            exists[prod.sku] = true;
            
            return prod.nutrition &&
            (prod.nutrition.protein / prod.nutrition.calories > 150 / 2000) &&  // 150/1600 protein:cal ratio
            (prod.nutrition.protein * 4 / prod.nutrition.calories <= 1) &&  // protein !> cal
            prod.nutrition.protein * prod.nutrition.serving_count / prod.current_price > 30; // 20g protein / dollar
        });
        
        prods.sort(function(a, b) {
            // sort by protein/dollar
            //b_value = b.nutrition.protein * b.nutrition.serving_count / b.current_price;
            //a_value = a.nutrition.protein * a.nutrition.serving_count / a.current_price;
            
            // sort by protein:cal
            b_value = b.nutrition.protein / b.nutrition.calories;
            a_value = a.nutrition.protein / a.nutrition.calories;
            return b_value - a_value;
        });
        
        res.send(prods.map(function(prod) {
            return {
                name: prod.brand + ': ' + prod.name,
                sku: prod.sku,
                current_price: prod.current_price,
                protein_per_dollar: Math.round(prod.nutrition.protein * prod.nutrition.serving_count / prod.current_price),
                protein_calorie_ratio: Math.round(prod.nutrition.protein * 4 / prod.nutrition.calories * 100) + "%"
            };
        }));
    });
});

app.get('/hoboken', function (req, res) {
    Store.findOne({name: 'Hoboken'}, function(err, store) {
        if(err) console.log(err);
        if(store) return findCategory(store.shoprite_id, null, store.name + ' Store');
        
        Store.create({ name: 'Hoboken', shoprite_id: '7EF2370'}, function (err, store) {
            console.log('created store');
            findCategory(store.shoprite_id, null, store.name +  ' Store');
        });
    });
    res.send('parsing');
});

var options = function(url) { 
    return {
        url: url,
        headers: { 'Authorization': auth }
    };
};

function findCategory(store, category_id, name) {
    Category.findOne({store: store, category_id: category_id}, function(err, category) {
        if(err) console.log(err);
        if(category) return findCategoryTree(category); 
        
        var url = (!category_id) ? 'https://shop.shoprite.com/api/product/v5/categories/store/' + store :
            'https://shop.shoprite.com/api/product/v5/category/' + category_id + '/store/' + store + '/categories';
        
        request(options(url), function (error, response, body) {
            if (error || response.statusCode != 200) return;
            
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
        });
    });
}

function findCategoryTree(category) {
    category.categories.forEach(function(cat) {
        if(cat.has_subcategories) findCategory(category.store, cat.category_id, cat.name);
        if(cat.has_products) findProduct(category.store, cat.category_id, cat.name, 0);
    });
}

function findProduct(store, category_id, category_name, skip) {
    Product.find({store: store, category_id: category_id}, function(err, prods) {
        if(err) return;
        
        var url = 'https://shop.shoprite.com/api/product/v5/products/category/' + category_id + '/store/' + store + '?take=20&skip=' + skip;
        
        request(options(url), function (error, response, body) {
            if (error || response.statusCode != 200) return;
            
            var product = JSON.parse(body);
            
            if(prods.length >= product.ItemCount) {
                prods.forEach(function(prod) {
                    findNutrition(prod.sku);
                });
                return;
            }
            
            product.Items.forEach(function(item) {
                prod = {
                    store: store, 
                    category_id: category_id, 
                    category_name: category_name,
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
                
                Product.create(prod, function (err, prod) {
                    if(err) return;
                    console.log('created product');
                });
                
                findNutrition(prod.sku);
            });
            
            
            if(product.ItemCount > skip + 20) {
                findProduct(store, category_id, category_name, skip + 20);
            }
        });
    });
}

function findNutrition(sku) {
    Nutrition.findOne({sku: sku}, function(err, nutrition) {
        if(err) console.log(err);
        if(nutrition) return; 
        
        var url = "http://www.shoprite.com/pd/-/-/-/" + sku + "/";
    
        request(url, function (error, response, body) {
            if (error || response.statusCode != 200) return;
            
            var search = {
                serving_size: /Serving Size (.*?)<\/b>/g,
                serving_count: /Servings Per Container (\d+)/g,
                calories: /Calories<\/b> (\d+)/g,
                calories_from_fat: /Calories from Fat (\d+)/g,
                fat: /Total Fat<\/b> (\d+)g/g,
                saturated_fat: /Saturated Fat (\d+)g/g,
                polyunsaturated_fat: /Polyunsaturated Fat (\d+)g/g,
                monounsaturated_fat: /Monounsaturated Fat (\d+)g/g,
                trans_fat: /Trans<\/i> Fat (\d+)g/g,
                cholesterol: /Cholesterol<\/b> (\d+)mg/g,
                sodium: /Sodium<\/b> (\d+)mg/g,
                carb: /Carbohydrate<\/b> (\d+)g/g,
                dietary_fiber: /Dietary Fiber (\d+)g/g,
                sugar: /Sugars (\d+)g/g,
                protein: /Protein<\/b> (\d+)g/g,
                vitamin_a: /Vitamin A.*?(\d+)%/g,
                vitamin_c: /Vitamin C.*?(\d+)%/g,
                vitamin_d: /Vitamin D.*?(\d+)%/g,
                calcium: /Calcium.*?(\d+)%/g,
                iron: /Iron.*?(\d+)%/g,
                ingredients: /Ingredients<\/h1>[\s]*<p>([\s\S]*?)</g,
                directions: /Directions<\/h1>[\s]*<p>([\s\S]*?)</g
            };
            
            var obj = {
                sku: sku
            };
            
            Object.keys(search).forEach(function(key) {
                var match = search[key].exec(body);
                if(match) obj[key] = match[1];
            });
            
            if(obj.ingredients) obj.ingredients = obj.ingredients.split(",");
            
            Nutrition.create(obj, function (err, prod) {
                if(err) return;
                console.log('created nutrition');
            });
        });
    });
}

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});
