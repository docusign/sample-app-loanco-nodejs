$(document).ready(function(){

	console.log('App Init');

	// Form validation
	$('form').validator().on('submit', function(e){
		if (e.isDefaultPrevented()) {
			$(this).validator('validate');
		} else {
			var form = $(this)[0];
			$('form').find('[type="submit"]').toggleClass('active');
		}
	});

	$('[data-toggle="tooltip"]').tooltip()

});