/*
---
name: ART.Shapes.Extras
description: "Extra shapes for ART"
authors: ["[Barry van Oudtshoorn](http://barryvan.com.au)"]
provides: [ART.Dot, ART.Square]
requires: [ART.Ellipse, ART.Square]
...
*/

ART.Dot = new Class({
	Extends: ART.Ellipse,
	
	initialize: function(size) {
		this.parent(size, size);
	},
	
	draw: function(size) {
		this.parent(size, size);
	}
});

ART.Square = new Class({
	Extends: ART.Rectangle,
	
	initialize: function(size) {
		this.parent(size, size);
	},
	
	draw: function(size) {
		this.parent(size, size);
	}
});

ART.Triangle = new Class({
	Extends: ART.Shape,
	
	initialize: function(size) { // TODO radius? Non-Equilateral triangles?
		this.parent();
		if (size) this.draw(size);
	},
	
	draw: function(size) {
		var path = new ART.Path();
		
		path.moveTo(0, size);
		path.lineTo(size, size);
		path.lineTo(size / 2, 0);
		path.close();
		
		this.parent(path);
	}
});
