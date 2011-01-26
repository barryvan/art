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
		padding: 20,
		width: 400,
		height: 200,
		font: '10pt Calibri'
	},
	
	art: null,
	
	Binds: [
	
	],
	
	initialize: function(options, parent) {
		this.setOptions(options);
		
		if (parent) {
			var parentSize = parent.getSize();
			this.options.width = parentSize.x;
			this.options.height = parentSize.y;
		}
		
		this.art = new ART(this.options.width, this.options.height);
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
		background: '#fff',
		borderRadius: 8,
		xAxis: {
			labels: [],
			drawAxis: true,
			drawLabels: true,
			drawGridLines: true,
			gridColor: '#ccc',
			axisColor: '#000',
			labelHeight: 20
		},
		yAxis: {
			interval: 10,
			//max: null, // TODO!
			drawAxis: true,
			drawLabels: true,
			drawGridLines: true,
			gridColor: '#ccc',
			axisColor: '#000',
			labelWidth: 40
		},
		data: {
			drawPoints: true,
			pointSize: 8
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
	
	_leftOffset: 0,
	_rightOffset: 0,
	_topOffset: 0,
	_bottomOffset: 0,
	
	_graphWidth: 0,
	_graphHeight: 0,
	
	_datasets: [],
	
	Binds: [
		
	],
	
	initialize: function(options, parent) {
		this.parent(options, parent);
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
			this._drawBackground();
			this._renderXGrid();
			this._renderYGrid();
			this._renderXAxis();
			this._renderYAxis();
			this._drawXLabels();
			this._drawYLabels();
			for (var i = 0; i < this._datasets.length; i++) {
				var set = this._datasets[i];
				this._renderSet(set.data, set.color);
			}
		} else {
			this._renderSet(dataset, colour);
		}
	},
	
	_drawBackground: function() {
		var background = new ART.Rectangle(
			this.options.width,
			this.options.height,
			this.options.borderRadius
		);
		background.fill(this.options.background);
		background.inject(this.art);
	},
	
	_mouseoverPoint: function(point, colour) {
		point.stroke(colour, this.options.data.pointSize / 2);
	},
	
	_mouseoutPoint: function(point) {
		point.stroke('#fff', this.options.data.pointSize / 2);
	},
	
	_renderXAxis: function() {
		if (!this.options.xAxis.drawAxis) return;
		
		var line = new ART.Path();
		line.moveTo(0, 0).lineTo(
			this._graphWidth,
			0
		);
		var lineShape = new ART.Shape(
			line,
			this._graphWidth,
			1 // TODO: Make line width configurable
		).stroke(this.options.xAxis.axisColor)
		 .moveTo(
				this._leftOffset,
				this._graphHeight + this._topOffset
			)
		 .inject(this.art);
	},
	
	_renderYAxis: function() {
		if (!this.options.yAxis.drawAxis) return;
		
		var line = new ART.Path();
		line.moveTo(0,0).lineTo(
			0,
			this._graphHeight
		);
		var lineShape = new ART.Shape(
			line,
			1, // TODO: Make line width configurable
			this._graphHeight
		).stroke(this.options.yAxis.axisColor)
		 .moveTo(
				this._leftOffset,
				this._topOffset
			)
		 .inject(this.art);
	},
	
	_drawXLabels: function() {
		if ((!this.options.xAxis.drawLabels) || (!this.options.xAxis.labels.length)) return;
		
		for (var i = 0; i < this.options.xAxis.labels.length; i++) {
			var datumX = (i + .5) * this._xPixPerPoint + this._leftOffset;
			var label = new ART.Text(this.options.xAxis.labels[i], this.options.font, 'center');
			label.fill('#000');
			label.moveTo(datumX, this.options.height - this._bottomOffset + (this.options.padding / 2));
			label.inject(this.art);
		}
	},
	
	_drawYLabels: function() {
		if (!this.options.yAxis.drawLabels) return;
		
		var count = this._graphHeight / this._xGridSize;
		for (var i = -1; i < count; i++) {
			var datumY = (i + .5) * this._xGridSize + this._topOffset;
			var label = new ART.Text(((count - i - 1) * this.options.yAxis.interval).round(), this.options.font, 'right');
			label.fill('#000');
			label.moveTo(this._leftOffset - (this.options.padding / 2), datumY);
			label.inject(this.art);
		}
	},
	
	// Draw horizontal gridlines
	_renderXGrid: function() {
		if (!this.options.xAxis.drawGridLines) return;
		
		var count = this._graphHeight / this._xGridSize;
		for (var i = 0; i < count; i++) {
			var line = new ART.Path();
			line.moveTo(0, 0).lineTo(this._graphWidth, 0);
			var lineShape = new ART.Shape(line, this._graphWidth, 1) // TODO: Make line width configurable
				.stroke(this.options.xAxis.gridColor)
				.moveTo(this._leftOffset, i * this._xGridSize + this._topOffset)
				.inject(this.art);
		}
	},
	
	// Draw vertical gridlines
	_renderYGrid: function() {
		if (!this.options.yAxis.drawGridLines) return;
		
		var count = this._graphWidth / this._yGridSize + 1;
		for (var i = 1; i < count; i++) {
			var line = new ART.Path();
			line.moveTo(0, 0).lineTo(0, this._graphHeight);
			var lineShape = new ART.Shape(line, 1, this._graphHeight) // TODO: make line width configurable
				.stroke(this.options.yAxis.gridColor)
				.moveTo(i * this._yGridSize + this._leftOffset, this._topOffset)
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
			var datumX = (i + .5) * this._xPixPerPoint + this._leftOffset;
			var datumY = (this._graphHeight - datum * this._yPixPerPoint + this._topOffset);
			
			var point = new ART.Ellipse(pointSize, pointSize)
				.fill(colour)
				.stroke('#fff', pointSize / 2)
				.moveTo(datumX - halfPoint, datumY - halfPoint);
			point.subscribe('mouseover', this._mouseoverPoint.pass([point, colour], this));
			point.subscribe('mouseout', this._mouseoutPoint.pass([point], this));
			points.push(point);
			if (!i) {
				line.moveTo(datumX, datumY);
			} else {
				line.lineTo(datumX, datumY);
			}
		}
		var lineShape = new ART.Shape(line, this.options.width + this.options.padding * 2, this.options.height + this.options.padding * 2)
			.stroke(colour, 2) // TODO configurable
			.inject(this.art);
		for (var i = 0; i < points.length; i++) {
			points[i].inject(this.art);
		}
	},
	
	/* Return true if either changes. */
	_updateSizes: function(dataset) {
		var result = false;
		var max = dataset.max();
		var count = dataset.length;
		
		this._leftOffset = this._rightOffset = this._topOffset = this._bottomOffset = this.options.padding;
		this._leftOffset += (this.options.yAxis.drawLabels) ? this.options.yAxis.labelWidth : 0;
		this._bottomOffset += (this.options.xAxis.drawLabels && this.options.xAxis.labels.length) ? this.options.xAxis.labelHeight : 0;
		
		this._graphWidth = this.options.width - this._leftOffset - this._rightOffset;
		this._graphHeight = this.options.height - this._topOffset - this._bottomOffset;
		
		var newYPix = (this._graphHeight / max);
		var newXPix = (this._graphWidth / count);
		
		if (this._yPixPerPoint > 0) {
			newYPix = Math.min(newYPix, this._yPixPerPoint);
		}
		if (this._xPixPerPoint > 0) {
			newXPix = Math.min(newXPix, this._xPixPerPoint);
		}
		
		var newYSize = newXPix;
		while (newYSize < 10) { // TODO: Make this configurable?
			newYSize = newYSize * 2;
		}
		var newXSize = this.options.yAxis.interval * newYPix;
		
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