# Possible parameters

```
{
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
```

# Example Call

```
var request = require("request");

var options = { method: 'POST',
  url: 'http://127.0.0.1:3000/hoboken',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  form: { variables: 
      '{  
          "calories_for_calculations": 1600,
          "min": {
              "prot": 110
           },
           "cost_per_day": 3,
           "ingredients_dont_contain": ["beans"]
        }' 
    } 
};

request(options, function (error, response, body) {
  if (error) throw new Error(error);

  console.log(body);
});
```

# Example Response

```
[
  {
    "name": "MET-Rx: Big 100 Colossal Meal Replacement Bar",
    "sku": "786560181402",
    "cost_per_day": "0.79",
    "protein_calorie_ratio": 29,
    "carb_calorie_ratio": 46,
    "fat_calorie_ratio": 11
  },
  {
    "name": "Atkins: Chocolate Peanut Butter Bar - Advantage",
    "sku": "637480021012",
    "cost_per_day": "0.82",
    "protein_calorie_ratio": 30,
    "carb_calorie_ratio": 37,
    "fat_calorie_ratio": 20
  },
  {
    "name": "Goya: Red Lentils",
    "sku": "041331024969",
    "cost_per_day": "1.59",
    "protein_calorie_ratio": 28,
    "carb_calorie_ratio": null,
    "far_calorie_ratio": null
  },
  {
    "name": "Goya: Pardina Lentils",
    "sku": "041331025010",
    "cost_per_day": "1.89",
    "protein_calorie_ratio": 28,
    "carb_calorie_ratio": null,
    "far_calorie_ratio": null
  },
  {
    "name": "ShopRite: Eggs - Large White",
    "sku": "041190459179",
    "cost_per_day": "2.28",
    "protein_calorie_ratio": 40,
    "carb_calorie_ratio": 6,
    "fat_calorie_ratio": null
  },
  {
    "name": "Goya: Blackeye Peas",
    "sku": "041331024747",
    "cost_per_day": "2.50",
    "protein_calorie_ratio": 40,
    "carb_calorie_ratio": 102,
    "fat_calorie_ratio": 0
  },
  {
    "name": "Jack Rabbit: Blackeyed Peas",
    "sku": "070620001176",
    "cost_per_day": "2.50",
    "protein_calorie_ratio": 40,
    "carb_calorie_ratio": null,
    "far_calorie_ratio": null
  },
  {
    "name": "ShopRite: Large White Eggs",
    "sku": "041190455614",
    "cost_per_day": "2.53",
    "protein_calorie_ratio": 34,
    "carb_calorie_ratio": 0,
    "fat_calorie_ratio": 29
  },
  {
    "name": "Hodgson Mill: Untoasted Wheat Germ",
    "sku": "071518010201",
    "cost_per_day": "2.77",
    "protein_calorie_ratio": 29,
    "carb_calorie_ratio": null,
    "far_calorie_ratio": null
  },
  {
    "name": "Perdue: Oven Ready Whole Seasoned Roaster",
    "sku": "072745008580",
    "cost_per_day": "2.84",
    "protein_calorie_ratio": 30,
    "carb_calorie_ratio": null,
    "far_calorie_ratio": null
  },
  {
    "name": "Goya: Lentil",
    "sku": "041331024761",
    "cost_per_day": "2.93",
    "protein_calorie_ratio": 46,
    "carb_calorie_ratio": 109,
    "fat_calorie_ratio": 0
  },
  {
    "name": "Shady Brook Farms: Turkey Breast",
    "sku": "205271000005",
    "cost_per_day": "NaN",
    "protein_calorie_ratio": 56,
    "carb_calorie_ratio": 0,
    "fat_calorie_ratio": 18
  }
]
```
