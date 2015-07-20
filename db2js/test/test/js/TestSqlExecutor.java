package test.js;

import javax.script.Invocable;
import javax.script.ScriptEngine;
import javax.script.ScriptException;

import org.apache.commons.dbcp.BasicDataSource;
import org.apache.log4j.Logger;
import org.apache.log4j.PropertyConfigurator;
import org.siphon.common.js.JsEngineUtil;

public class TestSqlExecutor {

	private static Logger logger = Logger.getLogger(TestSqlExecutor.class);
	
	public static void main(String[] args) {
		PropertyConfigurator.configure("./log4j.properties");
		
		BasicDataSource bds = new BasicDataSource();
		bds.setDriverClassName("org.postgresql.Driver");

		bds.setUrl("jdbc:postgresql://localhost:5432/booktown");

		bds.setUsername("postgres");
		bds.setPassword("pass4postgres");

		ScriptEngine engine = JsEngineUtil.newEngine();
		engine.put("logger", logger);
		engine.put("dataSource", bds);
		try {
			JsEngineUtil.eval(engine, "web/WEB-INF/jslib/lang.js", true, false);
			JsEngineUtil.eval(engine, "web/WEB-INF/jslib/dbjs.js", true, false);
			JsEngineUtil.eval(engine, "test/test_query.js", true, false);
		} catch (Exception e) {
			logger.error("", e);
		}
		
		Invocable inv = (Invocable) engine;
		try {
			inv.invokeMethod(engine.eval("dbjs"), "test1");
		} catch (NoSuchMethodException | ScriptException e) {
			logger.error("", e);
		}
		
		try {
			inv.invokeMethod(engine.eval("dbjs"), "travelTest");
		} catch (NoSuchMethodException | ScriptException e) {
			logger.error("", e);
		}


	}
}
