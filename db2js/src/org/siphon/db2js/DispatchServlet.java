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

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.nio.file.WatchEvent;
import java.util.HashMap;
import java.util.Map;

import javax.servlet.RequestDispatcher;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.annotation.MultipartConfig;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import org.apache.commons.lang3.StringUtils;
import org.apache.log4j.Logger;
import org.siphon.common.io.WatchDir;
import org.siphon.db2js.jshttp.JsServlet;
import org.siphon.db2js.jshttp.ServerUnitManager;

/**
 * Servlet implementation class DispatchServlet
 */
// @WebServlet("*.dbjs")
@MultipartConfig
public class DispatchServlet extends JsServlet {
	
	private static final long serialVersionUID = 1210851918238223449L;
	
	private static Logger logger = Logger.getLogger(DispatchServlet.class);

	public DispatchServlet() {
		super();
	}

	@Override
	public void init() throws ServletException {
		super.init();
		String path = this.getServletContext().getRealPath("");
		DbjsRunner dbjsRunner = new DbjsRunner(this.initDataSource(), new DbjsUnitManager(path));
		this.getServletContext().setAttribute("dbjsRunner", dbjsRunner);
		
		Map<String, Object> args = new HashMap<String, Object>();
		args.put("jslib", this.getJsLibs());
		args.put("preloadJs", this.getPreloadJs());
		dbjsRunner.setOtherArgs(args);
	}
	
	public DbjsRunner getDbjsRunner(){
		DbjsRunner dbjsRunner = (DbjsRunner) this.getServletContext().getAttribute("dbjsRunner");
		return dbjsRunner;
	}
	
	@Override
	protected void onFileChanged(WatchEvent<Path> ev, Path file) {
		DbjsRunner dbjsRunner = (DbjsRunner) this.getServletContext().getAttribute("dbjsRunner");
		dbjsRunner.getUnitManager().onFileChanged(ev, file);;
	}
	

	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		request.setCharacterEncoding("utf-8");
		DbjsRunner dbjsRunner = this.getDbjsRunner();
		dbjsRunner.run(request, response, StringUtils.defaultIfEmpty(request.getParameter("_m"), "fetch"));
	}

	@Override
	protected void doDelete(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
		req.setCharacterEncoding("utf-8");
		DbjsRunner dbjsRunner = this.getDbjsRunner();
		dbjsRunner.run(req, resp, "delete");	
	}

	@Override
	protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
		req.setCharacterEncoding("utf-8");
		DbjsRunner dbjsRunner = this.getDbjsRunner();
		dbjsRunner.run(req, resp, "modify");
	}

	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		request.setCharacterEncoding("utf-8");
		DbjsRunner dbjsRunner = this.getDbjsRunner();
		dbjsRunner.run(request, response, StringUtils.defaultIfEmpty(request.getParameter("_m"), "create"));
	}

}
