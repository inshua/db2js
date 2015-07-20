package test.js;

import javax.script.Bindings;
import javax.script.ScriptEngine;
import javax.script.ScriptException;

import org.siphon.common.js.JsEngineUtil;

import jdk.nashorn.api.scripting.ScriptObjectMirror;

public class CrossEngineTest {
	public static void main(String[] args) throws ScriptException {

		ScriptEngine engine1 = JsEngineUtil.newEngine();
		ScriptEngine engine2 = JsEngineUtil.newEngine();
		
		Object o = engine1.eval("(function(){return {name : 'jack', age : 1, printName : function(){print(this.name)}}})()");
		
		Bindings bindings = engine2.createBindings();
		bindings.put("o", o);
		
		engine2.eval("o.printName()", bindings);
		engine2.eval("o[printName].call(o)", bindings);
	}
}
