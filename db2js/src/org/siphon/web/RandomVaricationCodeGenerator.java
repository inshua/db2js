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
package org.siphon.web;

import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Random;

import com.sun.image.codec.jpeg.ImageFormatException;
import com.sun.image.codec.jpeg.JPEGCodec;
import com.sun.image.codec.jpeg.JPEGImageEncoder;
import com.sun.swing.internal.plaf.basic.resources.basic;

/**
 * ����Ť�������У����
 * 
 * @author Administrator
 *
 */
public class RandomVaricationCodeGenerator {
	public static class CodeAndImage {
		public String code;
		public byte[] image;

	}

	private Random generator = new Random();
	private static char[] captchars = new char[] { 'a', 'b', 'c', 'd', 'e', '2', '3', '4', '5', '6', '7', '8', 'g', 'f', 'y',
			'n', 'm', 'n', 'p', 'w', 'x', 'h', 'k', 'r', 't', 'u', 'v' };

	/**  
	 * �����������  
	 *  
	 * @return  
	 */
	private Font getFont(int size) {
		Random random = new Random();
		Font font[] = new Font[5];
		font[0] = new Font("Ravie", Font.PLAIN, size);
		font[1] = new Font("Antique Olive Compact", Font.PLAIN, size);
		font[2] = new Font("Forte", Font.PLAIN, size);
		font[3] = new Font("Wide Latin", Font.PLAIN, size);
		font[4] = new Font("Gill Sans Ultra Bold", Font.PLAIN, size);
		return font[random.nextInt(5)];
	}

	/**  
	 * ��������������ɫ  
	 *  
	 * @return  
	 */
	private Color getRandColor() {
		Random random = new Random();
		return new Color(random.nextInt(155) + 100, random.nextInt(205) + 50, random.nextInt(205) + 50);// ��ɫ�ϰ���һ��
	}

	private void shear(Graphics g, int w1, int h1, Color color) {
		shearX(g, w1, h1, color);
		shearY(g, w1, h1, color);
	}

	private void shearX(Graphics g, int w1, int h1, Color color) {

		int period = generator.nextInt(2);

		boolean borderGap = true;
		int frames = 1;
		int phase = generator.nextInt(2);

		for (int i = 0; i < h1; i++) {
			double d = (double) (period >> 1)
					* Math.sin((double) i / (double) period + (6.2831853071795862D * (double) phase) / (double) frames);
			g.copyArea(0, i, w1, 1, (int) d, 0);
			if (borderGap) {
				g.setColor(color);
				g.drawLine((int) d, i, 0, i);
				g.drawLine((int) d + w1, i, w1, i);
			}
		}

	}

	private void shearY(Graphics g, int w1, int h1, Color color) {

		int period = generator.nextInt(40) + 10; // 50;

		boolean borderGap = true;
		int frames = 2;
		int phase = 1;// ��бΪ1/2
		for (int i = 0; i < w1; i++) {
			double d = (double) (period >> 1)
					* Math.sin((double) i / (double) period + (6.2831853071795862D * (double) phase) / (double) frames);
			g.copyArea(i, 0, 1, h1, 0, (int) d);
			if (borderGap) {
				g.setColor(color);
				g.drawLine(i, (int) d, i, 0);
				g.drawLine(i, (int) d + h1, i, h1);
			}
		}
	}

	private void drawThickLine(Graphics g, int x1, int y1, int x2, int y2, int thickness, Color c) {

		// The thick line is in fact a filled polygon
		g.setColor(c);
		int dX = x2 - x1;
		int dY = y2 - y1;
		// line length
		double lineLength = Math.sqrt(dX * dX + dY * dY);

		double scale = (double) (thickness) / (2 * lineLength);

		// The x and y increments from an endpoint needed to create a
		// rectangle
		double ddx = -scale * (double) dY;
		double ddy = scale * (double) dX;
		ddx += (ddx > 0) ? 0.5 : -0.5;
		ddy += (ddy > 0) ? 0.5 : -0.5;
		int dx = (int) ddx;
		int dy = (int) ddy;

		// Now we can compute the corner points
		int xPoints[] = new int[4];
		int yPoints[] = new int[4];

		xPoints[0] = x1 + dx;
		yPoints[0] = y1 + dy;
		xPoints[1] = x1 - dx;
		yPoints[1] = y1 - dy;
		xPoints[2] = x2 - dx;
		yPoints[2] = y2 - dy;
		xPoints[3] = x2 + dx;
		yPoints[3] = y2 + dy;

		g.fillPolygon(xPoints, yPoints, 4);
	}

	public CodeAndImage generate(int ImageWidth, int ImageHeight) throws ImageFormatException, IOException {

		int car = captchars.length - 1;
		/** 
		 * ��������ַ��� 
		 */
		String rand = "";
		for (int i = 0; i < 4; i++) {
			rand += captchars[generator.nextInt(car) + 1];
		}

		/** 
		 * �õ������ 
		 */
		ByteArrayOutputStream bout = new ByteArrayOutputStream();
		JPEGImageEncoder encoder = JPEGCodec.createJPEGEncoder(bout);

		BufferedImage bi = new BufferedImage(ImageWidth + 10, ImageHeight, BufferedImage.TYPE_BYTE_INDEXED);

		Graphics2D graphics = bi.createGraphics();

		/** 
		 * ���ñ���ɫ 
		 */
		graphics.setColor(Color.white);

		graphics.fillRect(0, 0, bi.getWidth(), bi.getHeight());

		// graphics.setColor(Color.black);
		// AttributedString attstr = new AttributedString(rand);

		// TextLayout textTl = new TextLayout(rand, new Font("Courier",
		// Font.BOLD, 70), new FontRenderContext(null,
		// true, false));
		// AffineTransform textAt = graphics.getTransform();
		// graphics.setFont(new Font("Courier", Font.BOLD, 70));
		graphics.setFont(getFont(45));
		graphics.setColor(this.getRandColor());
		graphics.drawString(rand, 10, 55);
		// textTl.draw(graphics, 4, 60);
		int w = bi.getWidth();
		int h = bi.getHeight();
		shear(graphics, w, h, Color.white);
		this.drawThickLine(graphics, 0, generator.nextInt(ImageHeight) + 1, ImageWidth, generator.nextInt(ImageHeight) + 1, 2,
				getRandColor());
		this.drawThickLine(graphics, 0, generator.nextInt(ImageHeight) + 1, ImageWidth, generator.nextInt(ImageHeight) + 1, 2,
				getRandColor());

		// response.setContentType("image/jpg");

		encoder.encode(bi);

		CodeAndImage cnm = new CodeAndImage();
		cnm.code = rand;
		cnm.image = bout.toByteArray();
		return cnm;
	}
}
