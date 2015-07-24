/*******************************************************************************
 * The MIT License (MIT)
 * Copyright © 2015 Inshua,inshua@gmail.com, All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the “Software”), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
 * OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *******************************************************************************/
/**
 * <pre>
 * 服务器端校验器。 Validation。别名 $V
 * 
 * 使用方法:
 * <pre class="code">
 * $V(rcd,{ 
 * 			name  : [V.notNull, V.shortest(5), V.unique('table')],
 * 			qq	  : V.notNull,
 * 			email : [V.notNull, V.email],
 * 	  })
 * </pre>
 * </pre>
 * 
 * @class V
 * @alias Validation
 */
function V(rcd, validators){
	for(var fld in validators){
		if(validators.hasOwnProperty(fld)){
			var value = rcd[fld];
			var vs = validators[fld];
			vs = (vs.push ? vs : [vs]);	 	// use push test is array
			for(var i=0; i<vs.length; i++){
				var validator = vs[i];
				if(validator.check){
					var msg = validator.check(value, fld, rcd);
					if(msg != null){
						throw new ValidationError(fld, validator.name, msg);
					}
				} else {
					logger.error("there is no check function on field {fname} {idx}".format({fname : fld, idx : i}));
				}
			}
		}
	}
}

/**
 * &nbsp; {@link V} 的别名。为了让校验这种功能性代码容易辨识，定义一个别名。
 * @alias V
 */
var $V = V;	

/**
 * 非空检验器 
 * @memberof V
 */
V.notNull = {
	name : 'notNull',
	check : function(v, fld){ 
		if(v == null || v == '') return fld + '不允许为空'; 
	}
};

/**
 *email 检验器
 *@memberof V 
 */
V.email = {
	name : 'email',
	reg : /^([a-zA-Z0-9_-])+@([a-zA-Z0-9_-])+((\.[a-zA-Z0-9_-]{2,3}){1,2})$/,
	check : function(v, fld){
		if(v==null||v=='') return;
		if(! this.reg.test(v)){
			return fld + '应为合法的电子邮箱地址'; 
		}
	}
};

/**
 * 正则表达式检验器: V.reg(/正则表达式/, '不符合指定的格式')
 *@memberof V 
 */
V.reg = function(reg, desc){
	return {
		name : 'reg',
		check : function(v, fld){
			if(v==null||v=='') return;
			if(! reg.test(v)){
				return fld + desc; 
			}
		}
	};
};

/**
 * <pre>
 * UNIQUE 唯一性满足检验器。 
 * 假定 当插入时，rcd.id 还没有值；当更新时，rcd.id 总有值。此时用法如：
 * 		unique('table')			// 数据库实际字段名与输入的字段名相同
 * 		unique('table', 字段名);	// 数据库实际字段名与输入的字段名不同
 * 如为其它情形，应在更新时明确提供主键字段名及值，插入时也要提供。
 * 例如： 
 * 		unique('table', 'name', {no : 20}) 指示使用 no 作为主键，原值为 20。 用于更新。
 *  	unique('table', 'name', {no : null}) 同上，用于插入。
 * </pre>
 * @param table 表名
 * @param tableField 字段名。如与传入字段名相同可不填。
 * @param primaryDesc
 * @param ignoreCase 是否忽略大小写. 比较字符串时可以提供该参数.
 * @returns 
 */
V.unique = function(table, tableField, primaryDesc, ignoreCase){	
	return {
		name : 'unique',	
		check : function(v, fld, rcd){
			if(v==null||v=='') return;
			var pk = 'id';
			if(primaryDesc == null){
				primaryDesc = {id : rcd.id};
			} else {
				for(var k in primaryDesc){
					if(primaryDesc.hasOwnProperty(k)){
						pk = k;
						break;
					}
				}
			}
			
			if(executor.isOracle()){
				var sql = 'select 1 from ' + table + ' where ' + (tableField || fld) + ' = ? and rownum=1';
				if(ignoreCase){
					sql = 'select 1 from ' + table + ' where upper(' + (tableField || fld) + ') = ? and rownum=1';
				}

				if(primaryDesc[pk] != null){
					sql += ' and ' + pk + ' <> ?';
				}
			} else if(executor.isPostgreSQL()){
				var sql = 'select 1 from ' + table + ' where ' + (tableField || fld) + ' = ?';
				if(ignoreCase){
					sql = 'select 1 from ' + table + ' where upper(' + (tableField || fld) + ') = ?';
				}
				if(primaryDesc[pk] != null){
					sql += ' and ' + pk + ' <> ?';
				}
				sql += ' limit 1';
			}
			
			
			var r = (primaryDesc[pk] == null) ? 
					dbjs.query(sql, [ignoreCase ? (v && v.toUpperCase()) : v]) : 
					dbjs.query(sql, [v, primaryDesc[pk]]);
					
			if(r.rows.length){
				return fld + '为' + v + '已经的记录存在';
			}
		}
	};
};

/**
 * 文本长度检查器。不能超过 size。 (<=size)
 * @param size {number}
 * @returns 
 */
V.longest = function(size){
	return {
		name : 'textlen',
		check : function(v, fld){
			if(v==null||v=='') return;
			if(v.length > size){
				return fld + '长度不能超过 ' + size;
			}
		}
	};
};

/**
 * 文本长度检查器。不能短于 size。 (>=size)
 * @param size {number}
 * @returns 
 */
V.shortest = function(size){
	return {
		name : 'textlen',
		check : function(v, fld){
			if(v==null||v=='') return;
			if(v.length < size){
				return fld + '长度不能短于 ' + size;
			}
		}
	};
};

/**
 * 数值检查器。 必须 &lt;= 规定数值。
 * @param size {number | string } number - 数值具体值， string - 另一字段名
 * @returns 
 */
V.most = function(maxValue){
	return {
		name : 'numrange',
		check : function(v, fld){
			if(v==null||v=='') return;			
			var msg = fld + '不能超过' + maxValue;
			
			if(maxValue != null){
				if(isNaN(maxValue) && maxValue.substr){
					maxValue = rcd[maxValue];
				}
				if(v > maxValue) return msg;
			}
		}
	};
};

/**
 * 数值检查器。 必须 &gt;= 规定数值。
 * @param minValue {number | string } number - 数值具体值， string - 另一字段名
 * @returns 
 */
V.atLeast = function(minValue){
	return {
		name : 'numrange',
		check : function(v, fld){
			if(v==null||v=='') return;
			var msg = fld + '应大于' + minValue;
			
			if(minValue != null){
				if(isNaN(minValue) && minValue.substr){
					minValue = rcd[minValue];
				}
				if(v < minValue) return msg;
			}
			
		}
	};
};

/**
 * 数值检查器。必须 >= minValue && &lt; maxValue
 * @param minValue {number | string | null} number - 数值具体值， string - 另一字段名， null - 忽略该参数
 * @param maxValue {number | string | null} number - 数值具体值， string - 另一字段名， null - 忽略该参数
 * @returns 
 */
V.between = function(minValue, maxValue){
	return {
		name : 'numrange',
		check : function(v, fld, rcd){
			if(v==null||v=='') return;
			
			var msg = fld + '应位于' + minValue + ' 和 ' + maxValue + ' 之间';
			
			if(minValue != null){
				if(isNaN(minValue) && minValue.substr){
					minValue = rcd[minValue];
				}
				if(v < minValue) return msg;
			}
			if(maxValue != null){
				if(isNaN(maxValue) && maxValue.substr){
					maxValue = rcd[maxValue];
				}
				if(v >= maxValue) return msg;
			}			
		}
	};
};

/**
 * 散值取值范围检查器。取值必须位于所给数组中。
 * @param dict {array} 取值范围数组。如 ['M', 'F']
 * @param msg {string | null} 错误消息 
 * @returns 
 */
V.inside = function(dict, msg){
	return {
		name : 'numrange',
		check : function(v, fld){
			msg = msg || fld + '取值不在给定范围';
			if(dict.indexOf(v) == -1){
				return msg;
			}
		}
	};
};


/**
 * <pre>
 * 类似 Unique 检查器。检查与传入记录 NODE 相同的兄弟记录看是否唯一。
 * </pre>
 * @param table 表名
 * @param tableField 字段名。如与传入字段名相同可不填。
 * @param primaryDesc
 * @returns 
 */
V.uniqueInNode = function(table, tableField, primaryDesc){	
	return {
		name : 'unique',	
		check : function(v, fld, rcd){
			if(v==null||v=='') return;
			var pk = 'id';
			if(primaryDesc == null){
				primaryDesc = {id : rcd.id};
			} else {
				for(var k in primaryDesc){
					if(primaryDesc.hasOwnProperty(k)){
						pk = k;
						break;
					}
				}
			}
			var sql = 'select 1 from ' + table + ' where ' + (tableField || fld) + ' = ? and rownum=1 and node=?';			
			var r = (primaryDesc[pk] == null) ? 
					dbjs.query(sql, [v, rcd.node]) : 
					dbjs.query(sql + ' and ' + pk + ' <> ?', [v, primaryDesc[pk], rcd.node]);
					
			if(r.rows.length){
				return fld + '为' + v + '已经的记录存在';
			}
		}
	};
};