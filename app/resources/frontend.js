;
(function( $, undefined ) {

    $( "label.toggle input" ).click(function() {
		var inputs = $( this ).parent().nextUntil( ".toggle" ).find( "input[type=checkbox]" );
		inputs.attr( "checked", !!$( this ).attr( "checked" ) );
	});
    $( "label.toggleAll input" ).click(function() {
		$( this ).parent().parent().find( "input[type=checkbox]" ).not( this ).attr( "checked", !!$( this ).attr( "checked" ) );
	});

})( jQuery );
