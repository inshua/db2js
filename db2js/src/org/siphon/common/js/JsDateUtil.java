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
package org.siphon.common.js;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;

import javax.script.CompiledScript;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;

import jdk.nashorn.api.scripting.NashornScriptEngine;
import jdk.nashorn.api.scripting.ScriptObjectMirror;
import jdk.nashorn.internal.objects.NativeDate;

import org.apache.log4j.Logger;
import org.apache.log4j.PropertyConfigurator;

import sun.org.mozilla.javascript.internal.Context;
import sun.org.mozilla.javascript.internal.IdScriptableObject;
import sun.org.mozilla.javascript.internal.Scriptable;

public class JsDateUtil {

	private static Logger logger = Logger.getLogger(JsDateUtil.class);
	
	private final NashornScriptEngine engine;

	private CompiledScript newDate;

	

	public JsDateUtil(ScriptEngine jsEngine){
		this.engine = (NashornScriptEngine) jsEngine;
		try {
			this.newDate = this.engine.compile("new Date()");
		} catch (ScriptException e) {
		}
		
	}
	
	public Object toNativeDate(double time) throws ScriptException{
		ScriptObjectMirror m =  (ScriptObjectMirror) newDate.eval();
		NativeDate.setTime( m.to(NativeDate.class), time);
		return m;
	}
	
	public long getTime(ScriptObjectMirror nativeDate){
		NativeDate date = nativeDate.to(NativeDate.class);
		return (long) NativeDate.getTime(date);
	}
	
	public boolean isNativeDate(Object o){
		return o instanceof ScriptObjectMirror && ((ScriptObjectMirror)o).isInstanceOf(NativeDate.class);
	}
	
	
}
