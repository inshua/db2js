db2js.Renderers.pagination = db2js.KNOWN_RENDERERS['pagination'] = function(element,  value, table){
	var ul = $(element);
	ul.html('');
	
	var isFirstPage = (table.page == 0);
	var isLastPage = (table.page >= table.pageCount -1);
	
	var a = $(document.createElement('a')).appendTo(ul);
	a.addClass('icon item');
	if(isFirstPage) a.addClass('disabled');
	a.href = '###';
	if(!isFirstPage){
		a.on('click', function(){
			table.navigatePage(table.page - 1);
		});
	}
	a.html('<i class="left chevron icon"></i>');
	
	for(var i=0; i < table.pageCount; i++){
		var a = $(document.createElement('a')).appendTo(ul);
		a.addClass('item');
		a.href = '###';
		if(i == table.page){
			a.addClass('active');
			a.html(i+1);
		} else {
			a.attr('page', i);
			a.on('click', function(){
				table.navigatePage(this.getAttribute('page'));
			});
			a.html((i + 1));
		}
	}
	
	
	var a = $(document.createElement('a')).appendTo(ul);
	if(isLastPage) a.addClass('disabled');
	a.addClass('icon item')
	a.href = '###';
	if(!isLastPage){
		a.on('click', function(){
			table.navigatePage(table.page + 1);
		});
	}
	a.html('<i class="right chevron icon"></i>');
	
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
		e.hide();
	} else {
		e.attr('class', '');
		switch(v.level){
		case 'warning' :
			e.addClass('ui yellow message');
			break;
		default :
			e.addClass('ui red message');
		}
		e.html(value.message);
		e.show();
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
	if(e.is('.ui.orange.label')){
		helpDiv = e;
		e = helpDiv.parent();
	} else {
		helpDiv = e.find('.ui.orange.label');
		if(helpDiv.length == 0){
			helpDiv = $(document.createElement('div')).appendTo(e).addClass('ui orange label');
		}
	}	
	if(value == null){
		e.closest('.field').removeClass('error');
		helpDiv.html('').hide();
	} else {
		e.closest('.field').addClass('error');
		helpDiv.html(value.message || value + '').show();// .css('display', 'inline-block');
	}
}
