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
	return value.format(element.getAttribute('format'));
}

/**
 * 词典值
 * usage : <input renderer="dict({N:'正常', S:'停用'})|std">
 */
db2js.Renderers.Pipelines.dict = function(dict){
	return function(element, value, table, _1, rows, index, row, columnName){
		if(value == null) return '';
		return dict[value] || '';
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
