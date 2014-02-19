function categories( manifest ) {
	manifest = manifest || [];
	return manifest.reduce(function( map, category ) {
		map[ category.slug ] = category;
		map[ category.slug ].posts = category.posts.map(function( post ) {
			return post.name;
		});
		return map;
	}, {} );
}

module.exports = {
	categories: categories
};
