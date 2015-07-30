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
 * 标准渲染器，常用 html, input, select 渲染。
 */
db2js.Renderers.std = db2js.KNOWN_RENDERERS['std'] = function(element, value, table, _1, rows, index, row, columnName){
	var e = element, v = value;
	
	if(e.tagName == "INPUT"){
		if(e.type == 'radio'){
			radioRender(e,v);
		} else if(e.type == 'checkbox'){
			checkboxRender(e,v);
		}else {
			inputRender(e,v);
		}
	} else if(e.tagName == "SELECT"){
		inputRender(e,v);
	} else if(e.tagName=='TEXTAREA'){
		inputRender(e,v);
	} else{
		tagRender(e,v);
	}
	
	function inputRender(e, v){
		if(v == null)
			e.value = "";
		else		
			e.value = v;
	}

	function radioRender(e, v){
		if(v == null)
			e.checked = false;
		else
			e.checked = (e.value == v);	
	}

	function checkboxRender(e, v){
		if(v == null)
			e.checked = false;
		else
			e.checked = v;	
	}

	function tagRender(e, v){
		if(v == null){
			e.innerHTML = "&nbsp;";
		} else {		
			e.innerHTML = v;		
		}	
	}
}

/**
 * 适用于 innerHTML 中含有 {{... }} 表达式的渲染器
 * 用法：
 * 	<p data="#table,rows,0" renderer="expr">
 * 		<h1>{{title.toUpperCase()}}<small>{{author}}</small></h1>
 * 		<p>{{content}}</p>
 * 	</p>
 */
db2js.Renderers.expr = db2js.KNOWN_RENDERERS['expr'] = function(e, data){
	if(e.innerHTML.indexOf('{{') != -1){		// 带有表达式 {{}},以参数 row 为出发路径
		e.setAttribute('render-expr', e.innerHTML)
	}
	if(e.hasAttribute('render-expr')){
		var s = e.getAttribute('render-expr');
		var res = '';
		var start = 0;
		for(var offset = s.indexOf('{{', start); offset != -1; offset = s.indexOf('{{', start)){
			res += s.substring(start, offset);
			
			var end = s.indexOf('}}', offset + 2);
			if(end != -1){
				var expr = s.substring(offset + 2, end);
				with(data){
					try{
						res += eval(expr);
					}catch(e){
						res += e.message;
						console.log('eval error, expr : ' + expr);
						console.log(e);
						console.log(data);
					}
				}
				start = end + 2;
			} else {
				s += s.substring(offset);
				break;
			}
		}
		if(start < s.length -1) res += s.substr(start);
		e.innerHTML = res;
	} else {
		//nothing todo
	}
}


/**
 * 用法：
 * 	<div data="#listTable,rows" renderer="options('name','id',true)">
 * 		<select data="#bindTable,rows,N,type"></select>
 *  </div>
 */
db2js.Renderers.options = function(dispCol, valueCol, allowEmpty){
	return function(element, rows, table){
		var sel = $(element).find('select')[0];		// SELECT
		
		while(sel.options.length) sel.options.remove(0);
		
		for(var i=0; i<rows.length; i++){
			if(allowEmpty){
				var option = document.createElement('option');
				option.text = "-";
				option.value = '';
				sel.options.add(option);
			}
			
			for(var i = 0; i < rows.length; i++){
				var option = document.createElement('option');
				var dispCell = rows[i][dispCol];
				var valueCell = rows[i][valueCol];
				if(dispCell) option.text = dispCell;
				if(valueCell) option.value = valueCell;
				sel.options.add(option);
			}
		}
	}
}

/**
 * 用法：
 * <table data="#table" renderer="table">
 * 		<thead>
 * 			<tr>
 * 				<td data-t="rows,N,name" renderer="std"></td>  <!-- 注意  data-t 和  N，是固定用法 -->
 * 				<td data-t="rows,N,remarks" renderer="input('text')"></td>
 * 			</tr>
 * 		</thead>
 * </table>
 * 这里 N 是固定写法，会被替换为行ID
 */
db2js.Renderers.table = db2js.KNOWN_RENDERERS['table'] = function(hTable,  value, table){
	var columnRenders = [];
	var headRow = hTable.tHead.rows[0];
	for(var i=0; i<headRow.cells.length; i++){
		var cell = headRow.cells[i];
		var attrs = {};
		for(var j=0; j<cell.attributes.length; j++){
			var attr = cell.attributes[j].name;
			var v = $(cell).attr(attr);
			switch(attr){
			case 'data-t' : attrs['data'] = v; break;
			default : attrs[attr] = v;
			} 
		}
		columnRenders.push(attrs);
	}
	
	if(hTable.tBodies.length == 0){
		var tBody = hTable.createTBody();
	} else {
		var tBody = hTable.tBodies[0];
		while(tBody.rows.length){
			tBody.rows[0].remove();
		}
	}
	for(var i=0; i<table.rows.length; i++){
		var tr = tBody.insertRow();
		columnRenders.forEach(function(column){
			var cell = document.createElement('td');
			for(var attr in column){if(column.hasOwnProperty(attr)){
				if(attr == 'data'){
					$(cell).attr('data', hTable.getAttribute('data') + ',' + column.data.replace(/,\s*N\s*,/, ',' + i + ','));
				} else {
					$(cell).attr(attr, column[attr]);
				}
			}}
			tr.appendChild(cell);
		});
	}
}

/**
 * 显示为一个输入控件
 * 如：
 * 	<div data="..." renderer="input('text')" renderer-t="std" collector-t="c|s">
 */
db2js.Renderers.input = function(inputType){
	return function(element,  value, table, _1, rows, index, row, columnName){
		element.innerHTML = '';
		var ele = document.createElement('input');
		ele.type = inputType;
		ele.setAttribute('data', element.getAttribute('data'));
		var renderer = element.getAttribute('renderer-t');
		if(renderer){
			ele.setAttribute('renderer', renderer);
		}
		var collector = element.getAttribute('collector-t');
		if(collector){
			ele.setAttribute('collector', collector);
		}
		element.appendChild(ele);
	}
}

/**
 * repeater 渲染器
 * usage:
 * <div data="#authors,rows" renderer="repeater">
		<h2 repeater="true"><span data="name" renderer="std"></span></h2>
		<h2 repeater-empty="true">no data found</h2>
	</div>
 */
db2js.Renderers.repeater = function(element, rows){
	var e = $(element);
	var copies = e.find('[repeater-copy]');
	copies.each(function(idx, c){c.remove()});

	var repeater = e.find('[repeater]');
	repeater.hide();
	
	if(rows.length == 0){
		e.find('[repeater-empty]').show();
	} else {
		e.find('[repeater-empty]').hide();
		var prev = repeater;
		for(var i=0; i<rows.length; i++){
			var r = repeater.clone();
			r.attr('repeater-copy', true);
			db2js.render(r[0], rows[i], true);
			r.show();
			r.insertAfter(prev);
			prev = r;
		}
	}
}

/**
 * bootstrap 渲染器
 */
db2js.Renderers.bootstrap = {}

/**
 * renderer="bootstrap.label('default')", renderer="bootstrap.label('primary')" etc 
 */
db2js.Renderers.bootstrap.label = function(level){
	level = level || 'default';
	return function(element, value, table, _1, rows, index, row, columnName){
		element.innerHTML = value + '';
		element.className = 'label label-' + level;
	}
}

db2js.Renderers.bootstrap.badge = db2js.KNOWN_RENDERERS['bootstrap.badge'] = function(element, value, table, _1, rows, index, row, columnName){
	element.innerHTML = value + '';
	element.className = 'badge';
}

/**
 * 分页组件
 * 用法：
 * 
 * <nav>
	  <ul class="pagination" data="#table" renderer="pagination">
	  </ul>
   </nav>
 * @param element
 * @param value
 * @param table
 */
db2js.Renderers.pagination = db2js.KNOWN_RENDERERS['pagination'] = function(element,  value, table){
	var ul = $(element);
	ul.html('');
	
	var isFirstPage = (table.page == 0);
	var isLastPage = (table.page >= table.pageCount -1);
	
	var li = $(document.createElement('li')).appendTo(ul);
	if(isFirstPage) li.addClass('disabled');
	
	var a = $(document.createElement('a')).appendTo(li);
	a.attr('aria-label', 'Previous');
	a.href = '###';
	if(!isFirstPage){
		a.on('click', function(){
			table.navigatePage(table.page - 1);
		});
	}
	a.html('<span aria-hidden="true">&laquo;</span>');
	
	for(var i=0; i < table.pageCount; i++){
		var li = $(document.createElement('li')).appendTo(ul);
		var a = $(document.createElement('a')).appendTo(li);
		a.href = '###';
		if(i == table.page){
			li.addClass('active');
			a.html((i+1) + '<span class="sr-only">(current)</span>');
		} else {
			a.attr('page', i);
			a.on('click', function(){
				table.navigatePage(this.getAttribute('page'));
			});
			a.html((i + 1));
		}
	}
	
	var li = $(document.createElement('li')).appendTo(ul);
	if(isLastPage) li.addClass('disabled');
	
	var a = $(document.createElement('a')).appendTo(li);
	a.attr('aria-label', 'Next');
	a.href = '###';
	if(!isLastPage){
		a.on('click', function(){
			table.navigatePage(table.page + 1);
		});
	}
	a.html('<span aria-hidden="true">&raquo;</span>');
	
}

/**
 * 标准错误渲染器
 * @param element
 * @param value
 * @param table
 * @param _1
 * @param rows
 * @param index
 * @param row
 * @param columnName
 */
db2js.Renderers.stderr = db2js.KNOWN_RENDERERS['stderr'] = function(element,  value, table, _1, rows, index, row, columnName){
	var e = $(element), v = value;
	if(value == null){
		e.addClass('hide');
	} else {
		e.attr('class', '');
		switch(v.level){
		case 'warning' :
			e.addClass('label label-warning');
			break;
		default :
			e.addClass('label label-danger');
		}
		e.html(value.message);
	}
}

/**
 * 字段错误渲染器
 * @param element
 * @param value
 * @param table
 * @param _1
 * @param rows
 * @param index
 * @param row
 * @param columnName
 */
db2js.Renderers.flderr = db2js.KNOWN_RENDERERS['flderr'] = function(element,  value, table, _1, rows, index, row, columnName){
	var e = $(element), v = value;
	var helpDiv = e.find('.help-block.with-errors');
	if(helpDiv.length == 0){
		helpDiv = $(document.createElement('div')).appendTo(e);
		helpDiv.addClass('help-block with-errors');
	}
	if(value == null){
		e.removeClass('has-error');
		helpDiv.html('');
	} else {
		e.addClass('has-error');
		helpDiv.html(value.message || value + '');
	}
}


