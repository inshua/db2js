# db2js
db2js - JavaScript前后端数据访问框架   jssp - js 后端网页框架  molecule.js - js 组件化框架

db2js 之旅
=============

初始化环境
--------
0.  安装  [jdk8](http://www.oracle.com/technetwork/java/javase/downloads/jdk8-downloads-2133151.html), [eclipse mars](http://www.eclipse.org/webtools/), 下载 [tomcat7](http://tomcat.apache.org/download-70.cgi)， 从 `git` 中获取本项目[https://github.com/inshua/db2js.git](https://github.com/inshua/db2js.git)。
0.	设置tomcat server.xml中connector 的URIEncoding=”utf-8”。
0.	在 postgres9.4 中建立数据库，名为bookstore, 从 bookstore/bookstore.backup恢复该数据库。
0.	在web/META-INF/context.xml中修改数据库连接。


最简单的查询
-------

在 ` web/bookstrore/` 建立一个名为 `book.dbjs` 的文件，输入：

```javascript
dbjs.fetch = function(params){
	sql{.
		select * from book
	.}
	return this.query(sql, params);
}
```

输入网址 `/db2js/bookstore/book.dbjs?_m=fetch`,即返回：

```javascript
{
"columns":[
	{"name":"id","type":"INT"},{"name":"title","type":"STRING"},{"name":"kind","type":"STRING"},{"name":"publish_date","type":"DATE"},{"name":"isbn","type":"STRING"},{"name":"remarks","type":"STRING"},{"name":"author","type":"INT"},{"name":"author_name","type":"STRING"}
],
"rows":[
	{"id":1,"title":"纯粹理性批判","kind":"p","publish_date":"2015-07-27T16:00:00.000Z","isbn":"1112233","remarks":null,"author":4,"author_name":"康德"},{"id":7,"title":"红楼梦","kind":"f","publish_date":"1977-02-02T16:00:00.000Z","isbn":"2323121","remarks":null,"author":1,"author_name":"曹雪芹"},{"id":2,"title":"判断力批判","kind":"p","publish_date":"1993-09-07T16:00:00.000Z","isbn":"2323231","remarks":null,"author":4,"author_name":"康德"}, ...
]}
```

第一个网页
--------
在 ` web/bookstrore/` 建立一个名为 `book.html` 的文件，输入：

```html
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>书</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">

	<link href="../jslib/bootstrap-3.3.4/css/bootstrap.css" rel="stylesheet" media="screen">
	<script src="../jslib/jquery-1.10.2.js"></script>
	<script src="../jslib/bootstrap-3.3.4/js/bootstrap.min.js"></script>
	
	<script src="../jslib/date.js/Date.js"></script>
	
	<script src="../jslib/db2js/dataset.js"></script>
	<script src="../jslib/db2js/render.js"></script>
	<script src="../jslib/db2js/renderers.js"></script>
	<script src="../jslib/db2js/pipelines.js"></script>
	<script src="../jslib/db2js/collector.js"></script>

</head>
<body>
	
</body>
<script>

	var books = new db2js.DataTable('book', 'book.dbjs', {pageSize : 5 /* 默认 10 */});
	
	books.load({ _m : 'fetch'});
	
</script>
</html>
```
在浏览器输入该网址后，打开开发者工具，在`Console`中输入 `books.monitor()`。即可看到内存中的数据.

渲染
---------
修改 `body` 部分内容如下：

```html
<body>
	<div class="container">
		<div data="#book,rows" renderer="repeater">
			<div data="#book,error" renderer="stderr"></div>
			<h1>Books</h1>
			<hr>
			<div class="row">
			  <div class="col-xs-6 col-md-3" repeater="true" data="this" renderer="expr">
			  	<h3>{{title}}<small>{{author_name}}</small></h3>
			  	<p>{{remarks || '(没有详细说明)'}}</p>
			  	<section class="text-right">{{publish_date.format('yyyy-MM-dd')}}出版</section>
			  	<button class="btn btn-primary">购买</button>
			  </div>
			</div>
		</div>
	</div>
</body>
```

`script` 部分内容如下:

```javascript
<script>
	var books = new db2js.DataTable('book', 'book.dbjs');
	books.load({_m : 'fetch'}, function(){db2js.render();})
</script>
```

刷新网页，即能看到书籍列表。

代码中

```html
<div data="#book,rows" renderer="repeater">
```

`data="#book,rows"` 为数据路径，`#book` 指向登记于 `db2js.dataset` 中  `name` 为 `book` 的 `DataTable`，  `renderer="repeater"` 指定使用 `repeater` 渲染器，该渲染器重复所有子节点中 `repeater="true` 的项目。

```html
<div class="col-xs-6 col-md-3" repeater="true" data="this" renderer="expr">
```

其中 `data="this"` 在 `repeater` 渲染器调用时，绑定为 `row`，`renderer="expr"` 指定使用`表达式渲染器`，该渲染器支持 `{{[js 表达式]}}`，并且在运行时处于

```javascript
with(data){
....
}
```

所以，可以直接使用 `row` 的字段名。

表格渲染
----

修改 `body` 部分如下：

```html
<body>
	<div class="container">
		<h1>书</h1>
		<div data="#book,error" renderer="stderr"></div>
		<table class="table table-striped" data="#book" renderer="table">
			<thead>
				<tr>
					<th data-t="rows,N,title" renderer="std">
						Title
					</th>
					<th data-t="rows,N,kind" renderer="dict({f:'小说', k:'武侠小说', p:'哲学'})|std">
						Kind
					</th>
					<th data-t="rows,N,author_name" renderer="std">
						Author
					</th>
					<th data-t="rows,N,publish_date" format="yyyy-MM-dd" renderer="date|std">
						Publish Date
					</th>					
 				</tr>
			</thead>
			<tfoot>
				<tr>
					<td width="*" align="center">
						<nav>
							<ul class="pagination" data="#book" renderer="pagination">
							</ul>
						</nav>
					</td>
				</tr>
			</tfoot>
		</table>
		
	</div>
</body>
```

`script` 部分内容如下:

```javascript
<script>
	var books = new db2js.DataTable('book', 'book.dbjs', {pageSize : 5 /* 默认 10 */});
	books.load({_m : 'fetch'}, function(){db2js.render();})
</script>
```

后台页面增加`分页`和`书名检索`支持:

```javascript
dbjs.fetch = function(params){
	sql{.
		select b.*, a.name author_name from book b, author a where b.author = a.id
		code{. 
			if(params.title){ 
				sql{. and strpos(b.title, :title) > 0  .}
			}
		.}
	.}
	sql = this.orderBy(sql, params._sorts, {'b.title' : 'asc'});
	return this.query(sql, params, params._page);
}
```

页面完成后，刷新 `books.html`，即已出现一个可以分页的表格。

其中 `data="#book"` 为数据路径，指向登记于 `db2js.dataset` 中  `name` 为 `book` 的 `DataTable`， `renderer="table"` 指定使用 table 渲染器。

当调用 `db2js.render()` 时，发生渲染。

收集
------

在 table 前增加一个搜索框，用于查询`标题`.

```html
<body>
	<div class="container">
		<h1>书</h1>
		<div data="#book,error" renderer="stderr"></div>		
		<!-- 从这里开始 -->		
		<div class="text-right">
			<form class="form-inline">
			  <div class="form-group">
			    <label>Title</label>
			    <input type="text" class="form-control" placeholder="" data="#book,search,params,title" collector="c|s">
			  </div>
			  <button type="button" class="btn btn-default" onclick="search($(this).parent('form'))">Search</button>
			</form>
		</div>
		<table class="table table-striped" data="#book" renderer="table">
	...
```

修改脚本部分，增加 search 函数，并将 load 之后的渲染改为事件模式：

```javascript
<script>

	var books = new db2js.DataTable('book', 'book.dbjs', {pageSize : 5 /* 默认 10 */});
	books.on('load', function(){db2js.render();});
	
	books.load({ _m : 'fetch'});
	
	function search(form){
		db2js.collect(form[0]);
		books.load();
	}

	
</script>
```

刷新页面，即可看到已经支持搜索功能。

其中 `data="#book,search,params,title"` 为数据路径， `collector="c|s"` 为收集器，管道 `c` 用于从 `input` 元素收集 `value`，后面的 `s` 用于设置值到数据路径指向的js对象。


PDF入门
-------
[PDF入门](db2js/man/DB2JS STEP BY STEP.pdf)


继续深入...
-------

使用 eclipse 打开
