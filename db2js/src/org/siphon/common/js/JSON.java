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

import javax.script.Invocable;
import javax.script.ScriptEngine;
import javax.script.ScriptException;

import jdk.nashorn.api.scripting.NashornScriptEngine;
import jdk.nashorn.api.scripting.ScriptObjectMirror;
import jdk.nashorn.internal.runtime.ConsString;

import org.apache.commons.lang3.ObjectUtils;

public class JSON {


	NashornScriptEngine engine;
	private ScriptObjectMirror json;
	private Object parseDate;
	
	public JSON(ScriptEngine jsEngine) {
		this.engine = (NashornScriptEngine) jsEngine;
		try {
			this.json = (ScriptObjectMirror) jsEngine.eval("JSON");
			this.parseDate = jsEngine.eval("parseDate");
		} catch (ScriptException e) {
		}
	}

	public String stringify(Object obj) throws UnsupportedConversionException {
		try{
			return (String) json.callMember("stringify", obj);
		}catch(Exception e){
			throw new UnsupportedConversionException("json stringify failed", e);
		}
	}
	
	public String tryStringify(Object obj) {
		try{
			return (String) json.callMember("stringify", obj);
		}catch(Exception e){
			return obj.toString();
		}
	}


	public Object parse(String jsonStr) throws Exception {
		try {
			return this.json.callMember("parse", jsonStr);
		} catch (Exception e) {
			throw new Exception(json + " cannot parsed", e);
		} finally {
		}
	}

}
