<%@page import="org.apache.tomcat.util.codec.binary.Base64"%>
<%@page import="org.apache.commons.io.IOUtils"%>
<%
	Base64.encodeBase64URLSafeString(binaryData)
%>