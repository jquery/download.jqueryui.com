/*jshint jquery: true, browser: true */
/*global EventEmitter: false, LZMA: false, QueryString: false */
/*!
 * jQuery UI helper JavaScript file for DownloadBuilder and ThemeRoller models
 * http://jqueryui.com/download/
 *
 * Copyright 2012 jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 */
(function( exports, $, EventEmitter, LZMA, QueryString, undefined ) {
	var Model, DownloadBuilderModel, ThemeRollerModel, lzmaInterval,
		lzma = new LZMA( "/resources/external/lzma_worker.js" ),
		lzmaLoad = $.Deferred();

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
			intoHex = function( byte ) {
				var hex;

				if ( byte < 0 ) {
						byte = byte + 256;
				}

				hex = byte.toString( 16 );

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
			return this;
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
		this.on( "change", $.proxy( this._change, this ) );
	};

	$.extend( DownloadBuilderModel.prototype, Model.prototype, {
		_change: function( changed ) {
			var i,
				self = this;
			if ( "zComponents" in changed ) {
				delete changed.zComponents;
				unzip( this.get( "zComponents" ), function( unzipped ) {
					delete self.attributes.zComponents;
					self.set.call( self, unzipped );
				});
			}
			if ( "zThemeParams" in changed ) {
				delete changed.zThemeParams;
				unzip( this.get( "zThemeParams" ), function( unzipped ) {
					delete self.attributes.zThemeParams;
					self.set.call( self, {
						themeParams: QueryString.encode( unzipped )
					});
				});
			}
			// "false" -> false, TODO: this should be handled at History() level.
			for ( i in changed ) {
				if ( self.attributes[ i ] === "false" ) {
					self.attributes[ i ] = false;
				}
			}
		},

		querystring: function( callback ) {
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
				},
				shorten = function( attributes, callback ) {
					var shortened = pick( attributes, [ "version" ] ),
						df1 = $.Deferred(),
						df2 = $.Deferred();
					if ( "themeParams" in attributes && attributes.themeParams !== "none" ) {
						zip( QueryString.decode( decodeURIComponent( attributes.themeParams ) ), function( zipped ) {
							shortened.zThemeParams = zipped;
							df1.resolve();
						});
					} else {
						if ( "themeParams" in attributes ) {
							shortened.themeParams = attributes.themeParams;
						}
						df1.resolve();
					}
					if ( !$.isEmptyObject( omit( attributes, [ "themeParams", "version" ] ) ) ) {
						zip( omit( attributes, [ "themeParams", "version" ] ), function( zipped ) {
							shortened.zComponents = zipped;
							df2.resolve();
						});
					} else {
						df2.resolve();
					}
					$.when( df1, df2 ).done(function() {
						callback( attributes, shortened );
					});
				};
			if ( this.querystringDelay ) {
				clearTimeout( this.querystringDelay );
			}
			// This is an expensive computation, so avoiding two consecutive calls
			this.querystringDelay = setTimeout(function() {
				shorten( relevantAttributes(), function( original, shortened ) {
					original = QueryString.encode( original );
					shortened = QueryString.encode( shortened );
					callback( shortened.length < original.length ? shortened : original );
				});
			}, 200 );
		},

		parseHash: function( hash ) {
			this.set( QueryString.decode( hash ) );
		},

		url: function( callback ) {
			this.querystring(function( querystring ) {
				callback( "/download" + ( querystring.length ? "?" + querystring : "" ) );
			});
		},

		themerollerUrl: function( callback ) {
			var themeParams = ( this.has( "themeParams" ) && this.get( "themeParams" ) !== "none" ? QueryString.decode( decodeURIComponent ( this.get( "themeParams" ) ) ) : {} );
			this.themeRollerModel.set(
				$.extend( themeParams, {
					downloadParams: encodeURIComponent( QueryString.encode( omit( this.attributes, [ "themeParams", "folderName" ] ) ) )
				})
			);
			this.themeRollerModel.url( callback );
		},

		themeUrl: function( callback ) {
			var self = this;
			this.themeParams.done(function() {
				callback( self.host + "/download/theme" + ( self.get.call( self, "themeParams" ) !== "none" ? "?" + QueryString.encode( self.attributes ) : "" ) );
			});
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
		this.on( "change", $.proxy( this._change, this ) );
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

		querystring: function( callback ) {
			var attributes = this.attributes,
				baseVars = this.baseVars,
				relevantAttributes = function() {
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
				},
				shorten = function( attributes, callback ) {
					var shortened = pick( attributes, [ "downloadParams" ] ),
						df1 = $.Deferred();
					if ( !$.isEmptyObject( omit( attributes, [ "downloadParams" ] ) ) ) {
						zip( omit( attributes, [ "downloadParams" ] ), function( zipped ) {
							shortened.zThemeParams = zipped;
							df1.resolve();
						});
					} else {
						df1.resolve();
					}
					df1.done(function() {
						callback( attributes, shortened );
					});
				};
			if ( this.querystringDelay ) {
				clearTimeout( this.querystringDelay );
			}
			// This is an expensive computation, so avoiding two consecutive calls
			this.querystringDelay = setTimeout(function() {
				shorten( relevantAttributes(), function( original, shortened ) {
					original = QueryString.encode( original );
					shortened = QueryString.encode( shortened );
					callback( shortened.length < original.length ? shortened : original );
				});
			}, 200 );
		},

		parseHash: function( hash ) {
			this.set( QueryString.decode( hash ) );
		},

		url: function( callback ) {
			this.querystring(function( querystring ) {
				callback( "/themeroller" + ( querystring.length ? "?" + querystring : "" ) );
			});
		},

		downloadUrl: function( callback, options ) {
			var downloadBuilderModel, querystring, themeParams,
				attributes = ( "downloadParams" in this.attributes ? QueryString.decode( decodeURIComponent ( this.attributes.downloadParams ) ) : {} );

			options = options || {};
			themeParams = encodeURIComponent( options.themeParams || QueryString.encode( omit( this.attributes, [ "downloadParams" ] ) ) );

			if ( themeParams.length ) {
				attributes.themeParams = themeParams;
			}

			if ( options.quick ) {
				querystring = QueryString.encode( attributes );
				callback( "/download" + ( querystring.length ? "?" + querystring : "" ) );
			} else {
				downloadBuilderModel = new DownloadBuilderModel({
					host: this.host
				});
				downloadBuilderModel.set( attributes ).url(function( url ) {
					callback( url );
				});
			}
		},

		parsethemeUrl: function() {
			var attributes = omit( this.attributes, [ "downloadParams" ] ),
				downloadParams = ( "downloadParams" in this.attributes ? QueryString.decode( decodeURIComponent ( this.attributes.downloadParams ) ) : {} );
			if ( downloadParams.version ) {
				attributes.version = downloadParams.version;
			}
			return this.host + "/themeroller/parsetheme.css?" + QueryString.encode( attributes );
		},

		rollYourOwnUrl: function() {
			var attributes;
			if ( !$.isEmptyObject( omit( this.attributes, [ "downloadParams" ] ) ) ) {
				attributes = {
					themeParams: encodeURIComponent( QueryString.encode( omit( this.attributes, [ "downloadParams" ] ) ) )
				};
			}
			return this.host + "/themeroller/rollyourown" + ( attributes == null ? "" : "?" + QueryString.encode( attributes ) );
		}
	});

	// Workaround to handle asynchronous worker load lzma-bug.
	lzmaInterval = setInterval(function() {
		if ( ( typeof Worker === "function" && Worker.prototype.postMessage != null ) || window.onmessage != null ) {
			lzmaLoad.resolve();
			clearInterval( lzmaInterval );
		}
	}, 200 );

	exports.Model = {
		DownloadBuilder: DownloadBuilderModel,
		ThemeRoller: ThemeRollerModel
	};

}( this, jQuery, EventEmitter, LZMA, QueryString ) );
