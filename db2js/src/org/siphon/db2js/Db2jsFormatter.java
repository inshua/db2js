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
package org.siphon.db2js;

import javax.servlet.http.HttpServletResponse;

import org.siphon.common.js.JsTypeUtil;
import org.siphon.db2js.jshttp.JsEngineHandlerContext;

import jdk.nashorn.api.scripting.ScriptObjectMirror;
import jdk.nashorn.internal.objects.NativeJSON;
import jdk.nashorn.internal.runtime.Context;
import jdk.nashorn.internal.runtime.ScriptObject;

public class Db2jsFormatter extends Formatter {

	@Override
	public String formatQueryResult(Object queryResult, String message, JsEngineHandlerContext engineContext) throws Exception {
		if (engineContext.getJsTypeUtil().isNull(queryResult))
			return "{\"success\" : true}";
		else
			return engineContext.getJson().stringify(queryResult);
	}

	@Override
	public String formatRow(Object row, String message, JsEngineHandlerContext engineContext) throws Exception {
		return engineContext.getJson().stringify(row);
	}

	@Override
	public String formatException(Object exception, JsEngineHandlerContext engineContext) throws Exception {
		if (exception instanceof ScriptObjectMirror){
			return formatException(engineContext.getJsTypeUtil().getSealed((ScriptObjectMirror) exception), engineContext);
		} else if( exception instanceof ScriptObject) {
			
		} else if(exception instanceof Throwable){
			exception = ((Throwable) exception).getMessage();
		} else {
			exception = exception.toString();
		}
		ScriptObjectMirror result = engineContext.getJsTypeUtil().newObject();
		result.put("error", exception);

		return engineContext.getJson().stringify(result);
	}

	@Override
	public String formatException(String exception, JsEngineHandlerContext engineContext) throws Exception {
		JsTypeUtil jsTypeUtil = engineContext.getJsTypeUtil();

		ScriptObjectMirror result = jsTypeUtil.newObject();
		result.put("error", exception);

		return engineContext.getJson().stringify(result);

	}

	@Override
	public String formatExecuteResult(HttpServletResponse response, int number, JsEngineHandlerContext engineContext) {
		return null;
	}

	@Override
	public void writeHttpHeader(HttpServletResponse response, JsEngineHandlerContext engineContext) {
		response.setContentType("application/json");
		response.setCharacterEncoding("utf-8");
		response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, post-check=0, pre-check=0");
		response.setHeader("Connection", "Keep-Alive");
		response.setHeader("Pragma", "no-cache");

	}

}
