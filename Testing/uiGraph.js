// Establish namespace if necessary
window.seqta = window.seqta || {};
seqta.ui = seqta.ui || {};

// Utility methods

Array.implement({
	'max': function() {
		var result = this[0];
		for (var i = 1; i < this.length; i++) {
			if (this[i] > result) {
				result = this[i];
			}
		}
		return result;
	}
})

seqta.ui.Graph = new Class({
	Implements: Options,
	
	options: {
		padding: 8,
		width: 400,
		height: 200
	},
	
	art: null,
	
	Binds: [
	
	],
	
	initialize: function(options, parent) {
		this.setOptions(options);
		
		if (parent) {
			var parentSize = parent.getSize();
			this.options.width = parentSize.x + this.options.padding * 2;
			this.options.height = parentSize.y + this.options.padding * 2;
		}
		
		this.art = new ART(this.options.width + this.options.padding * 2, this.options.height + this.options.padding * 2);
		if (parent) {
			parent.grab($(this.art));
		}
	},
	
	toElement: function() {
		return $(this.art);
	},
	
	reset: function() {
		this.clear();
	},
	
	clear: function() {
		//this.art.empty();
		// TODO: Check that this works with VML.
		$(this.art).getChildren().destroy();
	},
	
	draw: function(dataset, colour) {
		// Stub
	}
});

seqta.ui.LineGraph = new Class({
	Extends: seqta.ui.Graph,
	
	options: {
		xAxis: {
			drawAxis: true,
			drawLabels: true,
			drawGridLines: true,
			gridColor: '#ccc',
			axisColor: '#000'
		},
		yAxis: {
			drawAxis: true,
			drawLabels: true,
			drawGridLines: true,
			gridColor: '#ccc',
			axisColor: '#000'
		},
		data: {
			drawPoints: true,
			pointSize: 5
		},
		highlight: {
			color: '#000',
			size: 8
		}
	},
	
	_yPixPerPoint: -1,
	_xPixPerPoint: -1,
	_yGridSize: 10,
	_xGridSize: 10,
	
	_highlight: null,
	
	_datasets: [],
	
	Binds: [
		
	],
	
	initialize: function(options) {
		this.parent(options);
		
		this.art.subscribe('mousemove', this.mousemove, this);
	},
	
	reset: function() {
		this.parent();
		this._datasets = [];
		this._yPixPerPoint = -1;
		this._xPixPerPoint = -1;
	},
	
	draw: function(dataset, colour) {
		this._datasets.push({
			data: dataset,
			color: colour
		});
		if (this._updateSizes(dataset)) {
			this.clear();
			this._renderXGrid();
			this._renderYGrid();
			this._renderXAxis();
			this._renderYAxis();
			for (var i = 0; i < this._datasets.length; i++) {
				var set = this._datasets[i];
				this._renderSet(set.data, set.color);
			}
		} else {
			this._renderSet(dataset, colour);
		}
		if (!this._highlight) {
			this._highlight = new ART.Ellipse(this.options.highlight.size, this.options.highlight.size)
				.stroke(this.options.highlight.color, 2);
		}
	},
	
	mousemove: function(evt) {
		// TODO
		this._highlight.moveTo(evt.clientX - this.options.padding, evt.clientY - this.options.padding).inject(this.art);
	},
	
	_renderXAxis: function() {
		if (!this.options.xAxis.drawAxis) return;
		
		var line = new ART.Path();
		line.moveTo(0, 0).lineTo(this.options.width + this.options.padding / 2, 0);
		var lineShape = new ART.Shape(line, this.options.width + this.options.padding / 2, 1) // TODO: Make line width configurable
			.stroke(this.options.xAxis.axisColor)
			.moveTo(this.options.padding / 2, this.options.height + this.options.padding)
			.inject(this.art);
	},
	
	_renderYAxis: function() {
		if (!this.options.yAxis.drawAxis) return;
		
		var line = new ART.Path();
		line.moveTo(0,0).lineTo(0, this.options.height + this.options.padding / 2);
		var lineShape = new ART.Shape(line, 1, this.options.height + this.options.padding / 2) // TODO: Make line width configurable
			.stroke(this.options.yAxis.axisColor)
			.moveTo(this.options.padding, this.options.padding)
			.inject(this.art);
	},
	
	_renderXGrid: function() {
		if (!this.options.xAxis.drawGridLines) return;
		
		var count = this.options.height / this._xGridSize;
		for (var i = 1; i < count; i++) {
			var line = new ART.Path();
			line.moveTo(0, 0).lineTo(this.options.width, 0);
			var lineShape = new ART.Shape(line, this.options.width, 1) // TODO: Make line width configurable
				.stroke(this.options.xAxis.gridColor)
				.moveTo(this.options.padding, (this.options.height - (i * this._xGridSize)) + this.options.padding)
				.inject(this.art);
		}
	},
	
	_renderYGrid: function() {
		if (!this.options.yAxis.drawGridLines) return;
		
		var count = this.options.width / this._yGridSize;
		for (var i = 1; i < count; i++) {
			var line = new ART.Path();
			line.moveTo(0, 0).lineTo(0, this.options.height);
			var lineShape = new ART.Shape(line, 1, this.options.height) // TODO: make line width configurable
				.stroke(this.options.yAxis.gridColor)
				.moveTo(i * this._yGridSize + this.options.padding, this.options.padding)
				.inject(this.art);
		}
	},
	
	_renderSet: function(dataset, colour) {
		// TODO: Make points an instance of ART.Shape that can be specified when
		// drawing a set. Must take a single parameter: size.
		var pointSize = this.options.data.pointSize;
		var halfPoint = (pointSize / 2);
		
		var line = new ART.Path();
		var points = [];
		for (var i = 0; i < dataset.length; i++) {
			var datum = dataset[i];
			var point = new ART.Ellipse(pointSize, pointSize)
				.fill(colour)
				.moveTo(i * this._xPixPerPoint - halfPoint + this.options.padding, (this.options.height - (datum * this._yPixPerPoint)) - halfPoint + this.options.padding);
			point.subscribe('mouseover', function() {
				// TODO
				console.log('[point]', arguments);
			})
			points.push(point);
			if (!i) {
				line.moveTo(i * this._xPixPerPoint + this.options.padding, (this.options.height - (datum * this._yPixPerPoint)) + this.options.padding);
			} else {
				line.lineTo(i * this._xPixPerPoint + this.options.padding, (this.options.height - (datum * this._yPixPerPoint)) + this.options.padding);
			}
		}
		var lineShape = new ART.Shape(line, this.options.width + this.options.padding * 2, this.options.height + this.options.padding * 2)
			.stroke(colour)
			.inject(this.art);
		for (var i = 0; i < points.length; i++) {
			points[i].inject(this.art);
		}
	},
	
	/* Return true if either changes. */
	_updateSizes: function(dataset) {
		var result = false;
		var max = dataset.max();
		var count = dataset.length - 1;
		
		var newYPix = (this.options.height / max).round(2);
		var newXPix = (this.options.width / count).round(2);
		
		if (this._yPixPerPoint > 0) {
			newYPix = Math.min(newYPix, this._yPixPerPoint);
		}
		if (this._xPixPerPoint > 0) {
			newXPix = Math.min(newXPix, this._xPixPerPoint);
		}
		
		// TODO: these grids seem off.
		var newYSize = (count / this.options.width);
		while (newYSize < 10) { // TODO: Make this configurable?
			newYSize = newYSize * 2;
		}
		var newXSize = (max / this.options.height);
		while (newXSize < 10) { // TODO: Make this configurable?
			newXSize = newXSize * 2;
		}
		
		console.log('[ pix.x] ', this._xPixPerPoint, ' => ', newXPix);
		console.log('[ pix.y] ', this._yPixPerPoint, ' => ', newYPix);
		
		console.log('[size.x] ', this._xGridSize, ' => ', newXSize);
		console.log('[size.y] ', this._yGridSize, ' => ', newYSize);
		
		result = result || (newYPix != this._yPixPerPoint) || (newXPix != this._xPixPerPoint);
		result = result || (newYSize != this._yGridSize) || (newXSize != this._xGridSize);
		
		this._yPixPerPoint = newYPix;
		this._xPixPerPoint = newXPix;
		this._yGridSize = newYSize;
		this._xGridSize = newXSize;
		
		return result;
	}
});













