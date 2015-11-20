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
	[{$:'.pagination > .active > a, .pagination > .active > span, .pagination > .active > a:hover, .pagination > .active > span:hover, .pagination > .active > a:focus, .pagination > .active > span:focus, .pagination > li > a:hover, .pagination > li > span:hover, .pagination > li > a:focus, .pagination > li > span:focus'
		,cursor : 'pointer'
	}].defCss();
	
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
	var helpDiv = null;
	if(e.is('.help-block.with-errors')){
		helpDiv = e;
		e = helpDiv.parent();
	} else {
		helpDiv = e.find('.help-block.with-errors');
		if(helpDiv.length == 0){
			helpDiv = $(document.createElement('div')).appendTo(e);
			helpDiv.addClass('help-block with-errors');
		}
	}	
	if(value == null){
		e.removeClass('has-error');
		helpDiv.html('');
	} else {
		e.addClass('has-error');
		helpDiv.html(value.message || value + '');
	}
}