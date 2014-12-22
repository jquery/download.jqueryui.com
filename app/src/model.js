/*jshint jquery: true, browser: true */
/*global EventEmitter: false, LZMA: false, QueryString: false */
/*!
 * jQuery UI helper JavaScript file for DownloadBuilder and ThemeRoller models
 * http://jqueryui.com/download/
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 */
(function( exports, $, EventEmitter, LZMA, QueryString, undefined ) {
	var Model, DownloadBuilderModel, ThemeRollerModel, lzmaInterval,
		lzma = new LZMA( $( "[data-lzma-worker]" ).data( "lzma-worker" ) ),
		lzmaLoad = $.Deferred();

	// Encodes an Array of booleans [ true, false, ... ] into a string sequence "10...".
	function booleansEncode( array ) {
		var string = "";
		$.each( array, function( i, val ) {
			string += val ? "1" : "0";
		});
		return string;
	}

	// Decodes the string sequence "10..." back into an Array of booleans [ true, false, ... ].
	function booleansDecode( string ) {
		var array = [];
		$.each( string.split( "" ), function( i, val ) {
			array.push( val === "0" ? false : true );
		});
		return array;
	}

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

	function pick( obj, keys ) {
		var copy = {};
		$.each( keys, function( i, key ) {
			if ( key in obj ) {
				copy[ key ] = obj[ key ];
			}
		});
		return copy;
	}

	function unzip( zipped, callback ) {
		var data,
			intoDec = function( hex ) {
				var dec = parseInt( hex, 16 );
				if ( dec >= 128 ) {
						dec = dec - 256;
				}
				return dec;
			};

		// Split string into an array of hexes
		data = [];
		while( zipped.length ) {
			data.push( zipped.slice( -2 ) );
			zipped = zipped.slice( 0, -2 );
		}
		data = data.reverse();

		lzmaLoad.done(function() {
			lzma.decompress( $.map( data, intoDec ), function( unzipped ) {
				callback( JSON.parse( unzipped ) );
			});
		});
	}

	function zip( obj, callback ) {
		var data = JSON.stringify( obj ),
			intoHex = function( byteFF ) {
				var hex;

				if ( byteFF < 0 ) {
						byteFF = byteFF + 256;
				}

				hex = byteFF.toString( 16 );

				// Add leading zero.
				if ( hex.length === 1 ) {
					hex = "0" + hex;
				}

				return hex;
			};
		lzmaLoad.done(function() {
			lzma.compress( data, 0, function( zipped ) {
				callback( $.map( zipped, intoHex ).join( "" ) );
			});
		});
	}

	function zParam( paramName, attributes, callback ) {
		if ( $.isEmptyObject( attributes ) ) {
			callback( attributes );
		} else {
			zip( attributes, function( zipped ) {
				var shorten,
					original = QueryString.encode( attributes ).length,
					shortenAttributes = {};
				shortenAttributes[ paramName ] = zipped;
				shorten = QueryString.encode( shortenAttributes ).length;
				callback( shorten < original ? shortenAttributes : attributes );
			});
		}
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
				changedAttributes = {},
				createdAttributes = {};
			$.each( attributes, function( name ) {
				if ( self.attributes[ name ] !== attributes[ name ] ) {
					changedAttributes[ name ] = changed = true;
					if ( !(name in self.attributes) ) {
						createdAttributes[ name ] = true;
					}
					self.attributes[ name ] = attributes[ name ];
				}
			});
			if ( changed ) {
				this.emitter.trigger( "change:before", [ changedAttributes, createdAttributes ] );
				this.emitter.trigger( "change", [ changedAttributes, createdAttributes ] );
			}
			return this;
		},

		get: function( name ) {
			return this.attributes[ name ];
		},

		has: function( name ) {
			return name in this.attributes;
		},

		/**
		 * querystring( [options] )
		 * Returns a Deferred with the model querystring when done.
		 * - options.concurrencyDelay; TimeoutID that should be cleared on this request. It's used to avoid concurrency of a certain group of calls/requests.
		 * - options.omit: Array of attributes to omit. Use pick or omit. Default: omit none;
		 * - options.pick: Array of attributes to pick. Use pick or omit. Default: pick all attributes;
		 * - options.shorten: A boolean whether or not to shorten the querystring. Default: true.
		 */
		querystring: function( options ) {
			var self = this,
				attributes = this.attributes,
				dfd = $.Deferred(),
				concurrencyDelay;
			options = options || {};
			if ( options.pick ) {
				attributes = pick( attributes, options.pick );
			} else if ( options.omit ) {
				attributes = omit( attributes, options.omit );
			}
			concurrencyDelay = options.concurrencyDelay || this.querystringDelay;
			if ( "shorten" in options && !options.shorten ) {
				dfd.resolve( QueryString.encode( this._relevantAttributes( attributes ) ) );
			} else {
				if ( concurrencyDelay ) {
					clearTimeout( concurrencyDelay );
				}
				// This is an expensive computation, so avoiding two consecutive calls
				concurrencyDelay = setTimeout(function() {
					self._shorten.call( self, self._relevantAttributes.call( self, attributes ), function( shortened ) {
						dfd.resolve( QueryString.encode( shortened ) );
					});
				}, 200 );
			}
			return dfd;
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
		this.baseVars = obj.baseVars;
		this.host = obj.host;
		this.orderedComponentsDfd = $.Deferred();
		this.themeParamsUnzipping = $.Deferred().resolve();
		this.on( "change:before", $.proxy( this._change, this ) );
	};

	$.extend( DownloadBuilderModel.prototype, Model.prototype, {
		_change: function( changed ) {
			var self = this;
			if ( "components" in changed ) {
				this.orderedComponentsDfd.done(function() {
					var booleansArray, hash;
					delete changed.components;
					booleansArray = booleansDecode( self.get.call( self, "components" ) );
					delete self.attributes.components;
					hash = {};
					$.each( self.orderedComponents, function( i, component ) {
						hash[ component ] = booleansArray[ i ];
					});
					self.set.call( self, hash );
				});
			}
			if ( "zThemeParams" in changed ) {
				this.themeParamsUnzipping = $.Deferred();
				delete changed.zThemeParams;
				unzip( this.get( "zThemeParams" ), function( unzipped ) {
					// Make sure there's no zThemeParams attribute in unzipped object, due to former bug #171 fixed by 1633bad.
					delete unzipped.zThemeParams;

					delete self.attributes.zThemeParams;
					self.set.call( self, {
						themeParams: QueryString.encode( unzipped )
					});
					self.themeParamsUnzipping.resolve();
				});
			}
		},

		_relevantAttributes: function( attributes ) {
			var defaults = this.defaults,
				irrelevantAttributes = [];
			$.each( defaults, function( varName ) {
				if ( attributes[ varName ] === defaults[ varName ] ) {
					irrelevantAttributes.push( varName );
				}
			});

			// Exception rule: if any component is set, make sure version is shown.
			if ( $.inArray( "version", irrelevantAttributes ) !== -1 && !$.isEmptyObject( omit( attributes, [ "folderName", "scope", "themeParams", "version" ] ) ) ) {
				irrelevantAttributes.splice( $.inArray( "version", irrelevantAttributes ), 1 );
			}

			if ( irrelevantAttributes.length ) {
				return omit( attributes, irrelevantAttributes );
			} else {
				return attributes;
			}
		},

		_shorten: function( attributes, callback ) {
			var self = this,
				shortened = pick( attributes, [ "folderName", "scope", "version" ] ),
				df1 = $.Deferred(),
				df2 = $.Deferred();

			// themeParams / zThemeParams
			this.themeParamsUnzipping.done(function() {
				if ( "themeParams" in attributes && attributes.themeParams !== "none" ) {
					zParam( "zThemeParams", QueryString.decode( attributes.themeParams ), function( zThemeParams ) {
						$.extend( shortened, zThemeParams );
						df1.resolve();
					});
				} else {
					if ( "themeParams" in attributes ) {
						shortened.themeParams = attributes.themeParams;
					}
					df1.resolve();
				}
			});

			// components
			if ( !this.orderedComponents && this.get( "components" ) ) {
				// We have unprocessed components, so use it an shortned.
				shortened.components = this.get( "components" );
				df2.resolve();
			} else if ( $.isEmptyObject( omit( attributes, [ "folderName", "scope", "themeParams", "version" ] ) ) ) {
				df2.resolve();
			} else {
				this.orderedComponentsDfd.done(function() {
					var booleansArray = $.map( self.orderedComponents, function( component, i ) {
						// Each component is true by default.
						return !( component in attributes ) ? true : attributes[ component ];
					});
					shortened.components = booleansEncode( booleansArray );
					df2.resolve();
				});
			}

			$.when( df1, df2 ).done(function() {
				callback( shortened );
			});
		},

		setOrderedComponents: function( orderedComponents ) {
			this.orderedComponents = orderedComponents;
			this.orderedComponentsDfd.resolve();
		},

		parseHash: function( hash ) {
			this.set( QueryString.decode( hash ) );
		},

		unsetOrderedComponents: function() {
			delete this.orderedComponents;
			this.orderedComponentsDfd = $.Deferred();
		},

		url: function( callback ) {
			var self = this;
			this.themeParamsUnzipping.done(function() {
				self.querystring.call( self, {
					concurrencyDelay: self._urlQuerystringDelay
				}).done(function( querystring ) {
					callback( "/download/" + ( querystring.length ? "?" + querystring : "" ) );
				});
			});
		},

		themerollerUrl: function( callback ) {
			var self = this, themeParams,
				attributes = this.attributes;

			this.themeParamsUnzipping.done(function() {
				themeParams = ( self.has.call( self, "themeParams" ) && self.get.call( self, "themeParams" ) !== "none" ? QueryString.decode( self.get.call( self, "themeParams" ) ) : {} );

				// 1: Skip folderName, because it will be updated based on theme selection anyway.
				self.querystring.call( self, {
					concurrencyDelay: self._themerollerUrlQuerystringDelay,
					omit: [ "folderName" /* 1 */, "themeParams" ]
				}).done(function( querystring ) {
					var attributes = themeParams,
						themeRollerModel = new ThemeRollerModel({
							baseVars: self.baseVars,
							host: self.host
						});
					if ( querystring.length ) {
						attributes.downloadParams = querystring;
					}
					themeRollerModel.set( attributes );
					themeRollerModel.url( callback );
				});
			});
		},

		themeUrl: function( callback ) {
			var self = this;
			this.themeParamsUnzipping.done(function() {
				self.querystring.call( self, {
					concurrencyDelay: self._themeUrlQuerystringDelay,
					pick: [ "themeParams" ],
					shorten: false
				}).done(function( querystring ) {
					callback( self.host + "/download/theme" + ( querystring.length ? "?" + querystring : "" ) );
				});
			});
		}
	});


	/**
	 * ThemeRoller Model
	 */
	// TODO cache zThemeParams
	ThemeRollerModel = function( obj ) {
		if ( typeof obj !== "object" ) {
			throw new Error( "parameter required" );
		}
		Model.call( this );
		this.baseVars = obj.baseVars;
		this.host = obj.host;
		this.on( "change:before", $.proxy( this._change, this ) );
	};

	$.extend( ThemeRollerModel.prototype, Model.prototype, {
		_change: function( changed ) {
			var self = this;
			if ( "zThemeParams" in changed ) {
				delete changed.zThemeParams;
				unzip( this.get( "zThemeParams" ), function( unzipped ) {
					delete self.attributes.zThemeParams;
					self.set.call( self, unzipped );
				});
			}
		},

		_relevantAttributes: function( attributes ) {
			var i,
				isBaseVars = true;
			// If theme is baseVars, omit it in the querystring.
			for ( i in this.baseVars ) {
				if ( attributes[ i ] !== this.baseVars[ i ] ) {
					isBaseVars = false;
					break;
				}
			}
			if ( isBaseVars ) {
				return omit( attributes,
					$.map( this.baseVars, function( value, varName ) {
						return varName;
					})
				);
			} else {
				return attributes;
			}
		},

		_shorten: function( attributes, callback ) {
			var shortened = pick( attributes, [ "downloadParams" ] ),
				df1 = $.Deferred();
			zParam( "zThemeParams", omit( attributes, [ "downloadParams" ] ), function( zThemeParams ) {
				$.extend( shortened, zThemeParams );
				df1.resolve();
			});
			df1.done(function() {
				callback( shortened );
			});
		},

		parseHash: function( hash ) {
			this.set( QueryString.decode( hash ) );
		},

		url: function( callback ) {
			this.querystring({
				concurrencyDelay: this._urlQuerystringDelay
			}).done(function( querystring ) {
				callback( "/themeroller/" + ( querystring.length ? "?" + querystring : "" ) );
			});
		},

		downloadUrl: function( callback, zThemeParams ) {
			var downloadBuilderModel, querystring, themeParams,
				attributes = "downloadParams" in this.attributes ? QueryString.decode( this.attributes.downloadParams ) : {};

			if ( zThemeParams ) {
				attributes.zThemeParams = zThemeParams;
				querystring = QueryString.encode( attributes );
				callback( "/download/" + ( querystring.length ? "?" + querystring : "" ) );
			} else {
				themeParams = QueryString.encode( omit( this.attributes, [ "downloadParams" ] ) );
				if ( themeParams.length ) {
					attributes.themeParams = themeParams;
				}
				downloadBuilderModel = new DownloadBuilderModel({
					host: this.host
				});
				downloadBuilderModel.set( attributes ).url(function( url ) {
					callback( url );
				});
			}
		},

		parsethemeUrl: function() {
			var attributes = omit( this.attributes, [ "downloadParams", "zThemeParams" ] ),
				downloadParams = ( "downloadParams" in this.attributes ? QueryString.decode( this.attributes.downloadParams ) : {} );
			if ( downloadParams.version ) {
				attributes.version = downloadParams.version;
			}
			return this.host + "/themeroller/parsetheme.css?" + QueryString.encode( attributes );
		},

		rollYourOwnUrl: function() {
			var attributes;
			if ( !$.isEmptyObject( omit( this.attributes, [ "downloadParams" ] ) ) ) {
				attributes = {
					themeParams: QueryString.encode( omit( this.attributes, [ "downloadParams" ] ) )
				};
			}
			return this.host + "/themeroller/rollyourown" + ( attributes == null ? "" : "?" + QueryString.encode( attributes ) );
		}
	});

	// Workaround to handle asynchronous worker load lzma-bug.
	lzmaInterval = setInterval(function() {
		if ( ( ( typeof Worker === "function" || typeof Worker === "object" ) && Worker.prototype.postMessage != null ) || window.onmessage != null ) {
			lzmaLoad.resolve();
			clearInterval( lzmaInterval );
		}
	}, 200 );

	exports.Model = {
		DownloadBuilder: DownloadBuilderModel,
		ThemeRoller: ThemeRollerModel
	};

}( this, jQuery, EventEmitter, LZMA, QueryString ) );
