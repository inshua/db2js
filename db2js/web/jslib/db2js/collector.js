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
db2js.Collectors = function(){}
db2js.Collectors.Pipelines = function(){}

db2js.KNOWN_COLLECTORS = {};

db2js.KNOWN_COLLECT_PIPELINES = {};

/**
 * 发起收集函数。
 */
db2js.collect = function(htmlElement, baseData, direct){
	baseData = baseData || db2js.dataset;

	var stk = [];
	if(htmlElement) {
		if(htmlElement.jquery){
			stk = htmlElement.toArray();
			if(stk.length == 0){
				stk = [document.body];
			}
		} else {
			stk = [htmlElement]
		}
	} else {
		stk = [document.body];
	}
	while(stk.length){
		var e = stk.pop();
		var dataPath = e.getAttribute('data');
		var collector = e.getAttribute('collector');
		if(dataPath && collector){
			if(e.hasAttribute('trace-collect')) debugger;
			var data = [e]; 
			var match = db2js.extractData(baseData, dataPath, data, direct);

			if(match){
				data.splice(1, 0, data[data.length - 1]);		// value 始终作为第二个参数
				data.pop();
				
				var pipelined = (collector.indexOf('|') != -1);
				if(pipelined){		// pipeline 函数仅翻译值，其有可能会加 html 效果
					var parr = collector.split('|');
					for(var i=0; i<parr.length - 1; i++){
						var fun = extractPipeline(parr[i].trim());
						if(fun != null) {
							var piped = fun.apply(null, data);
							data[1] = piped;
						}
					}
					collector = parr[parr.length -1];
				} 
				var fun = extractCollector(collector.trim());
				fun.apply(null, data);
				$(e).trigger('db2js.collected', data);
			}
		}
		
		if(e.children.length){
			for(var i=e.children.length -1; i>=0; i--){
				stk.push(e.children[i]);
			}
		}
	}
	
	function extractCollector(desc){
		return db2js.extractCachedFunction(desc, db2js.Collectors, 'db2js.Collectors.', db2js.KNOWN_COLLECTORS);
	}
	
	function extractPipeline(pipelineDesc){
		return db2js.extractCachedFunction(pipelineDesc, db2js.Collectors.Pipelines, 'db2js.Collectors.Pipelines.', db2js.KNOWN_COLLECT_PIPELINES);
	}
	
}

/**
 * 通常收集器写为 c|s 前者由控件获取内容，后者设置到对象，中间可插入其它管道，如 c|n|s
 */
db2js.Collectors.Pipelines.c = db2js.KNOWN_COLLECT_PIPELINES['c'] = function(element, value, table, _1, rows, index, row, columnName){
	var newValue = null;
	if('value' in element){
		newValue = element.value;
	} else if('innerHTML' in element){
		newValue = element.innerHTML;
	} else {
		throw new Error('unsupported element type' + element.nodeName);
	}
	return newValue;
}

/**
 * s : set 或 std 的首字母，设置新值到数据对象。用法 collector="c|s"
 * @param newValue got from pipeline function
 */
db2js.Collectors.s = db2js.KNOWN_COLLECTORS['s'] = function(element, newValue, table, _1, rows, index, row, columnName){
	var obj = arguments[arguments.length -2];
	var attr = arguments[arguments.length -1];
	if(newValue === '') newValue = null;
	if(obj != null){	// dont test attr in obj
		if(obj.set){
			obj.set(attr, newValue);
		} else if(obj._set){
			obj._set(attr, newValue);
		} else {
			obj[attr] = newValue;
		}
	}
}

/**
 * 将值转为数字类型。用法 collector="c|n|s"
 * @param element
 * @param newValue
 * @returns 数字
 */
db2js.Collectors.Pipelines.n = db2js.KNOWN_COLLECT_PIPELINES['n'] = function(element, newValue, table, _1, rows, index, row, columnName){
	if(newValue instanceof String) newValue = newValue.trim();
	if(isNaN(newValue)){
		return null;
	} else {
		return newValue * 1;
	}
}

/**
 * 将值转为 Date 类型。用法 collector="c|d|s"
 * @param element
 * @param newValue
 * @returns
 */
db2js.Collectors.Pipelines.d = db2js.KNOWN_COLLECT_PIPELINES['d'] = function(element, newValue, table, _1, rows, index, row, columnName){
	if(newValue instanceof String) newValue = newValue.trim();
	if(!newValue){
		return null;
	} else if(newValue instanceof Date){
		return newValue;
	} else {
		return Date.parse(newValue, element.getAttribute('format'));
	}
}


/**
 * 对支持 setValue/getValue 的 molecule 收集 
 * 用法: colector="m|s"
 */
db2js.Collectors.Pipelines.m = db2js.KNOWN_COLLECT_PIPELINES['m'] = function(element, value, table, _1, rows, index, row, columnName){
	var m = Molecule.of(element);
	if(m == null || !m.getValue){
		return;
	} else {
		return m.getValue();
	}
}


/**
 * repeater 收集器
 * usage:
 * <div data="#authors,rows" collector="repeater">
		<h2 repeater="true"><span data="name" renderer="std"></span></h2>
		<h2 repeater-empty="true">no data found</h2>
	</div>
 */
db2js.Collectors.repeater = function(element, rows){
	var e = $(element);
	var copies = e.find('[repeater-copy]');
	copies.each(function(idx, c){
		var row = $(c).data('repeater-obj');
		if(row) db2js.collect(c, row, true);
	});
}


/**
 * Object Column 值设置器
 * 当 DataRow['field'] 为对象时，如果 element 绑定的是对象的属性，应当使用该收集器。
 * 例如
 * <input data="#table,rows,0,contact,email">
 * 该表的 contact 字段为一JSON字段，表现在前端为一个对象，其中 email 是一个属性，此时应使用如下收集方式 
 * <input data="#table,rows,0,contact,email" collector="c|oc">
 * 
 * 如使用
 * <input data="#table,rows,0,contact,email" collector="c|s">
 * 则编辑时虽然值变化了，但行状态不会变化，将导致数据不提交。
 * 
 * @param element
 * @param newValue
 */
db2js.Collectors.oc = db2js.KNOWN_COLLECTORS['oc'] = function(element, newValue){
	var row = null;
	for(var i=1; i<arguments.length; i++){
		if(arguments[i] instanceof db2js.DataRow){
			row = arguments[i];
			var colname = arguments[i+1];
			
		}
	}
	if(!row) return;
	
	if(row._state == 'none'){
		if(row._origin == null){
			row._origin = JSON.parse(JSON.stringify(row._toJson()));
		}
	}
	
	db2js.Collectors.s.apply(this, arguments);
	
	if(row._state == 'none'){
		if(JSON.stringify(row._toJson()) != JSON.stringify(row._origin)){
			row._state = 'edit';
		}
	}	
}

