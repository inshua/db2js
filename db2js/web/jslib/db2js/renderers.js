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
		e.dataset['render_expr'] = e.innerHTML;
	}
	if(e.dataset['render_expr']){
		var s = e.dataset['render_expr'];
		var res = '';
		var start = 0;
		for(var offset = s.indexOf('{{', start); offset != -1; offset = s.indexOf('{{', start)){
			res += s.substring(start, offset);
			
			var end = s.indexOf('}}', offset + 2);
			if(end != -1){
				var expr = s.substring(offset + 2, end);
				with(data){
					try{
						res += (function(s){return eval(s)}).call(data, expr);
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
		
		if(allowEmpty){
			var option = document.createElement('option');
			option.text = "-";
			option.value = '';
			sel.options.add(option);
		}
		if(!rows) return;
		for(var i=0; i<rows.length; i++){
			var option = document.createElement('option');
			var dispCell = rows[i][dispCol];
			var valueCell = rows[i][valueCol];
			if(dispCell) option.text = dispCell;
			if(valueCell) option.value = valueCell;
			sel.options.add(option);
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

	var tBodyEmpty = hTable.querySelector('tbody.empty');
	var tBody = hTable.querySelector('tbody.data');
	if(tBody == null){
		var tBody = hTable.createTBody();
		tBody.className = 'data';
	} else {
		while(tBody.rows.length){
			tBody.rows[0].remove();
		}
	}
	if(table.rows.length == 0){
		if(tBodyEmpty) tBodyEmpty.style.display = '';
	} else {
		if(tBodyEmpty) tBodyEmpty.style.display = 'none';
		for(var i=0; i<table.rows.length; i++){
			var tr = tBody.insertRow();
			if(headRow.hasAttribute('data')){
				tr.setAttribute('data', hTable.getAttribute('data') + ',' + headRow.getAttribute('data').replace(/,\s*N/, ',' + i));
			}
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
	repeater = repeater.toArray().filter(function(r){
		return $(r).closest('[renderer=repeater]').is(e);
	})
	if(repeater.length == 0) return console.error('repeater child not found');
	
	repeater.forEach(function(e, idx){ $(e).hide().attr('no-collect', 'true'); });
	
	if(rows == null || rows.length == 0){
		e.find('[repeater-empty]').show();
	} else {
		e.find('[repeater-empty]').hide();
		var prev = repeater[repeater.length-1];
		for(var rowIndex=0; rowIndex<rows.length; rowIndex++){
			var row = rows[rowIndex];
			var tpl = repeater.filter(function(item, idx){
				if(item.hasAttribute('when')){
					with(row){
						return eval(item.getAttribute('when'));
					}
				} else {
					return true;
				}
			})[0];
			if(!tpl) continue;
			
			var r = $(tpl).clone();
			r.find('[molecule-r]').each(function(idx, e){
				$(e).attr('molecule', $(e).attr('molecule-r')); 
			});
			r.attr('repeater-copy', true);			
			
			r.data('repeater-obj', row);
			r.insertAfter(prev);
			db2js.render(r[0], row, true);
			r.show();
			prev = r;
		}
	}
	return 'break';
}

/**
 * 对支持 setValue/getValue 的 molecule 渲染
 */
db2js.Renderers.molecule = db2js.KNOWN_RENDERERS['molecule'] = function(element, value, table, _1, rows, index, row, columnName){
	var m = Molecule.of(element);
	if(m != null){
		if(m.setValue){
			m.setValue(value);
		}
	} else if(element.hasAttribute('molecule')){	// 还不是 molecule-obj
		$(element).on('molecule-init', function a(){
			$(element).off('molecule-init', a);
			var m = Molecule.of(element);
			m.setValue && m.setValue(value);
		})
	}
}


