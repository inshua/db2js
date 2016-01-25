package test.js;

import java.io.File;
import java.io.IOException;

import org.apache.commons.io.FileUtils;
import org.siphon.db2js.EmbedSqlTranslator;
import org.siphon.jssp.JsspTranslator;

public class TestTranslation {

	public static void main(String[] args) throws IOException, Exception {
//		EmbedSqlTranslator t =  new EmbedSqlTranslator();
//		System.out.println(t.translate(FileUtils.readFileToString(new File("test/translation_test/t3.dbjs"))));
		//System.out.println(t.translate(FileUtils.readFileToString(new File("test/translation_test/login.dbjs"))));
		
		JsspTranslator jsspTranslator = new JsspTranslator(FileUtils.readFileToString(new File("test/translation_test/question_details.jssp")));
		String s = jsspTranslator.translate();
		//System.out.println(s);
		EmbedSqlTranslator t =  new EmbedSqlTranslator();
		System.out.println(t.translate(s));
	}
}
