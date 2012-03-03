(function()
{
   var Rules = function(param, rules)
   {
      this.param = param;
      this.rules = rules;
   };
   
   Rules.prototype.Error = function(message, rule, value)
   {
      switch(typeof(this.rules.error))
      {
         case 'string':
            message = this.rules.error;
            break;
   
         case 'object':
   
            if(this.rules.error[rule])
            {
               message = this.rules.error[rule];
            }
            else if(this.rules.error['default'])
            {
               message = this.rules.error['default'];
            }
   
            break;
      }
   
      if(_.isString(value))
         message = message.replace(/%v/, value.toString());
         
      if(_.isString(rule))
         message = message.replace(/%r/, rule);
   
      return message.replace(/%p/, this.param).replace(/%v/, "value").replace(/%r/, "rule");
   };
   
   Rules.prototype.apply = function(value)
   {
      if(_.isEmpty(value) && !_.isUndefined(this.rules['default']))
      {
         value = this.rules['default'];
      }
   
      if(this.rules.required)
      {
         if(this.rules.required && _.isUndefined(value))
         {
            throw this.Error("%p is a required parameter", "required", value);
         }
      }
      // if value is not required and is undefined, no more rules need to be run
      else if(_.isUndefined(value))
         return value;
   
      if(this.rules.filters)
      {
         value = this.filter(value);
      }
   
      if(this.rules.type)
      {
         if(typeof(this.rules.type) == "string" && typeof(is[this.rules.type]) == "function")
         {
            if(!is[this.rules.type](value))
               throw this.Error("%p is not a " + this.rules.type, "type", value);
         }
         else if(typeof(this.rules.type == "function"))
         {
            if(!this.rules.type(value))
               throw this.Error("%p is not a valid type", "type", value);
         }
         else
         {
            throw this.Error("%p is not a valid type", "type", value);
         }
      }
   
      if(this.rules.properties)
      {
         this.check(value);
      }
   
      return value;
   };
   
   Rules.prototype.filter = function(value)
   {
      switch(typeof(this.rules.filters))
      {
         case 'function':
            value = this.rules.filters(value);
            break;
   
         case 'string':
   
            if(typeof(filters[this.rules.filters]) === 'function')
            {
               value = filters[this.rules.filters](value);
            }
   
            break;
   
         case 'object':
   
            if(_.isArray(this.rules.filters))
            {
               this.rules.filters.forEach(function(filter) { value = filters[filter](value); });
            }
   
            break;
      }
   
      return value;
   };
   
   Rules.prototype.check = function(value)
   {
      switch(typeof(this.rules.properties))
      {
         case 'function':
   
            if(!this.rules.properties(value))
               throw this.Error("%p is not valid");
   
            break;
   
         case 'object':
            
            var properties = _.keys(this.rules.properties);
   
            for(var i = 0; i < properties.length; i++)
            {
               var property = properties[i];
   
               if(typeof(checks[property]) === "function")
               {
                  var args = this.rules.properties[property];
   
                  if(!checks[property].apply(null, [value, args]))
                     throw this.Error("%p failed %r with %v", property);
               }
               else if(typeof(this.rules.properties[property]) === "function")
               {
                  if(!this.rules.properties[property].apply(null, [value]))
                     throw this.Error("%p failed on %r with %v", property);
               }
            }
   
            break;
      }
   };
   
   var checks = 
   {
      'max': function(value, length)
      {
         if(_.isArray(value) || typeof(value) == "string")
         {
            return value.length <= length;
         }
         else if(typeof(value) == "number")
         {
            return value <= length;
         }
         else
         {
            return false;
         }
      },
   
      'min': function(value, length)
      {
         if(_.isArray(value) || typeof(value) == "string")
         {
            return value.length >= length;
         }
         else if(typeof(value) == "number")
         {
            return value >= length;
         }
         else
         {
            return false;
         }
      },
   
      'regex': function(value, regex)
      {
         return regex.test(value);
      },
   
      'in': function(value, list)
      {
         return list.indexOf(value) != -1;
      }
   };
   
   var is = 
   {
      'string+': function(value)
      {
         return typeof(value) == 'string' && value !== "";
      },
   
      'string': function(value)
      {
         return typeof(value) == 'string';
      },
   
      'alphanum': function(value)
      {
         return (/^[a-zA-Z0-9]+$/i).test(value);
      },
   
      'alpha': function(value)
      {
         return (/^[a-zA-Z]+$/i).test(value);
      },
   
      'object': function(value)
      {
         return typeof(value) == 'object' && !_.isArray(value);
      },
   
      'array': function(value)
      {
          return _.isArray(value);
      },
   
      'date': function(value)
      {
         // getTime() allows us to check if date is valid
         return _.isDate(value) && !isNaN(value.getTime());
      },
   
      'number': function(value)
      {
         return typeof(value) == 'number' && !isNaN(value);
      },
   
      'int': function(value)
      {
         return typeof(value) == 'number' && value % 1 === 0 && !isNaN(value);
      },
   
      'boolean': function(value)
      {
         return _.isBoolean(value);
      },
   
      'float': function(value)
      {
         return typeof(value) == 'number' && !isNaN(value);
      },
   
      'email': function(value)
      {
         return (/[a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+(?:\.[a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+)*@(?:[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?/).test(value);
      },
   
      'url': function(value)
      {
         return (/^(http(s)?:\/\/)?([\w\-]+\.{1})*(([\w\-]*){1}(\.{1}[A-Za-z]{2,4}){1}){1}(\:{1}\d*)?([\?\/|\#]+[\@\~\;\+\'\#\,\.\%\-\/\&\?\=\w\$\s]*)*$/i).test(value);   
      },
   
      'zipcode': function(value)
      {
         return (/\d{5}/).test(value);
      }
   };
   
   var filters = 
   {
      'toInt': function(value)
      {
         return parseInt(value, 10);
      },
   
      'toFloat': function(value)
      {
         return parseFloat(value, 10);
      },
   
      'toString': function(value)
      {
         return value.toString();
      },
   
      'toDate': function(value)
      {
         return new Date(value);
      },
   
      'toBoolean': function(value)
      {
         if(value === 1 || value === true || /true|on|yes|1/.test(value))
            return true;
         else if(value === 0 || value === false || /false|off|no|0/.test(value))
            return false;
         else
            return value;
      },
   
      'trim': function(value)
      {
         return _.isString(value) ? value.replace(/^\s\s*/, '').replace(/\s\s*$/, '') : value;
      },
   
      'lowercase': function(value)
      {
         return _.isString(value) ? value.toLowerCase() : value;
      },
   
      'uppercase': function(value)
      {
         return _.isString(value) ? value.toUpperCase() : value;
      }
   };
   
   var rules =
   {
      create:     function(param, rules) { return new Rules(param, rules); },
      types:      is,
      filters:    filters,
      properties: checks,
   };

   var Schema = function(schema)
   {
      this.schema = schema;
   };
   
   Schema.prototype.validate = function(data)
   {
      var params  = _.keys(this.schema);
      var errors  = {};
      var values  = {};
      var value;
      var get     = typeof(data) == "function" ? data : function(p) { return data[p]; };
   
      for(var i = 0; i < params.length; i++)
      {
         var schema = this.schema[params[i]];
   
         try
         {
            // if undefined, don't store it.
            value = rules.create(params[i], schema).apply(get(params[i]));
   
            if(!_.isUndefined(value)) 
            {
               values[params[i]] = value;
            }
   
            // does this rule contain embedded schemas
            if(typeof(schema.schema) == "object" && !_.isArray(schema.schema) && _.keys(schema.schema).length && !_.isUndefined(values[params[i]]))
            {
               if(schema.type == "object")
               {
                  _.keys(schema.schema).forEach(function(param)
                  {
                     try
                     {
                        // if undefined, don't store it
                        value = rules.create(params[i] + "." + param, schema.schema[param]).apply(get(params[i])[param]);
   
                        if(!_.isUndefined(value))
                        {
                           values[params[i]][param] = value;
                        }
                     }
                     catch(error)
                     {
                        if(!errors[params[i]] || typeof(errors[params[i]]) != 'object')
                           errors[params[i]] = {};
   
                        errors[params[i]][param] = error;
                     }
                  });
               }
               else if(schema.type == "array")
               {
                  values[params[i]].forEach(function(value, index)
                  {
                     try
                     {
                        // if not required and undefined, don't store in values!
                        values[params[i]][index] = rules.create(params[i] + "[" + index + "]", schema.schema).apply(value);
                     }
                     catch(error)
                     {
                        if(!_.isArray(errors[params[i]]))
                           errors[params[i]] = [];
   
                        errors[params[i]][index] = error;
                     }
                  });
               }
            }
         }
         catch(error)
         {
            errors[params[i]] = error;
         }
      }
   
      return {data:values, errors:errors, valid:_.keys(errors).length === 0};
   };

   _.schema =
   {
      create: function(schema) { return new Schema(schema);},
      rules:  rules
   };

})();
