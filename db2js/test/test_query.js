dbjs.test1 = function() {
	println('自动推断类型:')
	// 自动推断类型
	var sql = 'select * from authors where id>?';
	var r = this.query(sql, [2]);
	println(JSON.stringify(r));
	
	println('指定类型:')
	// 指定类型
	sql = 'select * from authors where id>?';
	var r = this.query(sql, [{INT : 1}]);
	println(JSON.stringify(r));
	
	println('SQL嵌入表达式:')
	// SQL 嵌入表达式
	function evalIt(s){return eval(s);}
	
	var sqlexpr = 'select * from authors where id > {$INT(2)} and last_name like {s}';
	
	var r = this.query(sqlexpr, evalIt);
	println(JSON.stringify(r));
}

dbjs.paging = function() {
	// 自动推断类型
	var sql = 'select * from tree order by id';
	var r = this.query(sql, [], {start : 2, limit : 4});
	println(JSON.stringify(r));	
}

dbjs.escape = function() {
	var sql = 'insert into sys_function(id,name,parent_id,menu_index,status,developer,code,uri,open_mode)  select ?,?,?,?,?,?,?,?,? from dual where not exists(select 1 from sys_function where id= ?)';
	this.execute(sql, [4, "系统功能设置", 0, 1, "N", null, "sys_function", "s", "t", 4])
}

dbjs.login = function(){
	var sql = 'select sys_user.*, node.name node_name, node.type node_type from sys_user,node where sys_user.node = node.id and username=? and password=?';
	this.query(sql, [null, null]);
}

dbjs.travelTest = function(){
	println('遍历:')
	var sql = 'select * from authors';
	this.travel(sql, [], function(row, columns){
		println('GOT ROW: ' + JSON.stringify(row));
		// return true;
	});
}


