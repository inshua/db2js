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

import java.io.File;
import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Struct;
import java.util.Map;
import java.util.NoSuchElementException;

import javax.naming.Context;
import javax.naming.InitialContext;
import javax.naming.NamingException;
import javax.rmi.PortableRemoteObject;
import javax.script.Invocable;
import javax.script.ScriptEngine;
import javax.script.ScriptException;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.sql.DataSource;

import jdk.nashorn.api.scripting.ScriptObjectMirror;
import jdk.nashorn.internal.runtime.ScriptObject;

import org.apache.catalina.startup.EngineConfig;
import org.apache.commons.dbcp.BasicDataSource;
import org.apache.commons.lang3.ObjectUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.log4j.Logger;
import org.apache.log4j.PropertyConfigurator;
import org.siphon.common.js.JSON;
import org.siphon.common.js.JsEngineUtil;
import org.siphon.common.js.JsTypeUtil;
import org.siphon.db2js.jshttp.JsEngineHandlerContext;
import org.siphon.db2js.jshttp.JsServlet;
import org.siphon.db2js.jshttp.ServerUnitManager;
import org.siphon.db2js.jshttp.Task;
import org.siphon.jssp.JsspRequest;
import org.siphon.jssp.JsspWriter;

public class DbjsRunner {

	private static Logger logger = Logger.getLogger(DbjsRunner.class);

	protected ServerUnitManager dbjsManager = null;

	private final static DataFormaterManager formaterManager = new DataFormaterManager();

	private final Formatter formatter = new Db2jsFormatter();

	protected final DataSource dataSource;

	protected Map<String, Object> otherArgs;

	public synchronized Map<String, Object> getOtherArgs() {
		return otherArgs;
	}

	public synchronized void setOtherArgs(Map<String, Object> otherArgs) {
		this.otherArgs = otherArgs;
	}

	public DbjsRunner(DataSource dataSource, DbjsUnitManager dbjsManager) {
		this.dataSource = dataSource;
		this.dbjsManager = dbjsManager;
	}

	public void run(HttpServletRequest request, HttpServletResponse response, String method)
			throws ServletException, IOException {
		String jsfile = request.getServletContext().getRealPath(request.getServletPath());
		if (!new File(jsfile).exists()) {
			response.setStatus(404);
			PrintWriter out = response.getWriter();
			out.print(request.getServletPath() + " not found");
			out.flush();
			return;
		}

		JsEngineHandlerContext engineContext = null;
		try {
			engineContext = dbjsManager.getEngineContext(jsfile, request.getServletPath(), dataSource, otherArgs);
		} catch (Exception e3) {
			logger.error("", e3);
			engineContext.free();
			throw new ServletException(e3);
		}

		JsspRequest jsspRequest = new JsspRequest(request, engineContext);

		ScriptObjectMirror params;
		try {
			params = getParams(engineContext, jsspRequest);
		} catch (Exception e3) {
			response.setStatus(500);
			PrintWriter out = response.getWriter();
			out.print("params must be json");
			out.flush();
			
			engineContext.free();
			return;
		} 

		formatter.writeHttpHeader(response, engineContext);
		PrintWriter out = null;
		try {

			initEngineContext(engineContext, jsspRequest, response);

			Object res = run(engineContext, jsspRequest, response, method, params);

			out = response.getWriter();
			out.print(formatter.formatQueryResult(res, null, engineContext));

		} catch (Exception e) {
			try {
				this.completeTask(engineContext.getScriptEngine(), e);
			} catch (Exception e2) {
				logger.error("", e2);
			}

			Object ex = JsEngineUtil.parseJsException(e);
			if (ex instanceof Throwable == false) {
				boolean ignore = false;
				if (ex instanceof ScriptObjectMirror) {
					ScriptObjectMirror mex = (ScriptObjectMirror) ex;
					if (mex.containsKey("name") && "ValidationError".equals(mex.get("name"))) {
						ignore = true;
					}
				} else if (ex instanceof ScriptObject) {
					ScriptObject oex = (ScriptObject) ex;
					if (oex.containsKey("name") && "ValidationError".equals(oex.get("name"))) {
						ignore = true;
					}
				}
				if (!ignore)
					logger.error(engineContext.getJson().tryStringify(ex), e);
			} else {
				logger.error("", (Throwable) ex);
			}

			try {
				if (out == null)
					out = response.getWriter();
				out.print(formatter.formatException(ex, engineContext));
				out.flush();
			} catch (Exception e1) {
				logger.error("", e1);
			}
		} finally {
			if (engineContext != null)
				engineContext.free();

			if (out != null)
				out.flush();
		}
	}

	protected ScriptObjectMirror getParams(JsEngineHandlerContext engineContext, JsspRequest request) throws Exception {
		JsTypeUtil jsTypeUtil = engineContext.getJsTypeUtil();

		String s = request.getParameter("params");
		if (s != null) {
			return (ScriptObjectMirror) engineContext.getJson().parse(s);
		}

		ScriptObjectMirror params = jsTypeUtil.newObject();
		Map<String, String[]> parameterMap = request.getParameterMap();
		for (String p : parameterMap.keySet()) {
			params.put(p, request.get(p));
		}
		return params;
	}

	protected void initEngineContext(JsEngineHandlerContext engineContext, HttpServletRequest request,
			HttpServletResponse response) throws IOException {
		ScriptEngine engine = engineContext.getScriptEngine();
		engine.put("request", request);
		engine.put("response", response);
		engine.put("session", JsServlet.getJsSesson(request.getSession()));
		engine.put("dbjsRunner", this);

		JsspWriter out = new JsspWriter(response, engineContext);
		engine.put("out", out);
	}

	public Object run(JsEngineHandlerContext engineContext, JsspRequest request, HttpServletResponse response, String method,
			ScriptObjectMirror params) throws Exception {
		Object res = engineContext.getEngineAsInvocable().invokeMethod(engineContext.getHandler(), method, params);
		completeTask(engineContext.getScriptEngine(), null);
		return res;
	}

	public void completeTask(ScriptEngine engine, Exception exception) throws Exception {
		Task task = (Task) engine.get("jscurrtask");
		if (task != null) {
			ScriptObjectMirror cb = null;
			if (exception == null) {
				cb = (ScriptObjectMirror) task.end();
			} else {
				cb = (ScriptObjectMirror) task.end(exception, engine);
			}
			if (cb != null && cb.containsKey("callback")) {
				((Invocable) engine).invokeMethod(cb, "callback", cb);
			}
			engine.put("jscurrtask", null);
		}
	}

	public ServerUnitManager getUnitManager() {
		return dbjsManager;
	}

	/**
	 * 为 dbjs 中隔离调用另一个 dbjs 提供支持
	 * @param jsfile
	 * @param request
	 * @param response
	 * @param method
	 * @return 
	 * @return
	 * @throws Exception
	 */
	public JsEngineHandlerContext getEngineContext(String jsfile, JsspRequest request, HttpServletResponse response)
			throws Exception {
		JsEngineHandlerContext engineContext = null;
		try {
			engineContext = dbjsManager.getEngineContext(jsfile, request.getContextPath(), dataSource, otherArgs);

			initEngineContext(engineContext, request, response);

			return engineContext;

		} catch (Exception e3) {
			throw new ServletException(e3);
		}
	}
	
}
