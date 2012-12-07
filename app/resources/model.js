/*jshint jquery: true, browser: true */
/*global EventEmitter: false, QueryString: false */
/*!
 * jQuery UI helper JavaScript file for DownloadBuilder and ThemeRoller models
 * http://jqueryui.com/download/
 *
 * Copyright 2012 jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 */
(function( exports, $, EventEmitter, QueryString, undefined ) {
	var Model, DownloadBuilderModel, ThemeRollerModel;

	function omit( obj, keys ) {
		var key,
			copy = {};
		for ( key in obj ) {
			if ( $.inArray( key, keys ) === -1 ) {
				copy[ key ] = obj[ key ];
			}
		}
		return copy;
	}


	/**
	 * Model
	 */
	Model = function() {
		this.attributes = {};
		this.emitter = new EventEmitter();
		this.on = $.proxy( this.emitter.on, this.emitter );
	};

	Model.prototype = {
		set: function( attributes ) {
			var self = this,
				changed = false,
				changedAttributes = {};
			$.each( attributes, function( name ) {
				if ( self.attributes[ name ] !== attributes[ name ] ) {
					changedAttributes[ name ] = changed = true;
					self.attributes[ name ] = attributes[ name ];
				}
			});
			if ( changed ) {
				this.emitter.trigger( "change", [ changedAttributes ] );
			}
		},

		get: function( name ) {
			return this.attributes[ name ];
		},

		has: function( name ) {
			return name in this.attributes;
		}
	};


	/**
	 * DownloadBuilder Model
	 */
	DownloadBuilderModel = function( obj ) {
		if ( typeof obj !== "object" ) {
			throw new Error( "parameter required" );
		}
		Model.call( this );
		this.defaults = {};
		this.host = obj.host;
		this.themeRollerModel = new ThemeRollerModel({
			baseVars: obj.baseVars,
			host: this.host
		});
	};

	$.extend( DownloadBuilderModel.prototype, Model.prototype, {
		querystring: function() {
			var attributes = this.attributes,
				defaults = this.defaults,
				relevantAttributes = function() {
					var irrelevantAttributes = [];
					$.each( defaults, function( varName ) {
						if ( attributes[ varName ] === defaults[ varName ] ) {
							irrelevantAttributes.push( varName );
						}
					});
					if ( irrelevantAttributes.length ) {
						return omit( attributes, irrelevantAttributes );
					} else {
						return attributes;
					}
				};
			return QueryString.encode( relevantAttributes() );
		},

		url: function() {
			var querystring = this.querystring();
			return "/download" + ( querystring.length ? "?" + querystring : "" );
		},

		themerollerUrl: function() {
			var themeParams = ( this.has( "themeParams" ) && this.get( "themeParams" ) !== "none" ? QueryString.decode( decodeURIComponent ( this.get( "themeParams" ) ) ) : {} );
			this.themeRollerModel.set(
				$.extend( themeParams, {
					downloadParams: encodeURIComponent( QueryString.encode( omit( this.attributes, [ "themeParams", "folderName" ] ) ) )
				})
			);
			return this.themeRollerModel.url();
		},

		themeUrl: function() {
			return this.host + "/download/theme" + ( this.get( "themeParams" ) !== "none" ? "?" + QueryString.encode( this.attributes ) : "" );
		}
	});


	/**
	 * ThemeRoller Model
	 */
	ThemeRollerModel = function( obj ) {
		if ( typeof obj !== "object" ) {
			throw new Error( "parameter required" );
		}
		Model.call( this );
		this.baseVars = obj.baseVars;
		this.host = obj.host;
	};

	$.extend( ThemeRollerModel.prototype, Model.prototype, {
		querystring: function() {
			var attributes = this.attributes,
				baseVars = this.baseVars,
				relevantModel = function() {
					var i,
						isBaseVars = true;
					// If theme is baseVars, omit it in the querystring.
					for ( i in baseVars ) {
						if ( attributes[ i ] !== baseVars[ i ] ) {
							isBaseVars = false;
							break;
						}
					}
					if ( isBaseVars ) {
						return omit( attributes,
							$.map( baseVars, function( value, varName ) {
								return varName;
							})
						);
					} else {
						return attributes;
					}
				};
			return QueryString.encode( relevantModel() );
		},

		url: function() {
			var querystring = this.querystring();
			return "/themeroller" + ( querystring.length ? "?" + querystring : "" );
		},

		downloadBuilderModel: function( mergeAttributes ) {
			var attributes = $.extend( {}, this.attributes, ( mergeAttributes || {} ) ),
				downloadParams = ( "downloadParams" in attributes ? QueryString.decode( decodeURIComponent ( attributes.downloadParams ) ) : {} ),
				downloadBuilderModel = new DownloadBuilderModel({
					host: this.host
				});
			downloadBuilderModel.set(
				$.extend( downloadParams, {
					themeParams: encodeURIComponent( QueryString.encode( omit( attributes, [ "downloadParams" ] ) ) )
				})
			);
			return downloadBuilderModel;
		},

		downloadUrl: function() {
			return this.downloadBuilderModel().url();
		},

		parsethemeUrl: function() {
			return this.host + "/themeroller/parsetheme.css?" + QueryString.encode( this.attributes );
		}
	});

	exports.Model = {
		DownloadBuilder: DownloadBuilderModel,
		ThemeRoller: ThemeRollerModel
	};

}( this, jQuery, EventEmitter, QueryString ) );
