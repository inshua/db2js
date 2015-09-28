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
 * @class 渲染器
 */
db2js.Renderers = function(){}

db2js.Renderers.Pipelines = function(){}	// 管道函数

db2js.KNOWN_RENDERERS = {};

db2js.KNOWN_RENDER_PIPELINES = {};

db2js.Renderers.EmbedRenderers = {};
db2js.Renderers.EmbedRenderers.nextId = 1;
db2js.Renderers.EmbedRenderers.codeMap = {};

(function addcss(){
	var css = document.createElement("style");
	css.type = "text/css";
	css.innerHTML = "render {display : none;}";
	document.head.appendChild(css);
})();

/**
 * 发起渲染函数
 */
db2js.render = function(htmlElement, baseData, direct){
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
		var renderer = e.getAttribute('renderer');
		var embedRenderer = $(e).find('renderer');
		if(embedRenderer.length){
			var emb = prepareEmbedRenderer(embedRenderer.html());
			renderer = renderer ? renderer + '|' + emb : emb;
		}
		if(dataPath && renderer){
			var data = [e]; 
			var match = db2js.extractData(baseData, dataPath, data, direct);
			if(match){
				if(e.hasAttribute('trace-render')) debugger;
				
				data.splice(1, 0, data[data.length - 1]);		// value 始终作为第二个参数
				
				var pipelined = (renderer.indexOf('|') != -1);
				if(pipelined){		// pipeline 函数仅翻译值，其有可能会加 html 效果
					var parr = renderer.split('|');
					for(var i=0; i<parr.length - 1; i++){
						var fun = extractPipeline(parr[i].trim());
						if(fun != null) {
							var piped = fun.apply(null, data);
							data[1] = piped;
						}
					}
					renderer = parr[parr.length -1];
				} 
				var fun = extractRenderer(renderer.trim());
				var r = fun.apply(null, data);				
				$(e).trigger('db2js.rendered', data);
				if(r == 'break') continue;
			}
		}
		
		if(e.children.length){
			for(var i=e.children.length -1; i>=0; i--){
				stk.push(e.children[i]);
			}
		}
	}
	
	function extractRenderer(rendererDesc){
		return db2js.extractCachedFunction(rendererDesc, db2js.Renderers, 'db2js.Renderers.', db2js.KNOWN_RENDERERS);
	}
	
	function extractPipeline(pipelineDesc){
		return db2js.extractCachedFunction(pipelineDesc, db2js.Renderers.Pipelines, 'db2js.Renderers.Pipelines.', db2js.KNOWN_RENDER_PIPELINES);
	}
	
	function prepareEmbedRenderer(code){
		var id = db2js.Renderers.EmbedRenderers.codeMap[code];
		if(id){
			return id;
		} else {
			id = db2js.Renderers.EmbedRenderers.nextId ++;
			id = '__embed_renderer__' + id;
			code = '(function ' + id + '(element, value, table, _1, rows, index, row, columnName){ \r\n' + code + '\r\n})';
			var fun = window.eval(code);
			db2js.Renderers.EmbedRenderers.codeMap[code] = id;
			db2js.Renderers[id] = fun;
			return id;
		}
	}
}

/**
 * 按 element 指定的 data 路径定位数据
 */
db2js.locateData = function(element, baseData, direct){
	if(element.jquery) element = element[0];
	baseData = baseData || db2js.dataset;
	var dataPath = element.getAttribute('data');
	var data = [];
	if(dataPath == null) return null;
	this.extractData(baseData, dataPath, data, direct);
	data.splice(0, 0, data[data.length - 1]);		// value 设为第一个值
	return data;
}

db2js.extractData = function(baseData, dataPath, output, direct){
	var arr = dataPath.split(',');
	var attr = arr[0].trim();		// 对象，通常为表名
	var start = baseData;
	
	var i = 0;
	if(attr.charAt(0) == '#'){		// find db2js attr in descendent
		var selector = attr.substr(1);
		var found = false;
		if(baseData['db2js'] == selector) {
			// start = baseData;		
			found = true;
		} else {
			var history = [];
			for(var stk = [baseData]; stk.length;){
				if(stk.length > 100) debugger;
				var obj = stk.pop();
				history.push(obj);
				if(obj != null && obj['db2js'] == selector){
					start = obj;
					found = true;
					break;
				}
				if((typeof obj == 'object' || typeof obj == 'function') && obj && !obj['isDb2jsTerm']){
					for(var k in obj){
						var v = obj[k];
						if(history.indexOf(v) == -1){
							stk.push(v);
						}
					}
				}
			}
		}
		if(!found) return false;
		i = 1;		// by-pass the selector;
	} else {
		if(!direct) return false;		// 只有direct方式可以不使用命中器
	}
	output.push(start);
	
	if(arr.length == 1 && arr[0] == 'this') return true;	// 像这种<p data="this"></p>只为命中本身
	
	var obj = start;
	for(; i<arr.length; i++){
		var a = arr[i].trim();
		if(!isNaN(a)){
			output.push(a * 1);		// 数字，应该是个索引
		} else {
			output.push(a);
		}
		if(obj != null) obj = obj[a];
		output.push(obj);
	}
	return true;
}



db2js.extractCachedFunction = (function(){
	var JsSymbols = '~!@#%^&*()-+=[]{}\|;:\'",.<>/? \r\n\t';
	return function(desc, functions, functionsStr, cache){
	
		if(cache[desc]) return cache[desc];
		
		var r = functions[desc];
		if(!r){
			if(desc.indexOf(functionsStr) == -1){
				desc = functionsStr + desc; 
			}
			r = window.eval(desc);
		} 
		cache[desc] = r;
		return r;
	}
})();
