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
function Molecule(container){
	this.container = container;
	if(container.length == 0) debugger;
	var me = this;
	container.on('DOMNodeRemoved', function(evt){
		if(container.is(evt.target)){
			me.dispose && me.dispose();
			delete Molecule.instances[me.id];
		}
	});
	this.moleculeType = container.attr('molecule-obj') || container.attr('molecule-def');
	
	container.on('focus', function(ele){
		me.focus && me.onfocus();
	});
	container.on('blur', function(ele){
		me.blur && me.onblur();
	});
	
	this.release = function(){
		container.remove();
	}
}

Molecule._nextId = 1;
Molecule.nextId = function(){return Molecule._nextId ++; }
Molecule.instances = {};

Molecule.create = function(fun, currentScript){
	currentScript = currentScript 
				|| document.getElementById('molecule');		// for ie
	if(currentScript == null){
		throw new Error('cannot retreive current script');
	}
	var forSilbling = currentScript.hasAttribute('molecule-for');
	var container = null;
	if(forSilbling){
		container = $(currentScript.previousElementSibling);
	} else {
		container = $(currentScript).closest('[molecule-obj]');
	}
	
	if(!container.length){
		container = $(currentScript).closest('[molecule-def]');
		if(!Molecule.TEST_DEFINE){
			return;
		}
	} else {
		if(container.attr('molecule-def')) return;	// 不对molecule声明创建实例
	}
	if(!container.length){
		throw new Error('container must has molecule-obj attribute');
	}
	var id = Molecule.nextId();
	var p = new Molecule(container);
	p.id = id;
		
	//fun.prototype = p;
	var args = [];
	for(var i=2; i<arguments.length; i++) args.push(arguments[i]);
	//var obj = new (Function.prototype.bind.apply(fun, args));
	fun.apply(p, args);
	var obj = p;
	Molecule.instances[id] = obj;
	var existed = obj.container.attr('molecule-id');
	if(existed){
		obj.container.attr('molecule-id',  existed + ',' + id);
	} else {
		obj.container.attr('molecule-id',  id);
	}
	
	if(container.attr('molecule-obj')){
		$(currentScript).remove();		// remove define script
	}
	
	return obj;
}

Molecule.of = function(element){
	var ids = $(element).attr('molecule-id');
	if(!ids) return null;
	if(ids.indexOf(',') != -1){
		return ids.split(',').map(function(id){return Molecule.instances[id]});;
	} 
	return Molecule.instances[ids];
}

/**
 * 是否正在测试原型定义页面。测试原型定义页面时，不创建实例，不删除用于定义原型的 HTML 元素。
 */
Molecule.TEST_DEFINE = false;

Molecule.ModulesPath = '/db2js/molecules/';

Molecule.defines = {};
Molecule.definesByFullname = {};		// defines by fullname

Molecule.scanDefines = function(){
	$('[molecule-def]').each(function(idx, ele){
		var e = $(ele);
		var fullname = e.attr('molecule-def');
		var depends = e.attr('molecule-depends');
		ele.removeAttribute('molecule-def');
		
		var r = Molecule.getModuleName(fullname);

		var m = Molecule.defines[r.module];
		if(m == null){
			m = Molecule.defines[r.module] = {};
		}
		console.log('define molecule ' + fullname);
		
		var def = {name : r.name, depends : depends && depends.split(','), appeared : true, html : ele.outerHTML};
		
		var script = $(ele.nextElementSibling);
		if(script.length && (script.attr('molecule-for') == fullname || script.attr('molecule-for') == r.name)){
			def.script = script[0].innerHTML;
			script.remove();
		}
		
		Molecule.definesByFullname[fullname] = m[r.name] = def;
		
		if(!Molecule.TEST_DEFINE) $(ele).remove();
	});
}

Molecule.loadedModules = {};
Molecule.loadModule = function(module){
	var result = false;
	$.ajax({
		url : Molecule.ModulesPath + '/' + module + '.json',
		async : false, type : 'get',
		complete : function(resp, status){
			if(status == 'success'){
				resp = resp.responseJSON;
				for(var k in resp){ if(resp.hasOwnProperty(k)){
					var m = Molecule.defines[module];
					if(m == null){
						m = Molecule.defines[module] = {};
					}
					
					Molecule.definesByFullname[module + '.' + k] = m[k] = resp[k];
				}};
				Molecule.loadedModules[module] = true;
				result = true;
			}
		}
	});
	return result;
}

Molecule.getModuleName = function(fullname){
	var module = 'noname', name=fullname;
	if(fullname.lastIndexOf('.') != -1){
		var p = fullname.lastIndexOf('.');
		module = fullname.substring(0, p);
		name = fullname.substr(p + 1);
	}
	return {module : module, name : name};
}

Molecule.scanMolecules = function(starter){
	var stk = [starter || document.body];
	while(stk.length){
		var ele = stk.pop();
		if(ele.hasAttribute('molecule')){
			var ele = createMolecule(ele);
		}
		for(var i=ele.children.length-1; i>=0; i--){
			stk.push(ele.children[i]);
		}
	}
	
	function createMolecule(ele){
		var fullname = ele.getAttribute('molecule');
		var def = Molecule.definesByFullname[fullname];
		var moduleDesc = Molecule.getModuleName(fullname);
		var name = moduleDesc.name;
		var module = moduleDesc.module;
		if(def == null){
			if(Molecule.loadedModules[module] == null){
				if(!Molecule.loadModule(module)){
					throw new Error(module + ' load failed, ' + name + ' cannot create');
				}
			}
			def = Molecule.defines[module][name];
		} 
		if(!def){
			throw new Error(name + ' not found in ' + module + ', please check whether this molecule exists');
		}
		if(!def.appeared){
			ensureDepends(def);
			def.appeared = true;
		}
		var p = ele.parentElement;
		var pos = getIndexInParent(ele, p);
		
		var inner = ele.innerHTML;		// 保留原来的子节点
		
		var replaceInnerHtml = (def.html.indexOf('<!-- {INNER_HTML} -->') != -1);		// Inner Html 替换点，实例自身的 html 默认放在最末尾，如果指定了替换点，则放置于替换点
		
		ele.outerHTML = replaceInnerHtml ? def.html.replace('<!-- {INNER_HTML} -->', inner) : def.html;
		var instance = p.children[pos];
		var inherited = (instance.hasAttribute('molecule') && instance.getAttribute('molecule') != fullname); // 继承自另一 molecule
		for(var i=0; i<ele.attributes.length; i++){
			var attr = ele.attributes[i].name;
			if(attr.indexOf('molecule') == 0) continue;
			
			var v = ele.getAttribute(attr);
			if(attr == 'class' && v && v.charAt(0) == '+'){		// molecule="block" class="+ myclass"
				v = instance.getAttribute(attr) + ' ' + v.substr(1);
			} else if(attr == 'style' && v && v.charAt(0) == '+'){
				v = instance.getAttribute(attr) + ' ' + v.substr(1);
			}
			instance.setAttribute(attr, v);
		}
		instance.setAttribute('molecule-obj', fullname);
		if(inherited){
			instance = createMolecule(instance);
		} else {
			instance.removeAttribute('molecule');
		}
		
		if(!replaceInnerHtml){
			instance.insertAdjacentHTML('beforeEnd', inner);
		}
		
		if(def.script){
			var script = document.createElement('script');
			script.setAttribute('molecule-for', fullname);
			script.id = 'molecule';
			script.innerHTML = def.script;
			instance.parentElement.insertBefore(script, instance.nextSilbling);
		}
		
		resetScripts(instance);
		
		if(!def.defined){
			def.html = removeDefineScript(def.html);
			def.defined = true;
		}
		
		return instance;
	}
	
	function ensureDepends(def){
		if(def.depends && def.depends.length){
			def.depends.forEach(function(depend){
				if(Molecule.defines[depend] == null){
					if(Molecule.loadModule(depend)){// 不需要显示写递归，如果引用进的分子需要辗转引用其它包，在初始化元素该分子时即会发生
						throw new Error('depend module ' + module + ' load failed, ' + def.name + ' cannot create');
					}
				}
			});
		}
	}
	
//	function ensureDepends(def){
//		if(def.depends && def.depends.length){
//			def.depends.forEach(function(depend){
//				var md = Molecule.defines[depend];
//				if(md == null) throw new Error('molecule ' + depend + ' not defined whice depeneded at ' + def.name);
//				if(!md.appeared){
//					ensureDepends(md);
//					init(md);
//				}
//			});
//		}
//	}
//	
//	function init(def){		// 让代码执行一次，相应的函数可得到创建，是否有必要，似乎不一定
//		var plat = $(document.createElemnt('div'));
//		plat.appendTo(document.body).hide();
//		var item = $(document.createElemnt(def.tagName));
//		item.outerHTML = def.html;
//		item.appendTo(plat);
//		resetScripts(plat);
//		plat.remove();
//		def.appeared = true;
//	}
	
	function resetScripts(ele){		// 不如此不能让 script 再次运行
		$(ele).find('script').each(function(idx, script){
			var p = script.parentElement;
			var copy = document.createElement('script');
			copy.innerHTML = script.innerHTML;
			for(var i=0; i<script.attributes.length; i++){
				var attr = script.attributes[i].name;
				copy.setAttribute(attr, script.getAttribute(attr));
			}
			var sibling = script.nextSibling;
			$(script).remove();
			
			if(sibling) {
				p.insertBefore(copy, sibling);
			} else {
				p.appendChild(copy);
			}
		});
	}
	
	function removeDefineScript(html){		// 移除以 // MOLECULE_DEF ... // MOLECULE_DEF_END 括号包围的部分
		if(html.indexOf('MOLECULE_DEF') == -1) return html;
		
		//return html.replace(/\/\/(\s*)MOLECULE_DEF(\s*)[\r\n|\r|\n](.|\s)*[\r\n|\r|\n]\s*\/\/\s*MOLECULE_DEF_END/g, '');
		
		//var reg = /\/\/\s*MOLECULE_DEF(.|\s)*\/\/\s*MOLECULE_DEF_END/m;
		//return html.replace(reg, '');		// js 不支持这么复杂的表达式，会死不会报错
		
		var reg1 = /\/\/\s*MOLECULE_DEF/, reg2 = /\/\/\s*MOLECULE_DEF_END/;
		var arr = html.split(/\r\n|\n|\r/g), arr2 = [];
		for(var i=0; i<arr.length; i++){
			if(reg1.test(arr[i])){
				for(i= i+1;i<arr.length; i++){
					if(reg2.test(arr[i])){
						i++;
						break;
					}
				}
			}
			arr2.push(arr[i]);
		}
		return arr2.join('\r\n');
	}
	
	function getIndexInParent(ele, parent){
		for(var pos = 0; pos < parent.children.length; pos ++){
			if(parent.children[pos] == ele) return pos;
		}
		return -1;
	}
}



while(Array.prototype.defCss == null){		// i dont known why plug this function always faild, so...
	/**
	 * 使用 js 定义 css
	* [{$ : 'p', color : 'red', 'font-size' : 'large'}, {$ : 'h1', color : 'blue'}];
	*/
	Array.prototype.defCss = function(container){
		container == container || document.head;
		var styleElement = document.createElement("style");
        styleElement.type = "text/css";
        container.appendChild(styleElement);
        
        var styleSheet = styleElement.sheet;
		for(var i=0; i<this.length; i++){
			var rule = this[i];
			var selector = rule.$;
			var rules = '';
			for(var attr in rule){ if(rule.hasOwnProperty(attr) && attr != '$'){
				rules += attr.replace(/_/g, '-') + ':' + rule[attr] + ';';
			}}
			if (styleSheet.insertRule)
	            styleSheet.insertRule(selector + ' {' + rules + '}', styleSheet.cssRules.length);
	        else if (styleSheet.addRule)
	            styleSheet.addRule(selector, rules);
	        			
		}
        return styleElement;
	}
}


$(document).ready(function(){
	Molecule.scanDefines();
	Molecule.scanMolecules();
	
	$(document).on('DOMNodeInserted', function(e){
		// console.log('insert ' + e.target.tagName);
		var target = (e.originalEvent.target || e.target);
		if(target.tagName){		// 可能嵌套于未声明为 molecule的元素中，<div><div molecule=...></div></div>, 仅能收到外层 div 的事件
			Molecule.scanMolecules(target);
		}
	});
});	