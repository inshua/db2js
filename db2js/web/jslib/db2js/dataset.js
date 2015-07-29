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
function db2js(){}

db2js.dataset = {}

/**
 * 数据关系定义为
 * {parent : 'masterTable', parentColumn : 'id',  child : 'detailTable', childColumn : 'parent_id'}
 * 这里有意用表名字符串，不用 DataTable 对象，也不使用 {masterTable : [from : 'id', detailTable : '', with : 'parent_id']} 后面这种结构不适合找父表
 */
db2js.dataset.relations = [];

/**
 * 增加一个关系
 */
db2js.dataset.addRelation = function(parent, parentColumn, child, childColumn){
	 this.relations.push({parent : parent, parentColumn : parentColumn,  child : child, childColumn : childColumn});
}

db2js.dataset.monitor = function(){
	var a = [];
	for(var tb in this){
		var t = this[tb];
		if(t instanceof db2js.DataTable){							
			a.push(t.monitor(true))
		}
	}
	
	var w = window.open("about:blank");
	if(w != null){
		w.document.write(a.join(""));
	} else{
		document.write(a.join(""));
	}	
}
/**
 * 
 * @class db2js.DataTable
 * @param name 表名
 * @param url 数据提供者的网址
 * @param option {
 * 			silent : true|false 是否静默（不引发render）, 默认为为 true,
 * 			pageSize : 分页尺寸，默认为 db2js.DataTable.DEFAULT_PAGESIZE,
 * 			standalone : true|false 如果启用，则不加入到 dataset 中，默认为 false,
 * 			indexedColumns : [], 索引字段，默认为 ['id'] 可以加入自己的字段
 * 			listeners : {
 * 				onload : function(error){},
 * 				onsubmit : function(error){},
 * 				onrowchange : function(error, row, event){},		// error == null, event maybe new, edit, remove, reject, accept
 * 				onany : function(error, row, event){},
 * 				onnewrow : function(row){},							// 新建行，此时可以做一些加工,主要是设置默认值
 * 				onstatechange : function(error, state){},
 * 				onschemachange : function(){}
 * 			}}
 */
db2js.DataTable = function (name, url, option){
	option = option || {};
	
	this.isSilent = option.silent != null ? option.silent : true;
	this.name = name;
	this.db2js = name;				// selector, for render and collect
	this.isDb2jsTerm = true;		// avoid extractData travel children
	
	var link = document.createElement('a');
	link.href = url;
	this.url = this.src = link.pathname;
	
	if(!option.standalone){
		db2js.dataset[name] = this;
	}

	/**
	 * 状态，有 none, submiting, loading, error
	 */	
	this.state = 'none';
	/**
	 * 各列
	 */
	this.columns = [];
	
	/**
	 * 表级错误
	 */
	this.error = null;
	
	/**
	 * 各行
	 */
	this.rows = [];	
	
	/**
	 * 查询参数
	 */
	this.search = {params : {}};
	
	/**
	 * 页定义
	 */
	this.page = 0;
	this.pageSize = option.pageSize || db2js.DataTable.DEFAULT_PAGESIZE;
	this.pageCount = null;
	this.total = 0;
	
	EventDispatcher.call(this);
	this.regEvent(['load', 'submit', 'rowchange', 'newrow', 'statechange', 'schemachange']);
	var listeners = option && option.listeners;
	if(listeners){
		for(var k in listeners){ if(listeners.hasOwnProperty(k)){
			this.on(k.substr(2), listeners[k]);
		}}
	}
	
	/**
	 * 索引化字段列表,可人工设置的数组，如 table.indexedColumns = ['id']; 之后调用 table.buildIndexes() 重建索引，以后使用 find('id', 2) 就会使用索引
	 * 用于索引的字段，值必须唯一
	 */
	this.indexedColumns = option.indexedColumns || ['id'];
}

db2js.DataTable.DEFAULT_PAGESIZE = 10;

/**
 * 为JSON解析时提供日期解析。
 * usage: JSON.parse(string, parseDate)
 * @param key
 * @param value
 * @returns
 */
function parseDate(key, value) {
    if (typeof value === 'string') {
        var a = parseDate.reg.exec(value);
        if (a) {
            return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[5] || 0, a[6] || 0, +a[7] || 0));
        }
    }
    return value;
}
parseDate.reg = /^(\d{4})-(\d{2})-(\d{2})(T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z?)?$/;


db2js.DataTable.prototype.setState = function(newState){
	if(this.state != newState){
		this.state = newState;
		this.fireEvent('statechange', newState);
	}
}

/**
 * 按JSON创建新行，不加入 rows，如需要加入 rows 可调用 table.addRow(rowData)
 * 如不提供 rowData，则仅按列规格创建一个对象
 * @param rowData 
 */
db2js.DataTable.prototype.newRow = function(rowData){
	var row = new db2js.DataRow(this, rowData);
	row._state = "new";
	this.fireEvent('newrow', row);
	return row;		
}

/**
 * 按JSON 创建新行，并加入 rows，或将创建好的新行加入 rows
 * @param rowData
 * @param raiseEvent 是否触发事件，如为 true 触发 rowchange 事件，默认为 false
 */
db2js.DataTable.prototype.addRow = function(rowData, raiseEvent){
	var row = new db2js.DataRow(this, rowData);
	row._state = "new";
	this.rows.push(row);
	if(raiseEvent) this.fireEvent('rowchange', row, 'new');
	return row;
}

/**
 * 接受修改
 */
db2js.DataTable.prototype.accept = function(){
	var me = this;
	this.rows.forEach(function(row){
		if(row._accept()){
			me.fireEvent('rowchange', row, 'accept')
		}
	});
}

/**
 * 撤销修改
 */
db2js.DataTable.prototype.reject = function(){
	var me = this;
	this.rows.slice().forEach(function(row){
		if(row._reject()){
			me.fireEvent('rowchange', row, 'reject')
		}
	});
}


/**
 * 初始化数据列
 * @param columns 由 [{name : '', type : ''}] 构成的数组
 * @param raiseEvent 默认为false
 */
db2js.DataTable.prototype.initSchema = function(columns, raiseEvent){
	this.columns = [];
	this.columnNames = [];
	for(var i=0; i<columns.length; i++){
		var col = columns[i];
		this.columns.push(new db2js.DataColumn(col.name, col.type));
		this.columnNames.push(col.name);
	}
	if(raiseEvent) this.fireEvent('schemachange');
}

/**
 * 
 * @param params {_action : action, param1 : value1, param2 : value2, ...}
 * @param option { callback : function(ex){}, timeout : 30000, async : true, method : 'GET'}
 */
db2js.DataTable.prototype.load = function(params, option){
	if(option == null) option = {};
	if(option instanceof Function){
		option = {callback : option};
	}

	var q = {};
	if(params){
		for(var k in params){
			q[k] = params[k];
		}
	} else if(this.search.params){
		for(var k in this.search.params){
			q[k] = this.search.params[k];
		}
	}
	if(params && params._sorts){
		this.search._sorts = q._sorts;
	} else {
		q._sorts = this.search._sorts;
	}
	q._page = {start : this.page * this.pageSize, limit : this.pageSize};
	
	this.clearError();
	this.setState('loading');
	var me = this;
	this.search.params = q;
	this.search.option = option;
	
	$.ajax({
		url : this.url,
		data : {_m : q._m || 'fetch', params : JSON.stringify(q)}, 
		type : option.method || 'get',
		timeout : option.timeout || 30000,
		async : option.async != null ? option.async : true,
		dataType : 'text',
		success : onSuccess,
		error : function (error){onError(new Error(error.responseText));}
	});
	
	function onSuccess(text, status){
		var isJson = false;
		try{
			var result = JSON.parse(text, parseDate);
			isJson = true;
		} catch(e){}
		
		if(isJson){
			if(!result.error){
				if(result.total != null){
					me.total = result.total;
					me.pageIndex = result.start / me.pageSize;
					me.pageCount = Math.ceil(result.total / me.pageSize);
				}
				
				me.initSchema(result.columns);
				
				me.rows = [];
				var rows = result.rows;
				for(var i=0; i<rows.length; i++){
					var row = new db2js.DataRow(me, rows[i]);
					me.rows.push(row);
				}
				if(me.indexedColumns) me.buildIndexes();
				
				if(option && option.callback){
					option.callback.call(me);
				}
				me.setState('none');
				me.fireEvent('load');
			} else {
				onError(new Error(result.error));
			}
		} else {
			onError(new Error(text));
		}
	}
	
	function onError(error){
		me.error = error;
		me.setState('error');
		me.error = error;
		me.fireEvent('load', error);
		if(option && option.callback){
			option.callback.call(me, error);
		}
	}
}

/**
 * 一次性填入多行。当需要构建原型页面时可使用该函数插入样本数据。可以达到模拟 load 的效果。
 * @param rows [{fld1: v1, fld2, v2, ...}, ... ]
 * @param option {raiseEvent : true | false, 是否引发 load 事件，修改 load 状态，默认为 true; 
 * 				callback : function(ex){}; 
 * 				append : false|true，是否为追加模式，默认为false，将清空原来的所有数据, 
 * 				reinit : true|false 是否重建 schema，当为false时，如有字段列表保留原字段列表，默认为 false}
 */
db2js.DataTable.prototype.fill = function(rows, option){
	if(option == null) option = {};
	if(option instanceof Function){
		option = {callback : option};
	}
	var raiseEvent = (option.raiseEvent != null ? option.raiseEvent : true);
	var append = (option.append != null ? option.append : false);
	var reinit = (option.reinit != null ? option.reinit : false);

	this.clearError();
	if(raiseEvent) this.setState('loading');
	var me = this;
	
	if(this.columns.length == 0 || reinit) {
		var columns = [];
		for(var k in rows[0]){
			columns.push(new db2js.DataColumn(k));
		}
		
		me.initSchema(columns);
	}
	
	me.rows = [];
	for(var i=0; i<rows.length; i++){
		var row = new db2js.DataRow(me, rows[i]);
		me.rows.push(row);
	}
	if(me.indexedColumns) me.buildIndexes();
	
	if(option && option.callback){
		option.callback.call(me);
	}
	if(raiseEvent) me.setState('none');
	if(raiseEvent) me.fireEvent('load');
}

/**
 * 使用上次的参数，读取指定页
 * @param pageIndex
 */
db2js.DataTable.prototype.navigatePage = function(pageIndex){
	this.page = pageIndex;
	this.search._page = JSON.stringify({start : this.page * this.pageSize, limit : this.pageSize});
	this.load(this.search.params, this.search.option);
}

/**
 * 使用上次的参数，重新读取数据
 */
db2js.DataTable.prototype.reload = function(){
	this.load(this.search.params, this.search.option);
}


db2js.DataTable.prototype.submit = function(option){
	// 收集变化
	function collectAll(table, parentRow, relation){
		var v = null;
		if(parentRow) v = parentRow[relation.parentColumn];
		var relations = table.getChildTables();
		
		var result = {name : table.name, src : table.src, columns : table.columns};
		result.rows = table.rows.filter(function(row){
				if(parentRow) 
					return row[relation.childColumn] == v;
				else 
					return true;
			}).map(function(row){
				var jo = row._toJson();
				jo._state = row._state;
				jo._idx = table.rows.indexOf(row);
				if(row._origin) jo._origin = row._origin;
				jo._children = [];
				return jo;
			});
		
		if(result.rows.length){
			for(var tname in relations){ if(relations.hasOwnProperty(tname)){
				result.rows.forEach(function (row){
					relations[tname].forEach(function(relation){
						row._children.push(collectAll(db2js.dataset[tname], row, relation));
					});
				});
			}}
		}
		result.rows.slice().forEach(function(row){
			if(row._children.length == 0) {
				delete row._children;		
			}
		});
		return result;
	}
	
	function filterChanged(table){
		table.rows = table.rows.filter(function(row){
			return isDirty(row);
		});
		table.rows.forEach(function(row){
			if(row._children){
				row._children.slice().forEach(function(t){
					filterChanged(t);
					if(t.rows.length == 0){
						row._children.splice(row._children.indexOf(t));
					}
				});
				if(row._children.length == 0){
					delete row._children;
				}
			}
		});
		return table;
	}
	
	function isDirty(row){
		if(row._state != 'none') return true;
		if(row._children && row._children.length){
			return row._children.some(function(tb){return tb.rows.some(function(crow){return isDirty(crow)})});
		}
	}
		
	var me = this;
	var changes = filterChanged(collectAll(this));
	
	if(changes.rows.length == 0){
		var error = new Error('no data changed found')
		error.level = 'warning';
		onError(error)
		return;
	}
	
	// 开始提交
	if(!option) option = {};
	if(option instanceof Function){
		option = {callback : option};
	}
	
	this.clearError();
	this.setState('submiting');
	var params = {_m : 'update', table : changes};
	$.ajax({
		url : this.url,
		data : {_m : 'update', params : JSON.stringify(params)},
		type : 'post',
		timeout : option.timeout || 30000,
		async : option.async != null ? option.async : true,
		dataType : 'text',
		success : onSuccess,
		error : function (error){onError(new Error(error.responseText));}
	});
	
	function onSuccess(text, status){
		var isJson = false;
		try{
			var result = JSON.parse(text, parseDate);
			isJson = true;
		} catch(e){}
		if(isJson){
			if(!result.error){
				me.accept();
				
				if(option && option.callback){
					option.callback.call(me);
				}
				me.setState('none');
				me.fireEvent('submit');
			} else {
				if(typeof result.error == 'string'){
					onError(new Error(result.error));
				} else {
					var err = new Error(result.error.message);
					for(var k in result.error){
						err[k] = result.error[k];
					}
					onError(err);
				}
			}
		} else {
			onError(new Error(text));
		}
	}
	
	function onError(error){
		var table = me;
		if(error.table){
			table = db2js.dataset[error.table];
		}
		table.error = error;
		if(error.table && error.idx != null){
			var row = table.rows[error.idx];
			table.error = null;
			if(error.field){
				row._error = {};
				row._error[error.field] = error;
			} else {
				row._error = error;
			}
		}
		
		table.setState('error');
		table.fireEvent('submit', error);
		
		if(option && option.callback){
			option.callback.call(table, error);
		}
	}
	
}

db2js.DataTable.prototype.clearError = function(){
	this.error = null;
	for(var i=0; i< this.rows.length; i++){
		this.rows[i]._error = null;
	}
	this.setState('none');
}

/**
 * find(columnName, pattern)
 * or
 * find(function(row){})
 * 
 * 仅查找一条，如果需要查找多条，可使用 rows.filter()
 */
db2js.DataTable.prototype.find = function(cname, pattern){
	if(typeof cname == 'function'){
		return this.rows[this.rows.find(cname)];
	} else {
		if(this.indexes && this.indexes[cname]) return this.indexes[cname][pattern];
		
		for(var i=0; i<this.rows.length; i++){
			if(this.rows[i][cname] == pattern) return this.rows[i];
		}
	}
}

/**
 * 建立索引
 */
db2js.DataTable.prototype.buildIndexes = function(){
	if(this.indexedColumns){
		this.indexes = {};
		for(var i=0; i< this.indexedColumns.length; i++){
			this.indexes[this.indexedColumns[i]] = {};
		}
		
		for(var i=0; i< this.rows.length; i++){
			var row = this.rows[i];
			for(var j=0; j< this.indexedColumns.length; j++){
				var cname = this.indexedColumns[j];
				var v = row[cname];
				if(v != null && v != ''){
					if(this.indexes[cname][v]) throw new Error('unable to create index since same value '  + v + ' existed');
					this.indexes[cname][v] = row;
				}
			}
		}
	}
}

/**
 * 提取所有直接下属表。关系在 dataset 中定义。
 * 返回 {table : [relations]}
 */
db2js.DataTable.prototype.getChildTables = function(){
	return db2js.dataset.relations.filter(function(relation){
				return relation.parent == this.name;
			}, this).reduce(function(res, relation){
				var arr = res[relation.child];
				if(!arr) arr = res[relation.child] = [];
				arr.push(relation);
				return res;
			}, {});
}

/**
 * 提取所有直接上级表。关系在 dataset 中定义。
 */
db2js.DataTable.prototype.getParentTables = function(){
	return db2js.dataset.relations.filter(function(relation){
		return relation.child == this.name;
	}, this).reduce(function(res, relation){
		var arr = res[relation.parent];
		if(!arr) arr = res[relation.parent] = [];
		arr.push(relation);
	}, {});
}

/**
 * 提取所有下属数据行
 * @param row 本表的行
 * @param childTable 
 */
db2js.DataTable.prototype.findChildRows = function(row, childTable){
	var rows = [];
	for(var i=0; i<db2js.dataset.relations.length; i++){
		var relation = db2js.dataset.relations[i];
		if(relation.parent == this.name && relation.child == childTable){
			var ct = db2js.dataset[childTable];
			var v = row[relation.parentColumn];
			rows = rows.concat(ct.rows.filter(function(crow){return crow[relation.childColumn] == v}));
		}
	}
	return rows;
}

/**
 * 提取所有上级行
 * @param row 本表的行
 * @param parentTable 
 */
db2js.DataTable.prototype.findParentRows = function(row, parentTable){
	var rows = [];
	for(var i=0; i<db2js.dataset.relations.length; i++){
		var relation = db2js.dataset.relations[i];
		if(relation.child == this.name && relation.parent == parentTable){
			var pt = db2js.dataset[parentTable];
			var v = row[relation.childColumn];
			rows = rows.concat(ct.rows.filter(function(prow){return prow[relation.parentColumn] == v}));
		}
	}
	return rows;
}


db2js.DataTable.prototype.monitor = function(returnHtml){
	var t = this; 
	var a = [];
	a.push("<table border=1>");
	a.push("<caption>" + t.name + "</caption>");				
	a.push("<tr>");
	a.push(t.columns.map(function(col){return "<td>" + col.name + "(" + col.dataType + ")" + "</td>";}).join(''))
	a.push("<td>row._state</td>");
	a.push("<td>row._error</td>");
	a.push("</tr>");

	for(var rid =0; rid< t.rows.length; rid++){
		var r = t.rows[rid];
		a.push("<tr>");
		a.push(t.columns.map(function(col){return "<td>" + r[col.name] + "</td>";}).join(''))
		a.push("<td>" + r._state + "</td>");
		a.push("<td>" + (r._error? r._error.name : '') + "</td>");
		a.push("</tr>");
	}
	a.push("</table>");
	if(returnHtml) return a.join('');
	
	var w = window.open("about:blank");
	if(w != null){
		w.document.write(a.join(""));
	} else{
		document.write(a.join(""));
	}
}

/**
 * @class 事件分发器
 */
function EventDispatcher(){
	this.listeners = {};
	this.knownEvents = [];
	this.regEvent = function(eventName){
		if(Array.isArray(eventName)){
			for(var i=0; i<eventName.length; i++){
				this.regEvent(eventName[i]);
			}
			return;
		}
		this.listeners[eventName] = [];
		this.knownEvents.push(eventName);
	}

	this.on = function(eventName, listener){
		if(eventName == 'any' || eventName == '*'){
			eventName = this.knownEvents;
		}
		if(Array.isArray(eventName)){
			for(var i=0; i<eventName.length; i++){
				this.on(eventName[i], listener);
			}
			return;
		}
		this.listeners[eventName].push(listener.bind(this));
	}
	
	this.fireEvent = function(eventName){
		var ls = this.listeners[eventName];
		var args = [];
		for(var i=1; i<arguments.length; i++){
			args.push(arguments[i]);
		}
		for(var i=0; i<ls.length; i++){
			ls[i].apply(this, args);
		}
	}
}


///**
// * 一次性读入多个表，需要服务器支持该接口
// * @param loadTableOptions [{table : table, params : params, option : option}, ...]
// */
//dataset.loadBatch = function(loadTableOptions){
//	
//}

/**
 * @class db2js.DataColumn
 */
db2js.DataColumn = function(columnName, dataType){
	this.name = columnName;	
	this.type = dataType || 'STRING';	
	this.validators = [];
}

/**
 * @class db2js.DataRow
 */
db2js.DataRow = function(table, rowData){
	/**
	 * 行状态, new edit remove none
	 */
	this._state = 'none';
	
	/**
	 * 表
	 */
	this._table = table;
	
	this._error = null;
	
	function processValue(v){
		if(v == null) return null;
		return v;
	}
	
	/**
	 * @param column 字段名
	 * @param value 值
	 */
	this._set = function(column, value){
		var v = processValue(value);
		if(this[column] != v){
			if(this._state == 'none') {
				this._state = 'edit';
				if(this._origin == null){
					this._origin = this._toJson();
				}
			}
			this[column] = value;
		}
		return this;
	}

	/**
	 * 批次设置值
	 */
	this._setValues = function(rowData){
		for(var k in rowData){
			if(this._table.columns.any(function(col){return col.name == k})){
				this._set(k, value);
			}
		}
		return this;
	}
	
	/**
	 * 转换为JSON数据对象
	 */
	this._toJson = function(){
		var obj = {};
		for(var i=0; i<table.columnNames.length; i++){
			var cname = table.columnNames[i];
			obj[cname] = this[cname]; 
		}
		return obj;
	}
	
	this._isDirty = function(){
		return this._state != 'none';
	}
	
	this._accept = function(){
		switch(this._state){
		case 'edit' :
			this._origin = null;
			this._state = 'none';
			return true;
		case 'new':
			this._state = 'none';
			return true;
		}
	}
	
	this._reject = function(){
		switch(this._state){
		case 'edit' :
			table.columnNames.forEach(function(cname){
				this[cname] = this._origin[cname];
			}, this);
			this._state = 'none';
			this._origin = null;
			return true;
			break;
		case 'new' :
			table.rows.splice(table.rows.indexOf(this), 1);
			return true;
			break;
		} 
	}
	
	/**
	 * 获取子表的行（定义在 db2js.dataset.relations)
	 * 用法如：
	 * 	 order.rows[0]._childRows('order_detail').forEach(...)
	 * @param childTable
	 * @returns
	 */
	this._childRows = function(childTable){
		return table.findChildRows(this, childTable);
	}
	
	/**
	 * 获取父表的所有父行（定义在 db2js.dataset.relations)
	 * 用法如：
	 * 	 orderDetail.rows[0]._parentRows('order')[0]
	 * @param childTable
	 * @returns
	 */
	this._parentRows = function(parentTable){
		return table.findParentRows(this, parentTable);
	}
	
	/**
	 * 获取父行（定义在 db2js.dataset.relations)
	 * 用法如：
	 * 	 orderDetail.rows[0]._parentRow('order')
	 * @param childTable
	 * @returns
	 */
	this._parentRow = function(parentTable){
		return table.findParentRows(this, parentTable)[0];
	}
	
	// 初始化
	for(var i=0; i<table.columnNames.length; i++){
		var cname = table.columnNames[i];
		this[cname] = rowData && rowData[cname]; 	// JSON传来的数据已经去除了 '', undefined 之类似 null, 故不调用 processValue
	}
}