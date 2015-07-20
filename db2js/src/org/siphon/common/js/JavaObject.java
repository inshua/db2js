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




import javax.script.ScriptException;

import sun.org.mozilla.javascript.internal.Context;
import sun.org.mozilla.javascript.internal.IdFunctionObject;
import sun.org.mozilla.javascript.internal.NativeObject;
import sun.org.mozilla.javascript.internal.ScriptRuntime;
import sun.org.mozilla.javascript.internal.Scriptable;

public class JavaObject extends NativeObject {

	private Method[] methods = null;

	private static final int startId = 200200;

	public JavaObject() {
		if (methods == null) {
			int id = startId;
			for (Method method : methods = this.getClass().getMethods()) {
				this.addIdFunctionProperty(this, "JavaObject", id, method.getName(), method.getParameterTypes().length);
				id++;
			}
		}
	}
		

	@Override
	public Object execIdCall(IdFunctionObject fun, Context ctxt, Scriptable scope, Scriptable thisObj, Object[] args) {
		int id = fun.methodId() - startId;
		if (id >= 0 && id < methods.length) {
			Method method = methods[id];
			method.setAccessible(true);
			try {
				Class<?>[] paramTypes = method.getParameterTypes();
				Object[] javaArgs = new Object[paramTypes.length];
				for (int i = 0; i < paramTypes.length; i++) {
					if (i < args.length) {
						javaArgs[i] = Context.jsToJava(args[i], paramTypes[i]);
					} else {
						javaArgs[i] = null;
					}
				}
				return ScriptRuntime.toObjectOrNull(ctxt, method.invoke(this, javaArgs));
			} catch (IllegalAccessException | IllegalArgumentException | InvocationTargetException e) {				
				throw new RuntimeException(e);
			}
		} else {
			return super.execIdCall(fun, ctxt, scope, thisObj, args);
		}
	}
	
	@Override
	public Object getDefaultValue(Class<?> arg0) {
		if(arg0 == String.class){
			return this.toString();
		}
		return super.getDefaultValue(arg0);
	}

}
