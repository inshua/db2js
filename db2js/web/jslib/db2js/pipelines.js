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
 * 格式化时间 
 * usage: <input format="yyy-MM-dd" renderer="date|std">
 */
db2js.Renderers.Pipelines.date = function(element, value, table, _1, rows, index, row, columnName){
	if(value == null) return '';
	return value.format(element.getAttribute('format') || 'yyyy-MM-dd hh:mm:ss');
}

/**
 * 词典值
 * usage : 
 * 		<input data="xxx" renderer="dict({N:'正常', S:'停用'})|std">
 * 或
 * 		Dicts.gendor = {M : 'Male', F : 'Female'};
 * 		<input dict="gendor" data="xxx" renderer="dict|std">
 * 
 * 		<input data="xxx" renderer="dict(['正常','停用'])|std">
 * 或
 * 		Dicts.gendor = ['正常','停用'];
 * 		<input dict="gendor" data="xxx" renderer="dict|std">
 */
db2js.Renderers.Pipelines.dict = function(element, value, table, _1, rows, index, row, columnName){
	if(element && element.tagName){	// if it's html element
		if(value == null) return null;
		var lov = element.getAttribute('dict');
		if(!lov) return 'no dict attribute';
		var dict = Dicts[lov];
		if(dict instanceof Array){
			dict = dict.reduce(function(acc, item){acc[item] = item; return acc}, {});
		}
		if(dict == null) return lov + ' not exist';
		if(value instanceof Array){
			return value.map(function(v){return dict[v] || v}) 
		} else {
			return dict[value] || value;
		}
	} else {
		var dict = element;
		if(dict instanceof Array){
			dict = dict.reduce(function(acc, item){acc[item] = item; return acc}, {});
		}
		return function(element, value, table, _1, rows, index, row, columnName){
			if(value == null) return '';
			return dict[value] || '';
		}
	}
}

/**
 * 将词典翻译为列表
 * usage : 
 *  <div data="#anything" renderer="dictToList({N:'正常', S:'停用'})|options('name','id')">
 * 		<select data="#bindTable,rows,N,status" render="std"></select>
 *  </div>
 *  或
 *   Dicts.status = {N:'正常', S:'停用'}   
 *   <div data="#anything" dict="status" renderer="dictToList|options('name','id')">
 * 		<select data="#bindTable,rows,N,status" render="std"></select>
 *   </div>
 *  anything 可以随意提供一个可绑定数据,并不用于实际渲染，例如 dicts
 */
db2js.Renderers.Pipelines.dictToList = function(element, value, table, _1, rows, index, row, columnName){
	if(element && element.tagName){	// if it's html element
		if(value == null) return null;
		var lov = element.getAttribute('dict');
		if(!lov) return [];
		var dict = Dicts[lov];
		if(dict == null) return [];
		
		var arr = [];
		for(var k in dict){if(dict.hasOwnProperty(k)){
			arr.push({name : dict[k], id : k});
		}}
		return arr;
	} else {
		var dict = element;
		return function(element){
			if(dict == null) return [];
			var arr = [];
			for(var k in dict){if(dict.hasOwnProperty(k)){
				arr.push({name : dict[k], id : k});
			}}
			return arr;
		}
	}
}

db2js.Renderers.Pipelines.uppercase = function(element, value, table, _1, rows, index, row, columnName){
	if(typeof value == 'string'){
		return value.toUpperCase();
	} else if(value == null){
		return '';
	} else {
		return (value + '').toUpperCase();
	}
}


/**
 * 将词典文字收集为词典值
 * 
 * 用法：
 * <tag dict="gendor" data="xxx" collector="c|dict({M : 'Male', F : 'Female'})|s">
 * 或
 * Dicts.gendor = {M : 'Male', F : 'Female'};
 * <tag dict="gendor" data="xxx" collector="c|dict|s">
 */
db2js.Collectors.Pipelines.dict = db2js.KNOWN_COLLECT_PIPELINES['dict'] = function(element, value, table, _1, rows, index, row, columnName){
	var lov = element.getAttribute('lov');
	if(!lov) return 'no dict attribute';
	var dict = Dicts[lov];
	if(dict == null) return lov + ' not exist';
	if(value instanceof Array){
		var arr = [];
		for(var k in dict){if(dict.hasOwnProperty(k)){
			if(dict[k] == value) arr.push(k);
		}}
		return arr;
	} else {
		for(var k in dict){if(dict.hasOwnProperty(k)){
			if(dict[k] == value) return k;
		}}
		return value;
	}
}

/**
 * 将词典表映射为含义
 * 
 * 用法：
 * 设有表 gendor, 字段为 id, desc, 有数据
 * 
 * id    |   desc
 * ------+----------
 * M     |   Male
 * F     |   Female
 * 
 * <tag data="xxx" renderer="lov('gender', 'id', 'desc)">
 * 如数据不会轻易变动，或不依赖索引，直接提供数组也可以
 * <tag data="xxx" renderer="lov(gendor.rows, 'id', 'desc)">
 */
db2js.Renderers.Pipelines.lov = function(table, idColumn, nameColumn){
	return function(element, value){
		if(table instanceof Array){
			var rows = table;
			if(value instanceof Array){
				return value.map(f)
			} else {
				return f(value);
			}					
		} else {
			if(value instanceof Array){
				return value.map(f2)
			} else {
				return f2(value);
			}			
		}
		
		function f(value){
			var row = rows.filter(function(row){row[idColumn] == value})[0];
			return row && row[nameColumn];
		}
		
		function f2(value){
			var row = db2js.dataset[table].find(idColumn, value);
			return row && row[nameColumn];
		}
	}
}




