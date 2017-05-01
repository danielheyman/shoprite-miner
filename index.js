const auth = '323dcc96-cd2d-e711-8708-d89d6763b1d9';


cal_goal = 1600;
prot_goal = 110;
cost_per_day = 10;
const variables = {
  'calories_for_calculations': 1600, // used to calculate goals and price per day
  'min': { 
    'prot': null, // at least this much protein for the cal above
    'carb': null, // at least this much carb for the cal above
    'fat': null, // at least this much fat for the cal above
    'sugar': null, // at least this much sugar for the cal above
    'vitamin_a': null, // at least this much vitamin a for the cal above
    'vitamin_c': null, // at least this much vitamin c for the cal above
    'calcium': null // at least this much calcium for the cal above
  },
  'max': {
    'iron': null, // maximum of iron for the cal above
    'prot': null, // maximum of protein for the cal above
    'carb': null, // maximum of carb for the cal above
    'fat': null, // maximum of fat for the cal above
    'sugar': null, // maximum of sugar for the cal above
    'vitamin_a': null, // maximum of vitamin a for the cal above
    'vitamin_c': null, // maximum of vitamin c for the cal above
    'calcium': null, // maximum of calcium for the cal above
    'iron': null // maximum of iron for the cal above
  },
  'cost_per_day': 10, // maximum cost per day to meet calories
  'ingredients_contain': [], // ex: meat to find all meat products
  'ingredients_dont_contain': [], // ex: meat, chicken, fish, pork, etc to find all veg products
  'on_sale': false, // only find products only on sale,
  'sort_by': 'price_per_day' // or prot, carb, fat, etc.
}

/*

Ex call for high protein:
post('localhost/hoboken', {calories_for_calculations: 1600, goals: { prot: 110 }, cost_per_day: 10})
*/

var express = require('express');
var app = express();
var bodyParser = require('body-parser'); 
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true }));
global.mongoose = require('mongoose');
var cacheOpts = {
    max:50,
    maxAge:1000*60*2
};
require('mongoose-cache').install(mongoose, cacheOpts)
mongoose.connect('mongodb://localhost/shoprite');
var request = require('request');
var async = require('async');
var fs = require('fs');
var beginningOfDay = new Date(new Date().toJSON().slice(0,10).replace(/-/g,'/'));


var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log('connected to db');
    console.log('loading products');
    Product.find({aisle: {$nin: ['2', '3', '4', '5', '6', '13', '14', '15']}}).select('brand name current_price size sku').populate('nutrition', 'ingredients protein carb fat calories serving_count').populate('nutritionNDB', 'ingredients Protein "Carbohydrate, by difference" "Total lipid (fat)" Energy eq_gram unit_type unit').cache().exec(function(err, prods) {
      console.log('loaded products');
    });
});


Store = require('./models/Store');
Category = require('./models/Category');
Nutrition = require('./models/Nutrition');
NutritionNDB = require('./models/NutritionNDB');
Product = require('./models/Product');

var options = function(url) { 
    return {
        url: url,
        headers: { 'Authorization': auth }
    };
};


app.post('/hoboken', function(req, res) {
    var param = Object.assign({}, variables, JSON.parse(req.body.variables))
    
    Product.find({aisle: {$nin: ['2', '3', '4', '5', '6', '13', '14', '15']}}).select('brand name current_price size sku').populate('nutrition', 'ingredients protein carb fat calories serving_count').populate('nutritionNDB', 'ingredients Protein "Carbohydrate, by difference" "Total lipid (fat)" Energy eq_gram unit_type unit').cache().exec(function(err, prods) {
        if(err) return console.log(err);
        
        console.log('found items: ' + prods.length);
        
        prods = prods.map(function(prod) {
            prod = prod.toJSON();
            if(prod.current_price.indexOf('for') > -1) {
                var forSplit = prod.current_price.split("for");
                prod.current_price = Number(forSplit[1].replace(/[^0-9\.]+/g,"")) / Number(forSplit[0].replace(/[^0-9\.]+/g,""));
            }
            else prod.current_price = Number(prod.current_price.replace(/[^0-9\.]+/g,""));
            
            if(prod.nutritionNDB && prod.nutritionNDB.Energy && prod.size && prod.size.indexOf('oz') > -1) {
                if(prod.nutritionNDB.unit_type == 'fl oz') prod.nutritionNDB.serving_count =  Number(prod.size.replace(/[^0-9\.]+/g,"")) / (prod.nutritionNDB.unit);
                else prod.nutritionNDB.serving_count = Number(prod.size.replace(/[^0-9\.]+/g,"")) / (prod.nutritionNDB.eq_gram * 0.035274);
                prod.nutritionNDB.serving_count = Math.round(prod.nutritionNDB.serving_count);
                
                return {
                    name: prod.brand + ': ' + prod.name,
                    sku: prod.sku,
                    ingredients: prod.nutritionNDB.ingredients.join(','),
                    cost_per_day: (param.calories_for_calculations / Math.round(prod.nutritionNDB.Energy * prod.nutritionNDB.serving_count / prod.current_price)).toFixed(2),
                    protein_calorie_ratio: Math.round(prod.nutritionNDB.Protein * 4 / prod.nutritionNDB.Energy * 100),
                    carb_calorie_ratio: Math.round(prod.nutritionNDB["Carbohydrate, by difference"] * 4 / prod.nutritionNDB.Energy * 100),
                    far_calorie_ratio: Math.round(prod.nutritionNDB["Total lipid (fat)"] * 4 / prod.nutritionNDB.Energy * 100)
                };
            }
            else if(prod.nutrition && prod.nutrition.calories) {
                if(!prod.nutrition.serving_count) prod.nutrition.serving_count = 1;
                return {
                    name: prod.brand + ': ' + prod.name,
                    sku: prod.sku,
                    ingredients: prod.nutrition.ingredients.join(','),
                    cost_per_day: (param.calories_for_calculations / Math.round(prod.nutrition.calories * prod.nutrition.serving_count / prod.current_price)).toFixed(2),
                    protein_calorie_ratio: Math.round(prod.nutrition.protein * 4 / prod.nutrition.calories * 100),
                    carb_calorie_ratio: Math.round(prod.nutrition.carb * 4 / prod.nutrition.calories * 100),
                    fat_calorie_ratio: Math.round(prod.nutrition.fat * 4 / prod.nutrition.calories * 100)
                };
            }
            
            return null;
        }).filter(prod => prod);
        
        console.log('found with nutrition: ' + prods.length);
        
        prods = prods.filter(function(prod) { 
            // Filter mins
            if(param.min.prot && (!prod.protein_calorie_ratio || prod.protein_calorie_ratio < param.min.prot * 4 / param.calories_for_calculations * 100)) return false;
            if(param.min.carb && (!prod.carb_calorie_ratio || prod.carb_calorie_ratio < param.min.carb * 4 / param.calories_for_calculations * 100)) return false;
            if(param.min.fat && (!prod.fat_calorie_ratio || prod.fat_calorie_ratio < param.min.fat * 4 / param.calories_for_calculations * 100)) return false;


            // Filter maxs
            if(param.max.prot && prod.protein_calorie_ratio >= param.max.prot * 4 / param.calories_for_calculations * 100) return false;
            if(param.max.carb && prod.carb_calorie_ratio >= param.max.carb * 4 / param.calories_for_calculations * 100) return false;
            if(param.max.fat && prod.fat_calorie_ratio >= param.max.fat * 4 / param.calories_for_calculations * 100) return false;
            
            // Filter cost per day
            if(prod.cost_per_day > param.cost_per_day) return false;
            
            for(var i = 0; i < param.ingredients_contain.length; i++) {
              if(prod.name.toLowerCase().indexOf(param.ingredients_contain[i].toLowerCase()) === -1) return false;
              if(prod.ingredients.toLowerCase().indexOf(param.ingredients_contain[i].toLowerCase()) === -1) return false;
            }
            
            for(var i = 0; i < param.ingredients_dont_contain.length; i++) {
              if(prod.name.toLowerCase().indexOf(param.ingredients_dont_contain[i].toLowerCase()) !== -1) return false;
              if(prod.ingredients.toLowerCase().indexOf(param.ingredients_dont_contain[i].toLowerCase()) !== -1) return false;
            }
            
            return true;
        }).map(function(prod) {
          delete prod.ingredients;
          return prod;
        });
        
        prods.sort(function(a, b) {
            // sort by dollar/1600cal
            return a.cost_per_day - b.cost_per_day;
            
            // sort by protein:cal
            //return b.protein_calorie_ratio - a.protein_calorie_ratio;
        });
        
        res.send(prods);
    });
});

app.get('/nutrition/scrape', function(req, res) {
    Product.find({aisle: {$nin: ['2', '3', '4', '5', '6', '13', '14', '15']}}, function(err, products) {
        async.eachOfLimit(products, 30, function(product, key, callback) {
            findNutrition(product.sku);
            NutritionNDB.findOne({sku: product.sku}, function(err, nutrition) {
                if(err || nutrition) return callback();
                
                request('https://ndb.nal.usda.gov/ndb/search/list?qlookup=' + product.sku, function(error, response, body) {
                    if (error || response.statusCode !== 200) return console.log('err:' +  error);
                    
                    if(body.indexOf("Click to view reports for this food") === -1) {
                        NutritionNDB.create({sku: product.sku}, function (err, n) {
                            if(err) return;
                            console.log('created nutrition');
                        });
                        return callback();
                    }
                    var id = body.split("/ndb/foods/show/")[1].split("?")[0];
                    request('https://ndb.nal.usda.gov/ndb/foods/show/' + id + '?format=Abridged&reportfmt=csv&Qv=1', function(error, response, body) {
                        if (error || response.statusCode !== 200) return console.log('err:' +  error);
                        var obj = {
                            sku: product.sku,
                            ndb_url: Number(id)
                        };
                        var match = /for: (\d+), ([\S ]+), UPC[\S\s]+?Unit,"([.\d]+) ([\S ]+) = ([.\d]+)g/g;
                        if((m = match.exec(body)) !== null) {
                            obj.ndb_id = Number(m[1]); 
                            obj.name = m[2].toLowerCase(); 
                            obj.unit = Number(m[3]); 
                            obj.unit_type = m[4]; 
                            obj.eq_gram = Number(m[5]);
                            
                            match = /Ingredients\s"([\S\s]+?)\.{0,1}"/g;
                            if((m = match.exec(body)) !== null) {
                                obj.ingredients = m[1].toLowerCase().split(", "); 
                            }
                            
                            match = /"([\S ]+)",\w+,([\d.]+),[\d.]+/g;
                            while((m = match.exec(body)) !== null) {
                                obj[m[1]] = Number(m[2]);
                            }
                        }
                        
                        NutritionNDB.create(obj, function (err, n) {
                            if(err) return;
                            console.log('created nutrition');
                        });
                        
                        return callback();
                    });
                });
            });
        }, function() {
            console.log('done');
            res.send('done');
        });
    });
});

app.get('/hoboken/update', function(req, res) {
    Store.findOne({name: 'Hoboken'}, function(err, store) {
        if(err || !store) return console.log(err);
        
        async.series([
            function(callback) {
                fs.readFile('last_updated.json', "utf8", function(err, data) {
                    if (err) data = {};
                    else data = JSON.parse(data);
                    
                    if(data.hasOwnProperty('hoboken') && data.hoboken == beginningOfDay.getTime()) {
                        console.log('updated deals today');
                        return callback();
                    }

                    var url = "https://shop.shoprite.com/api/product/v5/categories/store/" + store.shoprite_id + "/special";
                    request(options(url), function (error, response, body) {
                        if (error || response.statusCode !== 200) {
                            console.log(err);
                            return callback();
                        }
                        
                        async.eachOfLimit(JSON.parse(body), 30, function(cat, key, cb) {
                            console.log('Updating category: ' + cat.Id);
                            findProduct(store.shoprite_id, cat.Id, 0, function() {
                                console.log('Finished category: ' + cat.Id);
                                cb();
                            });
                        }, function() {
                            data.hoboken = beginningOfDay.getTime();
                            fs.writeFileSync('last_updated.json', JSON.stringify(data));

                            console.log('Finished updating categories');
                            callback();
                        });
                    });
                    
                });
            }, 
            function(callback) {
                Product.find({store: store.shoprite_id, regular_price: {$ne: ""}, $or: [{sale_until: null}, {sale_until: {$lt: beginningOfDay}}]}, function(err, prods) {
                    if(err || !prods) return callback();
                    
                    console.log('Updating ' + prods.length + ' expired products.');
                    
                    var count = 1;
                    
                    async.eachOfLimit(prods, 50, function(prod, index, callback) {
                        var url = "https://shop.shoprite.com/api/product/v5/product/store/" + store.shoprite_id + "/sku/" + prod.sku;
                        
                        request(options(url), function (error, response, body) {
                            if (error) {
                                console.log('err: ' + error);
                                return callback();
                            }
                            if (response.statusCode != 200) {
                                console.log('err: ' + response.statusCode);
                                return callback();
                            }
                            
                            var item = JSON.parse(body);
                            
                            prod.current_price = item.CurrentPrice;
                            prod.current_unit_price = item.CurrentUnitPrice;
                            prod.regular_price = item.RegularPrice;
                            if(item.Sale && item.Sale.DateText && item.Sale.DateText.indexOf('until') > -1) {
                                prod.sale_until = new Date(item.Sale.DateText.split('until ')[1]);
                            } else {
                                prod.sale_until = null;
                            }

                            prod.save();
                            console.log("updated " + count++);
                            callback();
                        });
                    }, function() {
                        console.log('Finished updating expired products');
                        callback();
                    });
                });
            }
        ], function() {
            res.send('done');
        });
    });
});

app.get('/hoboken/rescrape', function (req, res) {
    Store.findOne({name: 'Hoboken'}, function(err, store) {
        if(err) return console.log(err);
        if(store) return findCategory(store.shoprite_id, null, store.name + ' Store');
        
        Store.create({ name: 'Hoboken', shoprite_id: '7EF2370'}, function (err, store) {
            console.log('created store');
            findCategory(store.shoprite_id, null, store.name +  ' Store');
        });
    });
    res.send('parsing');
});

function findCategory(store, category_id, name) {
    Category.findOne({store: store, category_id: category_id}, function(err, category) {
        if(err) return console.log(err);
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
        if(cat.has_products) findProduct(category.store, cat.category_id, 0);
    });
}

function findProduct(store, category_id, skip, cb) {
    var url = 'https://shop.shoprite.com/api/product/v5/products/category/' + category_id + '/store/' + store + '?take=20&skip=' + skip;
    
    request(options(url), function (error, response, body) {
        if (error || response.statusCode != 200) {
            if(cb) cb();
            return;
        }
        
        var product = JSON.parse(body);
        
        console.log('found products');
        
        product.Items.forEach(function(item) {
            prod = {
                store: store, 
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
            if(item.Sale && item.Sale.DateText && item.Sale.DateText.indexOf('until') > -1) {
                prod.sale_until = new Date(item.Sale.DateText.split('until ')[1]);
            } else {
                prod.sale_until = null;
            }
            
            Product.update({sku: prod.sku}, prod, {upsert: true}, function (err, prod) {
                if(err) return;
            });
            
            findNutrition(prod.sku);
        });
        
        
        if(product.ItemCount > skip + 20) {
            findProduct(store, category_id, skip + 20, cb);
        } else {
            if(cb) cb();
        }
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
